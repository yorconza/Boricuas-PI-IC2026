/**
 * ============================================================================
 * Archivo: Inquilinoareacontroller.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Controller del módulo de Áreas para Inquilinos. Expone los endpoints que
 * la pantalla "Nueva Reserva" consume:
 *
 *   getAreasDisponibles   → sp_ListarAreasDisponibles (áreas con horario/costo)
 *   getHorariosDisponibles → sp_ListarHorariosDisponibles (intervalos ocupados del día)
 *
 * El frontend arma los bloques libres a partir de los intervalos ocupados
 * y limita la hora fin al próximo inicio ocupado para evitar traslapes.
 *
 * Seguridad:
 *   - Rutas protegidas por JWT + 2FA + sesión + rol Inquilino.
 *   - id_usuario_actual se toma de req.user (token firmado), nunca del body.
 *
 * Se comunica con:
 *   - SQL Server vía confDB.getConnection().
 *   - Ruta: Inquilinoarearoute.ts (GET /, GET /:id/horarios).
 *   - Frontend: NuevaReservaPage.tsx → inquilinoService.obtenerHorariosOcupados().
 *
 * ============================================================================
 */
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

// 2. Listar horarios OCUPADOS de un área para una fecha (sp_ListarHorariosDisponibles)
// GET /api/inquilino/areas/:id/horarios?fecha=YYYY-MM-DD
// Devuelve los intervalos ocupados del día (todas las reservas ACTIVAS de
// cualquier inquilino, estados 'Confirmada'/'Reservado'). La pantalla "Nueva
// Reserva" arma los bloques libres a partir de estos intervalos y limita la
// hora fin al próximo inicio ocupado, para no ofrecer traslapes parciales
// (p. ej. 8:00-11:00 cuando ya existe 9:00-11:00). Un recordset vacío = el
// día está completamente libre.
export const getHorariosDisponibles = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const idArea = Number(req.params.id);
        const fechaStr = String(req.query.fecha ?? '').trim();

        if (!Number.isFinite(idArea) || idArea <= 0) {
            return res.status(400).json({ message: 'id_area inválido' });
        }
        if (!fechaStr) {
            return res.status(400).json({ message: 'fecha es obligatoria (YYYY-MM-DD)' });
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_area', sql.Int, idArea)
            .input('fecha', sql.Date, fechaStr)
            .execute('sp_ListarHorariosDisponibles');

        return res.status(200).json({
            id_area: idArea,
            fecha: fechaStr,
            ocupados: result?.recordset ?? []
        });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};