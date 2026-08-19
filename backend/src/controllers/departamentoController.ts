/**
 * ============================================================================
 * Archivo: departamentoController.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Controller del módulo de Departamentos (panel Admin). CRUD para gestionar
 * los departamentos del condominio:
 *
 *   getDepartamentos            → sp_Departamento_Listar (filtros: número, estado, activo)
 *   createDepartamento          → sp_Departamento_Insertar
 *   updateDepartamento          → sp_Departamento_Actualizar
 *   changeEstadoDepartamento    → sp_Departamento_CambiarEstado (desactivar/reactivar)
 *
 * Seguridad:
 *   - Rutas protegidas por JWT + 2FA + sesión + rol Administrador.
 *   - id_usuario_actual se toma del token (req.user).
 *
 * Se comunica con:
 *   - SQL Server vía confDB.getConnection().
 *   - Ruta: departamentoRoute.ts.
 *   - Frontend: DepartamentosPage.tsx.
 *
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';

// 1. Listar departamentos (GET)
export const getDepartamentos = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, id_departamento, numero, estado, activo } = req.query;

        // SEGURIDAD (cambio): el id_usuario_actual se toma del token firmado
        // (req.user), NO del cliente. El fallback al query solo existe por
        // compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_departamento', sql.Int, id_departamento ? Number(id_departamento) : null)
            .input('numero', sql.VarChar, numero ? String(numero) : null)
            .input('estado', sql.VarChar, estado ? String(estado) : null)
            .input('activo', sql.Bit, activo !== undefined ? Number(activo) : null)
            .execute('sp_Departamento_Listar');

        return res.status(200).json(result?.recordset);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 2. Insertar nuevo departamento (POST)
export const createDepartamento = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, numero, piso, metros_cuadrados } = req.body ?? {};

        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('numero', sql.VarChar(20), numero)
            .input('piso', sql.Int, piso !== undefined && piso !== null && piso !== '' ? Number(piso) : null)
            .input('metros_cuadrados', sql.Decimal(8, 2), metros_cuadrados !== undefined && metros_cuadrados !== null && metros_cuadrados !== '' ? Number(metros_cuadrados) : null)
            .execute('sp_Departamento_Insertar');

        const nuevoId = result?.recordset?.[0]?.id_departamento_nuevo;

        return res.status(201).json({
            message: "Departamento registrado exitosamente",
            id_departamento_nuevo: nuevoId
        });
    } catch (error: unknown) {
        console.error("Error al insertar departamento en SQL Server:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error al registrar departamento" });
    }
};

// 3. Actualizar departamento existente (PUT)
export const updateDepartamento = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // ID del departamento en la URL
        const { id_usuario_actual, numero, piso, metros_cuadrados } = req.body ?? {};

        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_departamento', sql.Int, Number(id))
            .input('numero', sql.VarChar(20), numero)
            .input('piso', sql.Int, piso !== undefined && piso !== null && piso !== '' ? Number(piso) : null)
            .input('metros_cuadrados', sql.Decimal(8, 2), metros_cuadrados !== undefined && metros_cuadrados !== null && metros_cuadrados !== '' ? Number(metros_cuadrados) : null)
            .execute('sp_Departamento_Actualizar');

        return res.status(200).json({ message: "Departamento actualizado exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 4. Cambiar estado activo del departamento (Desactivar / Reactivar)
export const changeEstadoDepartamento = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // NOTA (cambio): `req.body ?? {}` — en Express 5, req.body es undefined
        // cuando la petición no envía cuerpo.
        const { id_usuario_actual, activo } = req.body ?? {};

        // Si no viene "activo" en el body, lo deducimos por el endpoint de la URL
        let estadoActivo = activo;
        if (estadoActivo === undefined) {
            estadoActivo = req.path.endsWith('/reactivar');
        }

        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_departamento', sql.Int, Number(id))
            .input('activo', sql.Bit, estadoActivo ? 1 : 0)
            .execute('sp_Departamento_CambiarEstado');

        const mensajeAccion = estadoActivo ? "reactivado" : "desactivado";
        return res.status(200).json({ message: `Departamento ${mensajeAccion} exitosamente` });
    } catch (error: unknown) {
        console.error("Error cambiando estado de departamento:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};
