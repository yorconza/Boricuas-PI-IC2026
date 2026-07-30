import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';

// 1. Listar contrato (GET)
export const getContratos = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, id_contrato, residente, estado } = req.query;

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
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

// 2. Insertar nuevo residente (POST)
export const createContrato = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, id_usuario, id_departamento, fecha_inicio, fecha_fin } = req.body;

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, id_usuario_actual)
            .input('id_usuario', sql.Int, id_usuario)
            .input('id_departamento', sql.Int, id_departamento)
            .input('fecha_inicio', sql.Date, fecha_inicio)
            .input('fecha_fin', sql.Date, fecha_fin)
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

// 3. Actualizar residente existente (PUT / PATCH)
export const updateContrato = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // ID del contrato que viene en la URL
        const { id_usuario_actual, fecha_inicio, fecha_fin } = req.body;

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, id_usuario_actual)
            .input('id_contrato', sql.Int, Number(id))
            .input('fecha_inicio', sql.Date, fecha_inicio)
            .input('fecha_fin', sql.Date, fecha_fin)
            .execute('sp_Contrato_Actualizar');

        return res.status(200).json({ message: "Contrato actualizado exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }   
};

// 4. Cambiar estado de residente (Desactivar / Reactivar)
export const finalizarContrato = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // ID del contrato en la URL
        const { id_usuario_actual, estado_final } = req.body; // 'Finalizado' o 'Cancelado'

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, id_usuario_actual)
            .input('id_contrato', sql.Int, Number(id))
            .input('estado_final', sql.VarChar, estado_final || 'Finalizado')
            .execute('sp_Contrato_Finalizar');

        return res.status(200).json({ message: `Contrato ${estado_final ? estado_final.toLowerCase() : 'finalizado'} exitosamente` });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};