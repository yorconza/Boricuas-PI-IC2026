/**
 * ============================================================================
 * Archivo: personalController.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Controller del módulo de Personal (Admin/Guarda) del panel Admin. CRUD:
 *
 *   getPersonal            → sp_Personal_Listar
 *   createPersonal         → sp_Personal_Insertar (hashea contraseña con bcrypt)
 *   updatePersonal         → sp_Personal_Actualizar
 *   deactivatePersonal     → sp_Personal_Desactivar
 *   reactivatePersonal     → sp_Personal_Reactivar
 *
 * Validaciones extra (backend):
 *   - Correo de contacto duplicado (pre-chequeo antes del SP, mensaje claro).
 *   - Contraseña hasheada con bcrypt (10 rondas) antes de enviar al SP.
 *   - Detección de error 2601/2627 (carrera entre pre-chequeo e INSERT).
 *
 * Seguridad:
 *   - Rutas protegidas por JWT + 2FA + sesión + rol Administrador.
 *   - id_usuario_actual se toma del token (req.user).
 *
 * Se comunica con:
 *   - SQL Server vía confDB.getConnection().
 *   - Ruta: personalRoute.ts.
 *   - Frontend: PersonalPage.tsx.
 *
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';

// Rondas de bcrypt para el hash de contraseña (mismas que authController.register)
const SALT_ROUNDS = 10;

/** Mensaje amigable cuando el correo de contacto ya lo usa otro usuario. */
const MSG_CORREO_CONTACTO_DUPLICADO = 'Ese correo de contacto ya está en uso por otro usuario. Usa uno diferente.';

/**
 * Mensaje genérico para el fallback del catch: el error 2601/2627 también puede
 * venir del UNIQUE de `correo` (no solo del índice de correo de contacto), así
 * que en esa vía se prefiere un mensaje que cubra ambos casos. El pre-chequeo
 * ya da el mensaje exacto en el camino normal.
 */
const MSG_CORREO_DUPLICADO_GENERICO = 'Ya existe un usuario con ese correo o correo de contacto.';

/**
 * Si el correo de contacto ya lo tiene otro usuario (índice único filtrado
 * UX_Usuario_correo_contacto), responde 400 con un mensaje claro en español en
 * lugar del error crudo 2601 de SQL Server.
 */
const validarCorreoContactoUnico = async (
    pool: sql.ConnectionPool | undefined,
    correoContacto: unknown,
    idUsuarioExcluido?: number,
): Promise<{ duplicado: boolean }> => {
    if (!correoContacto || !pool) return { duplicado: false };
    const request = pool.request()
        .input('correo_contacto', sql.VarChar(150), String(correoContacto).trim());
    if (idUsuarioExcluido !== undefined) {
        request.input('id_usuario', sql.Int, idUsuarioExcluido);
    }
    const resultado = await request.query(
        idUsuarioExcluido !== undefined
            ? 'SELECT 1 FROM Usuario WHERE correo_contacto = @correo_contacto AND id_usuario <> @id_usuario'
            : 'SELECT 1 FROM Usuario WHERE correo_contacto = @correo_contacto'
    );
    return { duplicado: (resultado?.recordset?.length ?? 0) > 0 };
};

/**
 * Detecta el error de SQL Server por clave duplicada (2601 = índice único,
 * 2627 = constraint UNIQUE) para responder con un mensaje amigable si ocurre
 * una carrera entre el pre-chequeo y el INSERT/UPDATE.
 */
const esErrorClaveDuplicada = (error: unknown): boolean => {
    const e = error as { number?: number };
    return e.number === 2601 || e.number === 2627;
};

// 1. Listar personal con búsqueda por nombre o cédula
export const getPersonal = async (req: Request, res: Response) => {
    try {
        const { busqueda } = req.query;

        // SEGURIDAD: id_usuario_actual se toma del token firmado (req.user).
        const idActual = req.user?.id_usuario;
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('busqueda', sql.VarChar(150), busqueda ? String(busqueda).trim() : null)
            .execute('sp_Personal_Listar');

        return res.status(200).json(result?.recordset);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 2. Insertar nuevo personal
export const createPersonal = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, nombre_completo, correo, correo_contacto, contrasena, contrasena_hash, telefono, cedula, foto_perfil } = req.body ?? {};

        // NOTA (cambio): la contraseña SIEMPRE la escribe el admin en el formulario
        // (nunca un valor fijo) y se hashea con bcrypt ANTES de guardarla. Se mantiene
        // `contrasena_hash` como respaldo para clientes antiguos que envían ese nombre.
        const contrasenaPlana = contrasena || contrasena_hash;
        if (!contrasenaPlana) {
            return res.status(400).json({ message: 'La contraseña es obligatoria' });
        }
        const hashBcrypt = await bcrypt.hash(contrasenaPlana, SALT_ROUNDS);

        // NOTA (cambio): el SP espera `@contrasena_hash VARCHAR(256)`, por lo que
        // el hash bcrypt (string) se envía como VarChar y NO como VarBinary/Buffer
        // (antes se enviaba VARBINARY, lo que causaba error de conversión de tipos).
        // id_usuario_actual: si el request trae token JWT (rutas protegidas) se usa
        // el id autenticado; si no, se usa el que envía el cliente.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);

        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();

        // Validación amigable de correo de contacto duplicado (el índice único
        // filtrado también lo impide, pero así el mensaje llega claro en español).
        const { duplicado } = await validarCorreoContactoUnico(pool, correo_contacto);
        if (duplicado) {
            return res.status(400).json({ message: MSG_CORREO_CONTACTO_DUPLICADO });
        }

        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('nombre_completo', sql.VarChar(150), nombre_completo)
            .input('correo', sql.VarChar(150), correo)
            .input('correo_contacto', sql.VarChar(150), correo_contacto ? String(correo_contacto).trim() : null) // Correo real para el 2FA (Admin/Guarda)
            .input('contrasena_hash', sql.VarChar(256), hashBcrypt) // SP usa VARCHAR(256)
            .input('telefono', sql.VarChar(20), telefono || null)
            .input('cedula', sql.VarChar(30), cedula || null)
            .input('foto_perfil', sql.VarChar(255), foto_perfil || null)
            .execute('sp_Personal_Insertar');

        const nuevoId = result?.recordset?.[0]?.id_usuario_nuevo;

        return res.status(201).json({ 
            message: "Personal registrado exitosamente", 
            id_usuario_nuevo: nuevoId 
        });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        // Fallback si una carrera entre el pre-chequeo y el INSERT dispara un
        // índice/constraint único (2601/2627): mensaje genérico en español que
        // cubre tanto `correo` como `correo_contacto` (el pre-chequeo ya dio el
        // mensaje exacto en el camino normal).
        if (esErrorClaveDuplicada(error)) {
            return res.status(400).json({ message: MSG_CORREO_DUPLICADO_GENERICO });
        }
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 3. Actualizar personal existente
export const updatePersonal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // ID del empleado a modificar por la URL
        const { id_usuario_actual, nombre_completo, correo, correo_contacto, telefono, cedula, foto_perfil } = req.body ?? {};

        // SEGURIDAD (cambio): con las rutas protegidas por JWT, el id_usuario_actual
        // se toma del token firmado (req.user), NO del cliente. Así un atacante no
        // puede suplantar a otro administrador inventando un id en el body.
        // El fallback al body solo existe por compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();

        // Validación amigable de correo de contacto duplicado (excluye al propio
        // usuario que se está editando: puede conservar su mismo correo).
        const { duplicado } = await validarCorreoContactoUnico(pool, correo_contacto, Number(id));
        if (duplicado) {
            return res.status(400).json({ message: MSG_CORREO_CONTACTO_DUPLICADO });
        }

        await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_usuario', sql.Int, Number(id))
            .input('nombre_completo', sql.VarChar, nombre_completo)
            .input('correo', sql.VarChar, correo)
            .input('correo_contacto', sql.VarChar(150), correo_contacto ? String(correo_contacto).trim() : null) // Correo real para el 2FA (Admin/Guarda)
            .input('telefono', sql.VarChar, telefono || null)
            .input('cedula', sql.VarChar, cedula || null)
            .input('foto_perfil', sql.VarChar, foto_perfil || null)
            .execute('sp_Personal_Actualizar');

        return res.status(200).json({ message: "Personal actualizado exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        if (esErrorClaveDuplicada(error)) {
            return res.status(400).json({ message: MSG_CORREO_DUPLICADO_GENERICO });
        }
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }   
};

// 4. Desactivar personal (cambiar activo a 0)
export const deactivatePersonal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // NOTA (cambio): `req.body ?? {}` — en Express 5, req.body es undefined
        // cuando la petición no envía cuerpo (este PATCH se llama sin body).
        const { id_usuario_actual } = req.body ?? {};

        // SEGURIDAD (cambio): con las rutas protegidas por JWT, el id_usuario_actual
        // se toma del token firmado (req.user), NO del cliente. Así un atacante no
        // puede suplantar a otro administrador inventando un id en el body.
        // El fallback al body solo existe por compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_usuario', sql.Int, Number(id))
            .execute('sp_Personal_Desactivar');

        return res.status(200).json({ message: "Personal desactivado exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 5. Reactivar personal (cambiar activo a 1)
export const reactivatePersonal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // NOTA (cambio): `req.body ?? {}` — en Express 5, req.body es undefined
        // cuando la petición no envía cuerpo (este PATCH se llama sin body).
        const { id_usuario_actual } = req.body ?? {};

        // SEGURIDAD (cambio): con las rutas protegidas por JWT, el id_usuario_actual
        // se toma del token firmado (req.user), NO del cliente. Así un atacante no
        // puede suplantar a otro administrador inventando un id en el body.
        // El fallback al body solo existe por compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_usuario', sql.Int, Number(id))
            .execute('sp_Personal_Reactivar');

        return res.status(200).json({ message: "Personal reactivado exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};