import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';
import { finalizarReservasVencidas } from '../services/reservaService.js';

// 1. Listar reservas del día (sp_ListarReservas)
export const getReservasHoy = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual } = req.query;

        // SEGURIDAD (cambio): con las rutas protegidas por JWT, el id_usuario_actual
        // se toma del token firmado (req.user), NO del cliente. Así un atacante no
        // puede suplantar a otro administrador inventando un id en el query.
        // El fallback al query solo existe por compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();

        // Auto-finalización (lazy): antes de listar, las reservas cuya fecha ya
        // pasó o que HOY ya tienen hora_fin vencida pasan a 'Finalizada'
        // (sp_FinalizarReservasVencidas). El helper nunca lanza: si falla, el
        // listado sigue igual.
        await finalizarReservasVencidas(pool);

        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
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
        const { id_usuario_actual, id_area, fecha, hora_inicio, hora_fin, cantidad_personas } = req.body ?? {};

        // SEGURIDAD (cambio): con las rutas protegidas por JWT, el id_usuario_actual
        // se toma del token firmado (req.user), NO del cliente. Así un atacante no
        // puede suplantar a otro administrador inventando un id en el body.
        // El fallback al body solo existe por compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
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
        const { id_usuario_actual, fecha, hora_inicio, hora_fin, cantidad_personas } = req.body ?? {};

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

        // SEGURIDAD (cambio): con las rutas protegidas por JWT, el id_usuario_actual
        // se toma del token firmado (req.user), NO del cliente. Así un atacante no
        // puede suplantar a otro administrador inventando un id en el query.
        // El fallback al query solo existe por compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();

        // Auto-finalización (lazy): antes de listar, las reservas vencidas
        // pasan a 'Finalizada' (sp_FinalizarReservasVencidas).
        await finalizarReservasVencidas(pool);

        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('fecha_desde', sql.Date, fecha_desde || null)
            .input('fecha_hasta', sql.Date, fecha_hasta || null)
            .input('id_area', sql.Int, id_area ? Number(id_area) : null)
            .input('hora_inicio', sql.VarChar, hora_inicio || null)
            .input('estado', sql.VarChar, estado || null)
            .input('residente', sql.VarChar, residente || null)
            .execute('sp_ConsultarHistorial');

        // El SP ahora devuelve total_registros/total_paginas por fila (para la
        // paginación del historial). En este listado completo (DataContext /
        // pestaña "Hoy") no aplican: se limpian de cada fila.
        const datos = (result?.recordset ?? []).map((fila: Record<string, unknown>) => {
            const copia = { ...fila };
            delete copia.total_registros;
            delete copia.total_paginas;
            return copia;
        });

        return res.status(200).json(datos);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 4b. Historial paginado (sp_ConsultarHistorial con @page_number/@page_size y
// @solo_historial = 1) — pestaña "Historial" del panel admin. Mismo formato
// estándar de paginación del proyecto que /api/visitas/historial:
//   { pagina, limite, totalRegistros, totalPaginas, datos }
export const getHistorialReservasPaginado = async (req: Request, res: Response) => {
    try {
        const {
            fecha_desde,
            fecha_hasta,
            id_area,
            hora_inicio,
            estado,
            residente,
            pageNumber,
            pageSize
        } = req.query;

        // SEGURIDAD: id_usuario_actual se toma del token firmado (req.user),
        // nunca del cliente (el fallback al query es solo compatibilidad).
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(req.query.id_usuario_actual)) ? Number(req.query.id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        // Paginación segura (estándar del proyecto): página ≥ 1, tamaño 1–200 (def 50).
        const paginaActual = Math.max(1, Math.floor(Number(pageNumber) || 1));
        const limiteActual = Math.min(200, Math.max(1, Math.floor(Number(pageSize) || 50)));

        const pool = await getConnection();

        // Auto-finalización (lazy): antes de listar, las reservas vencidas
        // pasan a 'Finalizada' (sp_FinalizarReservasVencidas).
        await finalizarReservasVencidas(pool);

        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('fecha_desde', sql.Date, fecha_desde || null)
            .input('fecha_hasta', sql.Date, fecha_hasta || null)
            .input('id_area', sql.Int, id_area ? Number(id_area) : null)
            .input('hora_inicio', sql.VarChar, hora_inicio || null)
            .input('estado', sql.VarChar, estado || null)
            .input('residente', sql.VarChar, residente || null)
            .input('solo_historial', sql.Bit, 1)
            .input('page_number', sql.Int, paginaActual)
            .input('page_size', sql.Int, limiteActual)
            .execute('sp_ConsultarHistorial');

        const registros = result?.recordset ?? [];
        const totalRegistros = Number(registros[0]?.total_registros ?? 0);
        const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limiteActual));

        // Limpiar los campos de total que viajan repetidos en cada fila.
        const datos = registros.map((registro: Record<string, unknown>) => {
            const fila = { ...registro };
            delete fila.total_registros;
            delete fila.total_paginas;
            return fila;
        });

        return res.status(200).json({
            pagina: paginaActual,
            limite: limiteActual,
            totalRegistros,
            totalPaginas,
            datos
        });
    } catch (error: unknown) {
        console.error("Error al consultar historial paginado de reservas:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 5. Obtener detalle de una reserva (sp_ObtenerDetalleReserva)


// NOTA (cambio): NO existe cancelación desde el panel administrador. Las
// reservas solo las cancela el inquilino dueño, vía PATCH /api/inquilino/reservas/:id
// (Inquilinoreservacontroller.updateReserva → sp_CancelarReserva).

// 6. Estadísticas mensuales de reservas (sp_EstadisticasMensuales)
export const getEstadisticasMensuales = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, anio, mes } = req.query;

        // SEGURIDAD (cambio): con las rutas protegidas por JWT, el id_usuario_actual
        // se toma del token firmado (req.user), NO del cliente. Así un atacante no
        // puede suplantar a otro administrador inventando un id en el query.
        // El fallback al query solo existe por compatibilidad con llamadas sin token.
        const idActual = req.user?.id_usuario ?? (Number.isFinite(Number(id_usuario_actual)) ? Number(id_usuario_actual) : undefined);
        if (!idActual) {
            return res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, idActual)
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