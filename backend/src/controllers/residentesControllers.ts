/**
 * ============================================================================
 * Archivo: residentesControllers.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Controller del módulo de Residentes (panel Admin). CRUD completo:
 *
 *   getResidentes           → sp_Residente_Listar (filtros: nombre, depto, estado)
 *   createResidente         → sp_Residente_Insertar (hashea contraseña con bcrypt)
 *   updateResidente         → sp_Residente_Actualizar
 *   changeEstadoResidente   → sp_Residente_CambiarEstado (desactivar/reactivar)
 *
 * Auto-finalización de contratos:
 *   - Antes de listar, finalizarContratosVencidos() actualiza los contratos
 *     vencidos para que el listado refleje el estado real.
 *
 * Seguridad:
 *   - Rutas protegidas por JWT + 2FA + sesión + rol Administrador.
 *   - id_usuario_actual se toma del token (req.user).
 *
 * Se comunica con:
 *   - SQL Server vía confDB.getConnection().
 *   - contratoService.ts (finalizarContratosVencidos).
 *   - Ruta: residenteRoute.ts.
 *   - Frontend: ResidentesPage.tsx.
 *
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';
// Auto-finalización de contratos por fecha fin (ver services/contratoService.ts)
import { finalizarContratosVencidos } from '../services/contratoService.js';

// Rondas de bcrypt para el hash de contraseña (mismas que authController.register)
const SALT_ROUNDS = 10;

// 1. Listar residentes (GET)
export const getResidentes = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, id_usuario, nombre, departamento, estado_contrato, activo } = req.query;

        // SEGURIDAD (cambio): con las rutas protegidas por JWT, el id_usuario_actual
        // se toma del token firmado (req.user), NO del cliente. Así un atacante no
        // puede suplantar a otro administrador inventando un id en el query.
        // El fallback al query solo existe por compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();

        // Auto-finalización de contratos: también se pone al día antes de listar
        // residentes, porque este SP expone estado_contrato (la vista de residentes
        // debe reflejar los contratos ya vencidos por fecha fin). El helper nunca
        // lanza: si falla, el listado continúa (se corrige luego).
        await finalizarContratosVencidos(pool, idActual);

        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_usuario', sql.Int, id_usuario ? Number(id_usuario) : null)
            .input('nombre', sql.VarChar, nombre ? String(nombre) : null)
            .input('departamento', sql.VarChar, departamento ? String(departamento) : null)
            .input('estado_contrato', sql.VarChar, estado_contrato ? String(estado_contrato) : null)
            .input('activo', sql.Bit, activo !== undefined ? Number(activo) : null)
            .execute('sp_Residente_Listar');

        return res.status(200).json(result?.recordset);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 2. Insertar nuevo residente (POST) - CORREGIDO PARA EL SP REAL
export const createResidente = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, nombre_completo, correo, contrasena, contrasena_hash, telefono, cedula, foto_perfil } = req.body ?? {};

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
        // (antes se enviaba VARBINARY(256), lo que causaba error de conversión).
        // SEGURIDAD (cambio): el id se toma del JWT (req.user); el fallback al
        // body solo existe por compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('nombre_completo', sql.VarChar(150), nombre_completo)
            .input('correo', sql.VarChar(150), correo)
            .input('contrasena_hash', sql.VarChar(256), hashBcrypt) // SP usa VARCHAR(256)
            .input('telefono', sql.VarChar(20), telefono || null)
            .input('cedula', sql.VarChar(30), cedula || null)
            .input('foto_perfil', sql.VarChar(255), foto_perfil || null)
            .execute('sp_Residente_Insertar');

        const nuevoId = result?.recordset?.[0]?.id_usuario_nuevo;

        return res.status(201).json({ 
            message: "Residente registrado exitosamente", 
            id_usuario_nuevo: nuevoId 
        });
    } catch (error: unknown) {
        console.error("Error al insertar residente en SQL Server:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error al registrar residente" });
    }
};

// 3. Actualizar residente existente (PUT / PATCH)
export const updateResidente = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // ID del residente a modificar por la URL
        const { id_usuario_actual, nombre_completo, correo, telefono, cedula, foto_perfil } = req.body ?? {};

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
            .input('nombre_completo', sql.VarChar, nombre_completo)
            .input('correo', sql.VarChar, correo)
            .input('telefono', sql.VarChar, telefono || null)
            .input('cedula', sql.VarChar, cedula || null)
            .input('foto_perfil', sql.VarChar, foto_perfil || null)
            .execute('sp_Residente_Actualizar');

        return res.status(200).json({ message: "Residente actualizado exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }   
};

// 4. Cambiar estado de residente (Desactivar / Reactivar) - CORREGIDO
export const changeEstadoResidente = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // NOTA (cambio): `req.body ?? {}` — en Express 5, req.body es undefined
        // cuando la petición no envía cuerpo; aquí se usa defensivamente.
        const { id_usuario_actual, activo } = req.body ?? {};
        
        // Si no viene "activo" en el body, lo deducimos por el endpoint de la URL
        let estadoActivo = activo;
        if (estadoActivo === undefined) {
            estadoActivo = req.path.endsWith('/reactivar');
        }

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
            .input('activo', sql.Bit, estadoActivo ? 1 : 0)
            .execute('sp_Residente_CambiarEstado');

        const mensajeAccion = estadoActivo ? "reactivado" : "desactivado";
        return res.status(200).json({ message: `Residente ${mensajeAccion} exitosamente` });
    } catch (error: unknown) {
        console.error("Error cambiando estado de residente:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};