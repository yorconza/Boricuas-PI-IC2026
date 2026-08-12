import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';
// Auto-finalización de contratos por fecha fin (ver services/contratoService.ts)
import { finalizarContratosVencidos } from '../services/contratoService.js';

// 1. Listar contrato (GET)
export const getContratos = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, id_contrato, residente, estado } = req.query;

        // SEGURIDAD (cambio): con las rutas protegidas por JWT, el id_usuario_actual
        // se toma del token firmado (req.user), NO del cliente. Así un atacante no
        // puede suplantar a otro administrador inventando un id en el query.
        // El fallback al query solo existe por compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();

        // Auto-finalización: antes de listar, los contratos 'Activo' cuya fecha_fin
        // ya llegó pasan automáticamente a 'Finalizado' (solo finalizan por fecha fin).
        // Ejecuta sp_Contrato_AutoFinalizar; idActual va para CONTEXT_INFO (bitácora).
        // El helper nunca lanza: si falla, el listado sigue igual.
        await finalizarContratosVencidos(pool, idActual);

        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_contrato', sql.Int, id_contrato ? Number(id_contrato) : null)
            .input('residente', sql.VarChar, residente ? String(residente) : null)
            .input('estado', sql.VarChar, estado ? String(estado) : null)
            .execute('sp_Contrato_Listar');

        return res.status(200).json(result?.recordset);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 2. Insertar nuevo contrato (POST)
export const createContrato = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, cedula, numero_departamento, fecha_inicio, fecha_fin, monto_mensual, monto_deposito } = req.body ?? {};

        // SEGURIDAD (cambio): con las rutas protegidas por JWT, el id_usuario_actual
        // se toma del token firmado (req.user), NO del cliente. Así un atacante no
        // puede suplantar a otro administrador inventando un id en el body.
        // El fallback al body solo existe por compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        // El departamento se asigna por su NÚMERO (el SP lo resuelve a id).
        if (!numero_departamento || !String(numero_departamento).trim()) {
            return res.status(400).json({ message: 'numero_departamento es obligatorio' });
        }

        // Regla de negocio (montos NOT NULL): ambos montos deben ser > 0.
        const montoMensualNum = Number(monto_mensual ?? 0);
        const montoDepositoNum = Number(monto_deposito ?? 0);
        if (!Number.isFinite(montoMensualNum) || montoMensualNum <= 0 ||
            !Number.isFinite(montoDepositoNum) || montoDepositoNum <= 0) {
            return res.status(400).json({ message: 'El monto mensual y el monto de depósito deben ser mayores a 0.' });
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('cedula', sql.VarChar(30), cedula)
            .input('numero_departamento', sql.VarChar(20), numero_departamento)
            .input('fecha_inicio', sql.Date, fecha_inicio)
            .input('fecha_fin', sql.Date, fecha_fin)
            .input('monto_mensual', sql.Decimal(10, 2), montoMensualNum)
            .input('monto_deposito', sql.Decimal(10, 2), montoDepositoNum)
            .execute('sp_Contrato_Insertar');

        const nuevoIdContrato = result?.recordset?.[0]?.id_contrato_nuevo;

        return res.status(201).json({ 
            message: "Contrato registrado exitosamente", 
            id_contrato_nuevo: nuevoIdContrato 
        });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 3. Actualizar contrato existente (PUT / PATCH)
export const updateContrato = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // ID del contrato que viene en la URL
        const { id_usuario_actual, fecha_inicio, fecha_fin, monto_mensual, monto_deposito } = req.body ?? {};

        // SEGURIDAD (cambio): el id se toma del JWT (req.user); el fallback al
        // body solo existe por compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        // Regla de negocio: si se envían montos deben ser > 0; los ausentes se
        // conservan vía ISNULL dentro del SP.
        const montoValido = (v: unknown): boolean => v == null || (Number.isFinite(Number(v)) && Number(v) > 0);
        if (!montoValido(monto_mensual) || !montoValido(monto_deposito)) {
            return res.status(400).json({ message: 'El monto mensual y el monto de depósito deben ser mayores a 0.' });
        }

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_contrato', sql.Int, Number(id))
            .input('fecha_inicio', sql.Date, fecha_inicio)
            .input('fecha_fin', sql.Date, fecha_fin)
            // En update se envía null si faltan: el SP usa ISNULL(@monto, monto)
            // y conserva el valor existente (las columnas son NOT NULL).
            .input('monto_mensual', sql.Decimal(10, 2), monto_mensual ?? null)
            .input('monto_deposito', sql.Decimal(10, 2), monto_deposito ?? null)
            .execute('sp_Contrato_Actualizar');

        return res.status(200).json({ message: "Contrato actualizado exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }   
};
