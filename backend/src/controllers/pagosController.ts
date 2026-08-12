import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';

// 1. Listar pagos con filtros opcionales (GET)
export const getPagos = async (req: Request, res: Response) => {
    try {
        const { busqueda, estado, solo_hoy, fecha_inicio, fecha_fin } = req.query;

        const pool = await getConnection();
        if (!pool) {
            return res.status(500).json({ message: "No se pudo establecer conexión con la base de datos." });
        }

        const result = await pool.request()
            .input('busqueda', sql.VarChar(150), busqueda ? String(busqueda) : null)
            .input('estado', sql.VarChar(20), estado ? String(estado) : null)
            .input('solo_hoy', sql.Bit, solo_hoy === 'true' || solo_hoy === '1' ? 1 : 0)
            .input('fecha_inicio', sql.Date, fecha_inicio ? String(fecha_inicio) : null)
            .input('fecha_fin', sql.Date, fecha_fin ? String(fecha_fin) : null)
            .execute('sp_ListarPagos');

        return res.status(200).json(result.recordset || []);
    } catch (error: unknown) {
        console.error("Error en getPagos:", error);
        const err = error as Error;
        return res.status(500).json({ message: err.message || "Error interno del servidor" });
    }
};


// 2. Obtener KPIs / Métricas (GET)
export const getMetricasPagos = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual } = req.query;

        const pool = await getConnection();
        if (!pool) {
            return res.status(500).json({ message: "No se pudo establecer conexión con la base de datos." });
        }

        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, id_usuario_actual ? Number(id_usuario_actual) : null)
            .execute('sp_ObtenerMetricasPagos');

        return res.status(200).json(result.recordset?.[0] || {
            total_recaudado: 0,
            pendientes: 0,
            pagados_hoy: 0
        });
    } catch (error: unknown) {
        console.error("Error en getMetricasPagos:", error);
        const err = error as Error;
        return res.status(500).json({ message: err.message || "Error interno del servidor" });
    }
};


// 3. Registrar un nuevo pago (POST - Adaptado al Formulario Directo y Reservas)
export const createPago = async (req: Request, res: Response) => {
    try {
        const { residente, concepto, monto, tipo_pago, metodo, estado_pago, id_reserva } = req.body;

        // Aceptamos tipo_pago o metodo dependiendo de cómo lo envíe el frontend
        const metodoPagoFinal = tipo_pago || metodo;
        const idReservaNum = id_reserva ? Number(id_reserva) : null;

        // Validaciones básicas de campos requeridos
        if (monto === undefined || monto === null || Number(monto) <= 0) {
            return res.status(400).json({ 
                message: "El campo monto es obligatorio y debe ser mayor a cero." 
            });
        }

        if (!metodoPagoFinal || String(metodoPagoFinal).trim() === '') {
            return res.status(400).json({ 
                message: "El tipo/método de pago es obligatorio." 
            });
        }

        // Si NO está asociado a una reserva, exigimos obligatoriamente residente y concepto
        if (!idReservaNum && (!residente || !concepto)) {
            return res.status(400).json({
                message: "Debe proporcionar el residente y el concepto cuando el pago no está asociado a una reserva."
            });
        }

        const pool = await getConnection();
        if (!pool) {
            return res.status(500).json({ message: "No se pudo establecer conexión con la base de datos." });
        }

        const result = await pool.request()
            .input('residente', sql.VarChar(150), residente ? String(residente) : null)
            .input('concepto', sql.VarChar(150), concepto ? String(concepto) : null)
            .input('monto', sql.Decimal(10, 2), Number(monto))
            .input('tipo_pago', sql.VarChar(50), String(metodoPagoFinal))
            .input('estado_pago', sql.VarChar(20), estado_pago ? String(estado_pago) : 'Pagado')
            .input('id_reserva', sql.Int, idReservaNum)
            .execute('sp_RegistrarPago');

        const nuevoIdPago = result.recordset?.[0]?.id_pago;

        return res.status(201).json({
            message: "Pago registrado exitosamente",
            id_pago_nuevo: nuevoIdPago
        });
    } catch (error: unknown) {
        console.error("Error en createPago:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error al registrar el pago" });
    }
};