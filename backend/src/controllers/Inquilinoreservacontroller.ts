import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';
import { finalizarReservasVencidas } from '../services/reservaService.js';

// Mapea el método de pago que envía el frontend (NuevaReservaPage.tsx: 'tarjeta' |
// 'efectivo' | 'sinpe') al valor permitido por el CHECK de la tabla Pago
// ('Efectivo' | 'Tarjeta' | 'Transferencia' | 'Otro'). Asunción: 'sinpe' -> 'Transferencia'.
const mapMetodoPago = (metodo: string | undefined): string => {
    const map: Record<string, string> = {
        tarjeta: 'Tarjeta',
        efectivo: 'Efectivo',
        sinpe: 'Transferencia',
    };
    return map[metodo || ''] || 'Otro';
};

// 1. Crear reserva + pago simulado (sp_CrearReservaPago)
// POST /api/inquilino/reservas
// Body: { id_area, fecha, hora_inicio, hora_fin, cantidad_personas, metodo_pago }
// NOTA (cambio - fix seguridad/JWT): el id_usuario ya NO se lee del body
// (un cliente podría enviar el id de otro inquilino); se toma de req.user,
// que authenticateToken llena a partir del token firmado.
export const crearReserva = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const { id_area, fecha, hora_inicio, hora_fin, cantidad_personas, metodo_pago } = req.body;

        const pool = await getConnection();

        // NOTA (cambio - sp_CrearReservaPago actualizado): el SP ya NO recibe
        // @monto; calcula el monto en el servidor (duración en horas enteras ×
        // costo_por_hora) y lo devuelve en el recordset como monto_pagado.
        // Antes se enviaba .input('monto', ...) y el SP fallaba con
        // "too many arguments specified".
        const result = await pool?.request()
            .input('id_usuario', sql.Int, Number(id_usuario_actual))
            .input('id_area', sql.Int, Number(id_area))
            .input('fecha', sql.Date, fecha)
            .input('hora_inicio', sql.VarChar, hora_inicio)
            .input('hora_fin', sql.VarChar, hora_fin)
            .input('cantidad_personas', sql.Int, cantidad_personas)
            .input('tipo_pago', sql.VarChar, mapMetodoPago(metodo_pago))
            .execute('sp_CrearReservaPago');

        // El monto pagado definitivo lo calcula el SP (monto_calculado); se
        // devuelve al frontend para mostrarlo en el comprobante/toast.
        const row = result?.recordset?.[0];
        const nuevoId = row?.id_reserva ?? null;
        const montoPagado = Number(row?.monto_pagado ?? 0);

        return res.status(201).json({
            message: 'Reserva creada y pago confirmado correctamente',
            id_reserva: nuevoId,
            monto: montoPagado
        });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 2. Listar mis reservas (sp_ListarMisReservas)
// GET /api/inquilino/reservas?estado=Confirmada
// NOTA (cambio - fix seguridad/JWT): antes leía id_usuario_actual de
// req.query, pero el frontend (inquilinoService.obtenerMisReservas) ya no lo
// envía -> Number(undefined) = NaN -> el SP devolvía siempre un recordset
// vacío (por eso "Mis Reservas" y el Dashboard se veían vacíos sin ningún
// error visible: el endpoint respondía 200 con []).
export const getMisReservas = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const { estado } = req.query;

        const pool = await getConnection();

        // Auto-finalización (lazy): antes de listar, las reservas cuya hora fin
        // ya pasó pasan a 'Finalizada' (sp_FinalizarReservasVencidas), para que
        // "Mis Reservas" muestre el estado real.
        await finalizarReservasVencidas(pool);

        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .input('estado', sql.VarChar, estado ? String(estado) : null)
            .execute('sp_ListarMisReservas');

        return res.status(200).json(result?.recordset);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 3. Próxima reserva (sp_ObtenerMiProximaReserva) -> tarjeta del Dashboard
// GET /api/inquilino/reservas/proxima
export const getProximaReserva = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const pool = await getConnection();

        // Auto-finalización (lazy): la próxima reserva no debe ser una que ya
        // terminó, así que primero se finalizan las vencidas.
        await finalizarReservasVencidas(pool);

        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .execute('sp_ObtenerMiProximaReserva');

        return res.status(200).json(result?.recordset?.[0] ?? null);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 4. Detalle de una reserva (sp_ObtenerReservaDetalle)
// GET /api/inquilino/reservas/:id
export const getDetalleReserva = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const { id } = req.params;

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .input('id_reserva', sql.Int, Number(id))
            .execute('sp_ObtenerReservaDetalle');

        return res.status(200).json(result?.recordset?.[0] ?? null);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 5. Cancelar reserva -> PATCH
// PATCH /api/inquilino/reservas/:id
export const updateReserva = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const { id } = req.params;

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .input('id_reserva', sql.Int, Number(id))
            .execute('sp_CancelarReserva');

        return res.status(200).json({ message: 'Reserva cancelada exitosamente' });
    } catch (error: unknown) {
        console.error("Error en SQL/Servidor:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};