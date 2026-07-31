import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';

// 1. Listar reservas del día (sp_ListarReservas)
export const getReservasHoy = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual } = req.query;

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .execute('sp_ListarReservas');

        return res.status(200).json(result?.recordset);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 2. Crear reserva (sp_InsertarReserva)
export const createReserva = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, id_area, fecha, hora_inicio, hora_fin, cantidad_personas } = req.body;

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, id_usuario_actual)
            .input('id_area', sql.Int, id_area)
            .input('fecha', sql.Date, fecha)
            .input('hora_inicio', sql.VarChar, hora_inicio)
            .input('hora_fin', sql.VarChar, hora_fin)
            .input('cantidad_personas', sql.Int, cantidad_personas)
            .execute('sp_InsertarReserva');

        const nuevoIdReserva = result?.recordset?.[0]?.id_reserva_nueva ?? null;

        return res.status(201).json({ 
            message: "Reserva registrada exitosamente", 
            id_reserva_nueva: nuevoIdReserva 
        });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 3. Actualizar reserva (sp_ActualizarReserva)
export const updateReserva = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // id_reserva en la URL
        const { id_usuario_actual, fecha, hora_inicio, hora_fin, cantidad_personas } = req.body;

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, id_usuario_actual)
            .input('id_reserva', sql.Int, Number(id))
            .input('fecha', sql.Date, fecha)
            .input('hora_inicio', sql.VarChar, hora_inicio)
            .input('hora_fin', sql.VarChar, hora_fin)
            .input('cantidad_personas', sql.Int, cantidad_personas)
            .execute('sp_ActualizarReserva');

        return res.status(200).json({ message: "Reserva actualizada exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 4. Consultar historial / Filtrar reservas (sp_ConsultarHistorial)
export const getHistorialReservas = async (req: Request, res: Response) => {
    try {
        const { 
            id_usuario_actual, 
            fecha_desde, 
            fecha_hasta, 
            id_area, 
            hora_inicio, 
            estado, 
            residente 
        } = req.query;

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .input('fecha_desde', sql.Date, fecha_desde || null)
            .input('fecha_hasta', sql.Date, fecha_hasta || null)
            .input('id_area', sql.Int, id_area ? Number(id_area) : null)
            .input('hora_inicio', sql.VarChar, hora_inicio || null)
            .input('estado', sql.VarChar, estado || null)
            .input('residente', sql.VarChar, residente || null)
            .execute('sp_ConsultarHistorial');

        return res.status(200).json(result?.recordset);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 5. Obtener detalle de una reserva (sp_ObtenerDetalleReserva)


// 6. Cancelar reserva (sp_CancelarReserva)
export const cancelarReserva = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // id_reserva
        const { id_usuario_actual } = req.body;

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, id_usuario_actual)
            .input('id_reserva', sql.Int, Number(id))
            .execute('sp_CancelarReserva');

        return res.status(200).json({ message: "Reserva cancelada exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 7. Estadísticas mensuales de reservas (sp_EstadisticasMensuales)
export const getEstadisticasMensuales = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, anio, mes } = req.query;

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .input('anio', sql.Int, Number(anio))
            .input('mes', sql.Int, mes ? Number(mes) : null)
            .execute('sp_EstadisticasMensuales');

        return res.status(200).json(result?.recordset);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};