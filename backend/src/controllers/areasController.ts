/**
 * ============================================================================
 * Controller: areasController.ts
 * ============================================================================
 *
 * Endpoints del módulo de Áreas Comunes (GET/POST/PUT/PATCH en /api/areas).
 * Consume los SPs de CondominioDB (todos validan rol Administrador):
 *
 *   getAreas          → sp_ListarAreasComunes
 *   createArea        → sp_CrearAreaComun
 *   updateArea        → sp_ActualizarAreaComun
 *   activateArea      → sp_ActivarAreaComun
 *   deactivateArea    → sp_DesactivarAreaComun
 *
 * Seguridad:
 *   - Las rutas pasan por authenticateToken + require2FA +
 *     validateSessionAndSetContext + authorizeRole('Administrador').
 *     El id_usuario_actual SIEMPRE se toma del token (req.user.id_usuario),
 *     NUNCA del cliente.
 *   - Si un SP lanza RAISERROR por permisos, se traduce a HTTP 403.
 *
 * Imágenes (MISMA lógica que las fotos de perfil en perfilController.ts):
 *   - El archivo lo guarda multer en uploads/areas/ (definido en areaRoute.ts).
 *   - Aquí se valida que sea una imagen REAL por "magic bytes" (no solo por
 *     extensión); si no lo es, se elimina y se responde 400.
 *   - Se almacena en foto_principal la RUTA RELATIVA (/uploads/areas/...),
 *     que express.static sirve desde server.ts. Nada de URLs hardcodeadas
 *     con localhost.
 *   - Al reemplazar (o eliminar) la foto se borra el archivo anterior del
 *     disco (solo si es local, con basename para evitar path traversal).
 *   - foto_principal también acepta URLs externas http(s) (imagen pegada).
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname en ESM (el backend usa "type": "module")
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carpeta física de las imágenes de áreas comunes (backend/uploads/areas).
// Debe coincidir con la definida en areaRoute.ts (misma resolución por __dirname).
const AREAS_IMG_DIR = path.join(__dirname, '..', '..', 'uploads', 'areas');

// Ruta pública relativa que se guarda en foto_principal y que express.static sirve.
const CARPETA_IMAGENES = '/uploads/areas/';

/**
 * Convierte horas como "08:00" a "08:00:00".
 */
const formatTime = (time: string | undefined | null): string | null => {
    if (!time) return null;
    if (time.length === 5) {
        return `${time}:00`;
    }
    return time;
};

/** Ventana de mantenimiento de un área (hora inicio/fin + descripción opcional). */
interface VentanaMantenimiento {
    hora_inicio: string;
    hora_fin: string;
    descripcion?: string | null;
}

/**
 * Parsea el campo `mantenimiento` del body: llega como JSON string (FormData
 * del formulario de áreas) o como arreglo (request JSON). Valida cada ventana:
 * horas obligatorias, fin > inicio y dentro del horario del área.
 */
const parseMantenimiento = (valor: unknown, horaApertura?: string | null, horaCierre?: string | null): VentanaMantenimiento[] => {
    if (valor === undefined || valor === null || valor === '') return [];

    let lista: unknown[];
    if (typeof valor === 'string') {
        try {
            lista = JSON.parse(valor);
        } catch {
            throw new Error('mantenimiento inválido: debe ser un arreglo JSON.');
        }
    } else if (Array.isArray(valor)) {
        lista = valor;
    } else {
        throw new Error('mantenimiento inválido: debe ser un arreglo JSON.');
    }

    return lista.map((entrada, i) => {
        const item = (entrada ?? {}) as Record<string, unknown>;
        const inicio = formatTime(typeof item.hora_inicio === 'string' ? item.hora_inicio : '');
        const fin = formatTime(typeof item.hora_fin === 'string' ? item.hora_fin : '');
        const numVentana = i + 1;

        if (!inicio || !fin) {
            throw new Error(`Ventana de mantenimiento ${numVentana}: la hora de inicio y la hora fin son obligatorias.`);
        }
        if (fin <= inicio) {
            throw new Error(`Ventana de mantenimiento ${numVentana}: la hora fin debe ser posterior a la hora de inicio.`);
        }
        if (horaApertura && horaCierre) {
            const aperturaNorm = formatTime(horaApertura);
            const cierreNorm = formatTime(horaCierre);
            if (aperturaNorm && cierreNorm && (inicio < aperturaNorm || fin > cierreNorm)) {
                throw new Error(`Ventana de mantenimiento ${numVentana}: debe estar dentro del horario del área (${horaApertura} - ${horaCierre}).`);
            }
        }

        return {
            hora_inicio: inicio,
            hora_fin: fin,
            descripcion: typeof item.descripcion === 'string' && item.descripcion.trim() ? item.descripcion.trim() : null
        };
    });
};

/** Inserta las ventanas de mantenimiento de un área dentro de la transacción. */
const insertarMantenimiento = async (transaction: sql.Transaction, idArea: number, ventanas: VentanaMantenimiento[]): Promise<void> => {
    for (const v of ventanas) {
        await new sql.Request(transaction)
            .input('id_area', sql.Int, idArea)
            .input('hora_inicio', sql.VarChar(8), v.hora_inicio)
            .input('hora_fin', sql.VarChar(8), v.hora_fin)
            .input('descripcion', sql.VarChar(100), v.descripcion ?? null)
            .query('INSERT INTO AreaMantenimiento (id_area, hora_inicio, hora_fin, descripcion) VALUES (@id_area, @hora_inicio, @hora_fin, @descripcion)');
    }
};

/**
 * Valida los "magic bytes" del archivo para confirmar que es una imagen REAL
 * (JPEG, PNG, GIF o WEBP) y no solo un archivo con extensión cambiada.
 * (Misma lógica que perfilController.esImagenReal.)
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
 * Elimina (best-effort) una imagen local de área del disco. Solo borra archivos
 * dentro de uploads/areas/ y usando solo el basename (evita path traversal).
 * Las URLs externas (http/https) no se tocan.
 */
const eliminarImagenAnterior = (rutaRelativa: string | null | undefined): void => {
    if (!rutaRelativa || !rutaRelativa.startsWith(CARPETA_IMAGENES)) return;
    const nombre = path.basename(rutaRelativa);
    const rutaAbsoluta = path.join(AREAS_IMG_DIR, nombre);
    fs.unlink(rutaAbsoluta, () => { /* best-effort: si no existe, se ignora */ });
};

/** Valida que una URL externa sea http:// o https:// */
const esUrlExternaValida = (url: string): boolean => /^https?:\/\//i.test(url);

/**
 * Detecta errores de permisos lanzados por los SPs (RAISERROR) para traducirlos
 * a HTTP 403. Se exige procName para evitar falsos positivos de otros errores.
 */
const esErrorDePermisos = (error: unknown): boolean => {
    const esDeSP = typeof (error as { procName?: unknown }).procName === 'string';
    if (!esDeSP) return false;
    const mensaje = error instanceof Error ? error.message : String(error);
    return /permisos|no autorizad|acceso denegado|forbidden|no tiene.*permiso|solo (el |un |los )?(admin|administrador)/i.test(mensaje);
};

/** Extrae el id del usuario autenticado desde el JWT (req.user). */
const obtenerIdActual = (req: Request, res: Response): number | null => {
    const idActual = req.user?.id_usuario;
    if (!idActual) {
        res.status(401).json({ message: 'No autenticado' });
        return null;
    }
    return idActual;
};

/** Mensaje legible de un error. */
const mensajeDe = (error: unknown): string =>
    error instanceof Error ? error.message : 'Error interno del servidor';

/**
 * 1. Listar Áreas Comunes (GET) - GET /api/areas
 */
export const getAreas = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const pool = req.pool ?? await getConnection();
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .execute('sp_ListarAreasComunes');

        const areas = result.recordset ?? [];

        // Adjuntar las ventanas de mantenimiento a cada área (tabla
        // AreaMantenimiento). Si la tabla aún no existe en la BD (script 01
        // pendiente), se devuelven las áreas sin ventanas para no romper el listado.
        let ventanasPorArea: Record<number, VentanaMantenimiento[]> = {};
        try {
            const mantResult = await pool.request()
                .query('SELECT id_area, hora_inicio, hora_fin, descripcion FROM AreaMantenimiento');
            ventanasPorArea = (mantResult.recordset ?? []).reduce((acc, fila) => {
                const idArea = Number(fila.id_area);
                (acc[idArea] = acc[idArea] ?? []).push({
                    hora_inicio: fila.hora_inicio as string,
                    hora_fin: fila.hora_fin as string,
                    descripcion: (fila.descripcion as string | null) ?? null
                });
                return acc;
            }, {} as Record<number, VentanaMantenimiento[]>);
        } catch {
            // Tabla AreaMantenimiento no existe todavía: áreas sin ventanas.
        }

        return res.status(200).json(areas.map(a => ({
            ...a,
            mantenimiento: ventanasPorArea[Number(a.id_area)] ?? []
        })));
    } catch (error: unknown) {
        console.error('Error en getAreas:', error);
        if (esErrorDePermisos(error)) {
            return res.status(403).json({ message: mensajeDe(error) });
        }
        return res.status(500).json({ message: mensajeDe(error) });
    }
};

/**
 * 2. Crear Área Común (POST) - POST /api/areas
 * Acepta multipart/form-data con el archivo en el campo 'imagen', o JSON con
 * foto_principal (URL externa o ruta /uploads/areas/...).
 */
export const createArea = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const {
            nombre,
            capacidad_max,
            descripcion = null,
            costo_por_hora,
            hora_apertura,
            hora_cierre,
            max_reservas_semana = 10,
            foto_principal,
            foto_url
        } = req.body;

        // Validaciones básicas de entrada
        if (!nombre || capacidad_max === undefined || costo_por_hora === undefined) {
            return res.status(400).json({
                message: 'Campos requeridos faltantes: nombre, capacidad_max, costo_por_hora'
            });
        }

        // Regla de negocio: el costo por hora debe ser mayor a 0 (rechaza 0 y negativos).
        const costoNum = Number(costo_por_hora);
        if (!Number.isFinite(costoNum) || costoNum <= 0) {
            // Si venía un archivo adjunto, se limpia para no dejar archivos huérfanos.
            if (req.file) fs.unlink(req.file.path, () => { /* limpieza */ });
            return res.status(400).json({ message: 'El costo por hora debe ser mayor a 0.' });
        }

        // --- Imagen: misma lógica que la foto de perfil ---
        let fotoFinal: string | null = null;
        if (req.file) {
            // 1. Solo se guarda si es una imagen REAL (magic bytes)
            if (!esImagenReal(req.file.path)) {
                fs.unlink(req.file.path, () => { /* limpieza */ });
                return res.status(400).json({ message: 'El archivo no es una imagen válida' });
            }
            // 2. Ruta RELATIVA (la sirve express.static por /uploads), no una URL hardcodeada
            fotoFinal = `${CARPETA_IMAGENES}${req.file.filename}`;
        } else {
            fotoFinal = foto_principal || foto_url || null;
        }

        // 3. Validar el valor final (URL externa o imagen subida)
        if (fotoFinal && !esUrlExternaValida(fotoFinal) && !fotoFinal.startsWith(CARPETA_IMAGENES)) {
            return res.status(400).json({
                message: 'La imagen debe ser una URL válida (http:// o https://) o una imagen subida'
            });
        }

        const pool = req.pool ?? await getConnection();

        // Ventanas de mantenimiento (opcionales): se persisten en la MISMA
        // transacción que el alta del área (si fallan, el área se revierte).
        const ventanas = parseMantenimiento(req.body.mantenimiento, formatTime(hora_apertura), formatTime(hora_cierre));

        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        let nuevoId: number | null = null;
        try {
            const result = await new sql.Request(transaction)
                .input('id_usuario_actual', sql.Int, idActual)
                .input('nombre', sql.VarChar(100), nombre)
                .input('capacidad_max', sql.Int, Number(capacidad_max))
                .input('descripcion', sql.VarChar(500), descripcion)
                .input('costo_por_hora', sql.Decimal(10, 2), Number(costo_por_hora))
                .input('hora_apertura', sql.VarChar(8), formatTime(hora_apertura))
                .input('hora_cierre', sql.VarChar(8), formatTime(hora_cierre))
                .input('max_reservas_semana', sql.Int, Number(max_reservas_semana))
                .input('foto_principal', sql.VarChar(255), fotoFinal)
                .execute('sp_CrearAreaComun');

            // El SP suele devolver el id como id_area_creada, pero por robustez
            // (algunas instancias lo devuelven con otro nombre o por OUTPUT/
            // RETURN) si no viene en el recordset se busca por el nombre ÚNICO
            // del área dentro de la MISMA transacción.
            nuevoId = Number(result.recordset?.[0]?.id_area_creada) || null;
            if (nuevoId == null) {
                const buscarId = await new sql.Request(transaction)
                    .input('nombre', sql.VarChar(100), nombre)
                    .query('SELECT TOP 1 id_area FROM AreaComun WHERE nombre = @nombre');
                nuevoId = Number(buscarId.recordset?.[0]?.id_area) || null;
            }

            if (nuevoId != null && ventanas.length > 0) {
                await insertarMantenimiento(transaction, nuevoId, ventanas);
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback().catch(() => undefined);
            throw error;
        }

        return res.status(201).json({
            message: 'Área creada correctamente',
            id_area: nuevoId
        });
    } catch (error: unknown) {
        console.error('Error en createArea:', error);
        // Si el SP falló, el archivo recién subido queda huérfano → se limpia
        if (req.file) fs.unlink(req.file.path, () => { /* best-effort */ });
        if (esErrorDePermisos(error)) {
            return res.status(403).json({ message: mensajeDe(error) });
        }
        return res.status(400).json({ message: mensajeDe(error) });
    }
};

/**
 * 3. Actualizar Área (PUT) - PUT /api/areas/:id
 * Acepta multipart/form-data con el archivo en el campo 'imagen', o JSON.
 * - Si se sube archivo → se guarda la ruta relativa y se borra la anterior.
 * - Si se envía foto_principal/foto_url → se usa ese valor (NULL/'' elimina).
 * - Si no se envía nada de imagen → se PRESERVA la foto actual (no se pierde).
 */
export const updateArea = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const { id } = req.params;
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ message: 'El ID del área es inválido.' });
        }

        const {
            nombre,
            capacidad_max,
            descripcion = null,
            costo_por_hora,
            hora_apertura,
            hora_cierre,
            max_reservas_semana = 10
        } = req.body;

        if (!nombre || capacidad_max === undefined || costo_por_hora === undefined) {
            return res.status(400).json({
                message: 'Campos requeridos faltantes: nombre, capacidad_max, costo_por_hora'
            });
        }

        // Regla de negocio: el costo por hora debe ser mayor a 0 (rechaza 0 y negativos).
        const costoNum = Number(costo_por_hora);
        if (!Number.isFinite(costoNum) || costoNum <= 0) {
            // Si venía un archivo adjunto, se limpia para no dejar archivos huérfanos.
            if (req.file) fs.unlink(req.file.path, () => { /* limpieza */ });
            return res.status(400).json({ message: 'El costo por hora debe ser mayor a 0.' });
        }

        const pool = req.pool ?? await getConnection();

        // --- Leer el estado actual para conocer la foto previa ---
        const listaActual = await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .execute('sp_ListarAreasComunes');
        const actual = listaActual.recordset?.find(
            (fila: Record<string, unknown>) => Number(fila.id_area) === Number(id)
        );
        const fotoAnterior: string | null = (actual?.foto_principal as string | null | undefined) ?? null;

        // --- Imagen: misma lógica que la foto de perfil ---
        let fotoFinal: string | null;
        if (req.file) {
            // 1. Solo se guarda si es una imagen REAL (magic bytes)
            if (!esImagenReal(req.file.path)) {
                fs.unlink(req.file.path, () => { /* limpieza */ });
                return res.status(400).json({ message: 'El archivo no es una imagen válida' });
            }
            // 2. Ruta RELATIVA (la sirve express.static por /uploads)
            fotoFinal = `${CARPETA_IMAGENES}${req.file.filename}`;
        } else {
            const tieneCampoFoto = req.body.foto_principal !== undefined || req.body.foto_url !== undefined;
            if (tieneCampoFoto) {
                // Se envió explícitamente: valor válido, o NULL/'' para eliminar la imagen
                const fotoEnviada = (req.body.foto_principal !== undefined && String(req.body.foto_principal) !== '')
                    ? String(req.body.foto_principal)
                    : (req.body.foto_url !== undefined && String(req.body.foto_url) !== '')
                        ? String(req.body.foto_url)
                        : null;
                fotoFinal = fotoEnviada;
                if (fotoFinal && !esUrlExternaValida(fotoFinal) && !fotoFinal.startsWith(CARPETA_IMAGENES)) {
                    return res.status(400).json({
                        message: 'La imagen debe ser una URL válida (http:// o https://) o una imagen subida'
                    });
                }
            } else {
                // No se envió nada de imagen → preservar la actual (evita perderla al editar)
                fotoFinal = fotoAnterior;
            }
        }

        // Ventanas de mantenimiento: si el campo viene presente (incluido []),
        // se reemplazan TODAS las del área; si no viene, se conservan las actuales.
        const tieneCampoMantenimiento = req.body.mantenimiento !== undefined && req.body.mantenimiento !== null && req.body.mantenimiento !== '';
        const ventanas = tieneCampoMantenimiento
            ? parseMantenimiento(req.body.mantenimiento, formatTime(hora_apertura), formatTime(hora_cierre))
            : null;

        // La actualización del área + reemplazo de ventanas en UNA transacción.
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await new sql.Request(transaction)
                .input('id_usuario_actual', sql.Int, idActual)
                .input('id_area', sql.Int, Number(id))
                .input('nombre', sql.VarChar(100), nombre)
                .input('capacidad_max', sql.Int, Number(capacidad_max))
                .input('descripcion', sql.VarChar(500), descripcion)
                .input('costo_por_hora', sql.Decimal(10, 2), Number(costo_por_hora))
                .input('hora_apertura', sql.VarChar(8), formatTime(hora_apertura))
                .input('hora_cierre', sql.VarChar(8), formatTime(hora_cierre))
                .input('max_reservas_semana', sql.Int, Number(max_reservas_semana))
                .input('foto_principal', sql.VarChar(255), fotoFinal)
                .execute('sp_ActualizarAreaComun');

            if (ventanas !== null) {
                await new sql.Request(transaction)
                    .input('id_area', sql.Int, Number(id))
                    .query('DELETE FROM AreaMantenimiento WHERE id_area = @id_area');
                if (ventanas.length > 0) {
                    await insertarMantenimiento(transaction, Number(id), ventanas);
                }
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback().catch(() => undefined);
            throw error;
        }

        // 3. Recién tras el éxito: borrar la imagen anterior si cambió/desapareció
        if (fotoAnterior && fotoAnterior !== fotoFinal) {
            eliminarImagenAnterior(fotoAnterior);
        }

        return res.status(200).json({ message: 'Área actualizada correctamente' });
    } catch (error: unknown) {
        console.error('Error en updateArea:', error);
        // Si el SP falló, el archivo recién subido queda huérfano → se limpia
        if (req.file) fs.unlink(req.file.path, () => { /* best-effort */ });
        if (esErrorDePermisos(error)) {
            return res.status(403).json({ message: mensajeDe(error) });
        }
        return res.status(400).json({ message: mensajeDe(error) });
    }
};

/**
 * 4. Activar Área (PATCH) - PATCH /api/areas/:id/activar
 */
export const activateArea = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const { id } = req.params;
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ message: 'El ID del área es inválido.' });
        }

        const pool = req.pool ?? await getConnection();
        await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_area', sql.Int, Number(id))
            .execute('sp_ActivarAreaComun');

        return res.status(200).json({ message: 'Área activada correctamente' });
    } catch (error: unknown) {
        console.error('Error en activateArea:', error);
        if (esErrorDePermisos(error)) {
            return res.status(403).json({ message: mensajeDe(error) });
        }
        return res.status(400).json({ message: mensajeDe(error) });
    }
};

/**
 * 5. Desactivar Área (PATCH) - PATCH /api/areas/:id/desactivar
 */
export const deactivateArea = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const { id } = req.params;
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ message: 'El ID del área es inválido.' });
        }

        const pool = req.pool ?? await getConnection();
        await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_area', sql.Int, Number(id))
            .execute('sp_DesactivarAreaComun');

        return res.status(200).json({ message: 'Área desactivada correctamente' });
    } catch (error: unknown) {
        console.error('Error en deactivateArea:', error);
        if (esErrorDePermisos(error)) {
            return res.status(403).json({ message: mensajeDe(error) });
        }
        return res.status(400).json({ message: mensajeDe(error) });
    }
};
