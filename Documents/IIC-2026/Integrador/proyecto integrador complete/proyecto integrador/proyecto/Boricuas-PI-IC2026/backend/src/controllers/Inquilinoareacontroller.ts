import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';

// 1. Listar áreas comunes disponibles para reservar (sp_ListarAreasDisponibles)
// GET /api/inquilino/areas
// NOTA (cambio - fix seguridad/JWT): antes leía id_usuario_actual de
// req.query, pero el frontend ya no lo envía -> Number(undefined) = NaN.
// Se toma de req.user (llenado por authenticateToken a partir del token
// firmado) igual que el resto del módulo Inquilino.
export const getAreasDisponibles = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .execute('sp_ListarAreasDisponibles');

        return res.status(200).json(result?.recordset);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};