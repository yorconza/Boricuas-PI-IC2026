/**
 * ============================================================================
 * Controlador: perfilController.ts
 * ============================================================================
 * obtenerPerfil       → GET  /api/perfil                  (protegido)
 * actualizarPerfil    → PUT  /api/perfil                  (protegido)
 * cambiarContrasena   → PUT  /api/perfil/cambiar-contrasena (protegido)
 * uploadAvatar        → POST /api/perfil/upload-avatar    (protegido)
 *
 * SPs que utiliza (ya creados en la BD):
 *   sp_ObtenerPerfil        → devuelve id_usuario, nombre_completo, correo,
 *                             correo_contacto, telefono, foto_perfil, nombre_rol
 *   sp_ActualizarPerfil     → actualiza los campos correspondientes respetando
 *                             las restricciones UNIQUE
 *   sp_CambiarContrasena    → recibe @id_usuario_actual y @nueva_contrasena_hash
 *
 * Lógica de roles (campo de correo):
 *   - Inquilino            → solo puede editar `correo`
 *   - Administrador/Guarda → solo puede editar `correo_contacto` (destino del
 *                             código 2FA); su `correo` de acceso no se toca.
 *
 * Fotos de perfil:
 *   - Doble entrada: URL pública (http/https) o archivo (multipart/form-data).
 *   - El archivo se guarda en uploads/avatars/avatar-{id_usuario}-{timestamp}.{ext}
 *     y se devuelve la ruta relativa (/uploads/avatars/...). Esa ruta se guarda
 *     en foto_perfil y se sirve como estático por express.static('/uploads').
 *   - Al reemplazar la foto se elimina el archivo anterior (solo si es local).
 * ============================================================================
 */
import { type NextFunction, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import sql from 'mssql';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { getConnection } from '../config/confDB.js';

// __dirname en ESM (el backend usa "type": "module")
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carpeta donde se guardan los avatares subidos.
// NOTA (fix): __dirname es src/controllers, por lo que se necesitan DOS niveles
// hacia arriba para llegar a la raíz del backend. server.ts sirve como estático
// path.join(__dirname, 'uploads') → backend/uploads, así que los avatares deben
// guardarse en backend/uploads/avatars para que la URL /uploads/avatars/...
// resuelva (antes se guardaban en backend/src/uploads/avatars → 404 → imagen rota).
const AVATAR_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Asegura que la carpeta exista (se crea al arrancar el servidor)
fs.mkdirSync(AVATAR_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Configuración de multer (diskStorage)
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, AVATAR_DIR);
    },
    filename: (req, file, cb) => {
        // req.user ya fue inyectado por authenticateToken (se ejecuta antes de multer)
        const idUsuario = req.user?.id_usuario ?? 'u';
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const filename = `avatar-${idUsuario}-${Date.now()}${ext}`;
        cb(null, filename);
    }
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    if (MIME_PERMITIDOS.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo imágenes (JPG, PNG, GIF, WEBP).'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_AVATAR_BYTES }
});

/**
 * Middleware que ejecuta multer y convierte sus errores en respuestas JSON
 * amigables (ej: archivo demasiado grande o tipo no permitido).
 */
export const multerAvatar = (req: Request, res: Response, next: NextFunction) => {
    upload.single('foto')(req, res, (error: unknown) => {
        if (error) {
            if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'La imagen supera el tamaño máximo de 2 MB' });
            }
            const mensaje = error instanceof Error ? error.message : 'Error al subir la imagen';
            return res.status(400).json({ message: mensaje });
        }
        next();
    });
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Valida los "magic bytes" del archivo para confirmar que es una imagen REAL
 * (JPEG, PNG, GIF o WEBP) y no solo un archivo con extensión cambiada.
 */
const esImagenReal = (ruta: string): boolean => {
    try {
        const fd = fs.openSync(ruta, 'r');
        const buffer = Buffer.alloc(12);
        fs.readSync(fd, buffer, 0, 12, 0);
        fs.closeSync(fd);

        // JPEG: FF D8 FF
        if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
        // GIF: 'GIF8' (GIF87a / GIF89a)
        if (buffer.toString('ascii', 0, 4) === 'GIF8') return true;
        // WEBP: 'RIFF' + bytes 8-11 'WEBP'
        if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return true;

        return false;
    } catch {
        return false;
    }
};

/**
 * Elimina (best-effort) un avatar local del disco. Solo borra archivos dentro
 * de uploads/avatars/ y usando solo el basename (evita path traversal).
 * Las URLs externas (http/https) no se tocan.
 */
const eliminarAvatarAnterior = (rutaRelativa: string | null | undefined): void => {
    if (!rutaRelativa || !rutaRelativa.startsWith('/uploads/avatars/')) return;
    const nombre = path.basename(rutaRelativa);
    const rutaAbsoluta = path.join(AVATAR_DIR, nombre);
    fs.unlink(rutaAbsoluta, () => { /* best-effort: si no existe, se ignora */ });
};

/** Detecta errores de SQL Server por clave duplicada (2601/2627). */
const esErrorClaveDuplicada = (error: unknown): boolean => {
    const e = error as { number?: number };
    return e.number === 2601 || e.number === 2627;
};

/** Normaliza el hash (VARCHAR o VARBINARY/Buffer) a string. */
const normalizarHash = (hash: string | Buffer): string =>
    typeof hash === 'string' ? hash : Buffer.from(hash).toString('utf-8');

/** Valida que una URL externa sea http:// o https:// */
const esUrlExternaValida = (url: string): boolean => /^https?:\/\//i.test(url);

/**
 * Valida un formato de email básico: usuario@dominio.ext.
 * Se usa tanto para `correo` (Inquilino) como para `correo_contacto`
 * (Administrador/Guarda). No reemplaza el UNIQUE de la BD, solo el formato.
 */
const esEmailValido = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ---------------------------------------------------------------------------
// GET /api/perfil
// ---------------------------------------------------------------------------
export const obtenerPerfil = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'No autenticado' });

        const pool = req.pool ?? await getConnection();
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, user.id_usuario)
            .execute('sp_ObtenerPerfil');

        const perfil = result.recordset?.[0];
        if (!perfil) {
            return res.status(404).json({ message: 'Perfil no encontrado' });
        }

        return res.status(200).json({
            id_usuario: perfil.id_usuario,
            nombre_completo: perfil.nombre_completo,
            correo: perfil.correo,
            correo_contacto: perfil.correo_contacto ?? null,
            telefono: perfil.telefono ?? null,
            foto_perfil: perfil.foto_perfil ?? null,
            nombre_rol: perfil.nombre_rol,
        });
    } catch (error: unknown) {
        console.error('Error al obtener el perfil:', error);
        return res.status(500).json({ message: 'Error al obtener el perfil' });
    }
};

// ---------------------------------------------------------------------------
// PUT /api/perfil
// ---------------------------------------------------------------------------
export const actualizarPerfil = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'No autenticado' });

        const { nombre_completo, telefono, foto_perfil, correo, correo_contacto } = req.body ?? {};

        // 1. Validaciones básicas
        if (!nombre_completo || !String(nombre_completo).trim()) {
            return res.status(400).json({ message: 'El nombre es obligatorio' });
        }

        // 2. URL externa válida si se envía foto
        if (foto_perfil && !esUrlExternaValida(String(foto_perfil)) && !String(foto_perfil).startsWith('/uploads/avatars/')) {
            return res.status(400).json({ message: 'La foto de perfil debe ser una URL válida (http:// o https://) o una imagen subida' });
        }

        const pool = req.pool ?? await getConnection();

        // 3. Leer el perfil actual para preservar el campo de correo que NO le
        //    corresponde al rol (y para borrar el avatar anterior si cambió).
        const perfilActual = await pool.request()
            .input('id_usuario_actual', sql.Int, user.id_usuario)
            .execute('sp_ObtenerPerfil');
        const actual = perfilActual.recordset?.[0] as {
            correo?: string;
            correo_contacto?: string | null;
            foto_perfil?: string | null;
        } | undefined;

        const esInquilino = user.nombre_rol === 'Inquilino';

        // 4. Regla de roles: qué campo de correo puede modificar el usuario.
        //    Se rechaza explícitamente un intento de modificar el campo ajeno.
        let correoFinal: string | null;
        let correoContactoFinal: string | null;

        if (esInquilino) {
            if (correo_contacto && String(correo_contacto).trim() !== (actual?.correo_contacto ?? '')) {
                return res.status(403).json({ message: 'Los inquilinos no pueden modificar el correo de contacto' });
            }
            // El correo es la credencial de acceso del inquilino: nunca puede quedar vacío
            // (evita que un guardado accidental deje el correo en NULL y rompa el login)
            // y debe tener un formato válido.
            const nuevoCorreo = String(correo ?? actual?.correo ?? '').trim();
            if (!nuevoCorreo) {
                return res.status(400).json({ message: 'El correo es obligatorio' });
            }
            if (!esEmailValido(nuevoCorreo)) {
                return res.status(400).json({ message: 'El correo no tiene un formato válido' });
            }
            // IMPORTANTE: register y login normalizan el correo a minúsculas
            // (String(correo).toLowerCase()). Se hace lo mismo aquí para que un
            // correo guardado con mayúsculas no rompa el inicio de sesión.
            correoFinal = nuevoCorreo.toLowerCase();
            correoContactoFinal = actual?.correo_contacto ?? null; // se preserva tal cual
        } else {
            if (correo && String(correo).trim() !== (actual?.correo ?? '')) {
                return res.status(403).json({ message: 'El correo de acceso no puede modificarse desde el perfil' });
            }
            correoFinal = actual?.correo ?? null; // se preserva (no se toca)
            // correo_contacto es opcional (puede quedar null) pero, si se envía
            // con valor, debe tener un formato válido.
            const nuevoCorreoContacto = String(correo_contacto ?? actual?.correo_contacto ?? '').trim() || null;
            if (nuevoCorreoContacto && !esEmailValido(nuevoCorreoContacto)) {
                return res.status(400).json({ message: 'El correo de contacto no tiene un formato válido' });
            }
            // Misma normalización a minúsculas que register/login (el 2FA envía
            // el código a este correo, y el destino se compara en minúsculas).
            correoContactoFinal = nuevoCorreoContacto ? nuevoCorreoContacto.toLowerCase() : null;
        }

        // 5. Si la foto cambió y la anterior era un archivo local, se elimina.
        const fotoAnterior = actual?.foto_perfil ?? null;
        const fotoNueva = foto_perfil ? String(foto_perfil) : null;
        if (fotoAnterior && fotoNueva && fotoAnterior !== fotoNueva) {
            eliminarAvatarAnterior(fotoAnterior);
        }

        // 6. Actualizar con sp_ActualizarPerfil
        await pool.request()
            .input('id_usuario_actual', sql.Int, user.id_usuario)
            .input('nombre_completo', sql.VarChar(150), String(nombre_completo).trim())
            .input('telefono', sql.VarChar(20), telefono ? String(telefono).trim() : null)
            .input('foto_perfil', sql.VarChar(255), fotoNueva)
            .input('correo', sql.VarChar(150), correoFinal)
            .input('correo_contacto', sql.VarChar(150), correoContactoFinal)
            .execute('sp_ActualizarPerfil');

        return res.status(200).json({ message: 'Perfil actualizado correctamente' });
    } catch (error: unknown) {
        console.error('Error al actualizar el perfil:', error);
        if (esErrorClaveDuplicada(error)) {
            return res.status(400).json({ message: 'El correo ya está en uso por otro usuario' });
        }
        return res.status(500).json({ message: 'Error al actualizar el perfil' });
    }
};

// ---------------------------------------------------------------------------
// PUT /api/perfil/cambiar-contrasena
// ---------------------------------------------------------------------------
export const cambiarContrasena = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'No autenticado' });

        const { contrasenaActual, nuevaContrasena } = req.body ?? {};

        if (!contrasenaActual || !nuevaContrasena) {
            return res.status(400).json({ message: 'La contraseña actual y la nueva son obligatorias' });
        }
        if (String(nuevaContrasena).length < 6) {
            return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
        }

        const pool = req.pool ?? await getConnection();

        // 1. Obtener el hash almacenado para verificar la contraseña actual
        const resultado = await pool.request()
            .input('id_usuario', sql.Int, user.id_usuario)
            .query('SELECT contrasena_hash FROM Usuario WHERE id_usuario = @id_usuario');

        const fila = resultado.recordset?.[0] as { contrasena_hash?: string | Buffer } | undefined;
        if (!fila?.contrasena_hash) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // 2. Verificar la contraseña actual con bcrypt
        const hashAlmacenado = normalizarHash(fila.contrasena_hash);
        const esCorrecta = await bcrypt.compare(String(contrasenaActual), hashAlmacenado);
        if (!esCorrecta) {
            return res.status(400).json({ message: 'La contraseña actual no es correcta' });
        }

        // 3. Hashear la nueva y guardarla con sp_CambiarContrasena
        const nuevoHash = await bcrypt.hash(String(nuevaContrasena), 10);

        await pool.request()
            .input('id_usuario_actual', sql.Int, user.id_usuario)
            .input('nueva_contrasena_hash', sql.VarChar(256), nuevoHash)
            .execute('sp_CambiarContrasena');

        return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
    } catch (error: unknown) {
        console.error('Error al cambiar la contraseña:', error);
        return res.status(500).json({ message: 'Error al cambiar la contraseña' });
    }
};

// ---------------------------------------------------------------------------
// POST /api/perfil/upload-avatar
// ---------------------------------------------------------------------------
export const uploadAvatar = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'No autenticado' });

        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No se recibió ningún archivo' });
        }

        // 1. Validar que sea una imagen REAL (magic bytes), no solo por extensión
        if (!esImagenReal(file.path)) {
            fs.unlink(file.path, () => { /* limpieza */ });
            return res.status(400).json({ message: 'El archivo no es una imagen válida' });
        }

        // 2. Ruta relativa que se guarda en foto_perfil y se sirve por /uploads
        const rutaRelativa = `/uploads/avatars/${file.filename}`;

        return res.status(200).json({
            message: 'Imagen subida correctamente',
            foto_perfil: rutaRelativa,
        });
    } catch (error: unknown) {
        console.error('Error al subir el avatar:', error);
        return res.status(500).json({ message: 'Error al subir la imagen' });
    }
};
