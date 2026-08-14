/**
 * ============================================================================
 * Controller: visitantesController.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Expone los endpoints del módulo de control de visitas del panel ADMIN
 * (GET /api/visitas/*). Consume los SPs de CondominioDB:
 *
 *   1. getVisitasDelDia       → GET /api/visitas/hoy
 *        sp_ListarVisitasDelDia  (visitas de HOY en CUALQUIER estado:
 *        Pendiente | Autorizado | Rechazado)
 *   2. getHistorialVisitantes → GET /api/visitas/historial
 *        sp_ListarHistorialVisitantes  (historial paginado; el SP NO muestra
 *        HOY ni visitas futuras — solo días anteriores a hoy)
 *   3. getDetalleVisitante    → GET /api/visitas/detalle/:id
 *        sp_ObtenerDetalleVisitante         (detalle para el modal/drawer)
 *
 * Seguridad:
 *   - Las rutas pasan por authenticateToken + validateSessionAndSetContext
 *     (+ authorizeRole en la ruta). El id_usuario_actual SIEMPRE se toma del
 *     token firmado (req.user.id_usuario), NUNCA del cliente.
 *   - sp_ListarHistorialVisitantes valida internamente que el usuario sea
 *     Administrador (RAISERROR si no lo es): el error se captura y se
 *     devuelve como HTTP 403 (Forbidden).
 *   - sp_ListarVisitasDelDia y sp_ObtenerDetalleVisitante aceptan Guardas y
 *     Administradores (los SPs también validan rol).
 *
 * Fechas (importante):
 *   - Los parámetros de fecha se envían como VARCHAR, no DateTime2. El driver
 *     mssql desplaza los DateTime2/Date por la zona horaria local (+6 h en
 *     esta máquina): un filtro "desde/hasta" enviado como DateTime2 queda
 *     corrido. Con VARCHAR, SQL Server convierte el ISO tal cual y el filtro
 *     queda exacto.
 *
 * Auditoría (CONTEXT_INFO):
 *   - validateSessionAndSetContext ejecuta SET CONTEXT_INFO sobre la MISMA
 *     conexión (pool max:1); por eso estos controladores reutilizan `req.pool`
 *     para que los triggers de bitácora registren quién consultó.
 *
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';

/** Reutiliza la pool (conexión) donde el middleware ejecutó SET CONTEXT_INFO. */
const obtenerPool = async (req: Request) => req.pool ?? await getConnection();

/** Extrae el id del usuario autenticado desde el JWT (req.user). */
const obtenerIdActual = (req: Request, res: Response): number | null => {
    const idActual = req.user?.id_usuario;
    if (!idActual) {
        res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        return null;
    }
    return idActual;
};

/**
 * Expande "YYYY-MM-DD" a un rango que cubre el día completo. Si el valor ya
 * trae hora (ISO completo), se respeta tal cual.
 */
const expandirFecha = (raw: string, finDeDia: boolean): string =>
    raw.length <= 10 ? (finDeDia ? `${raw}T23:59:59.999` : `${raw}T00:00:00`) : raw;

/**
 * Detecta errores de permisos lanzados por los SPs (RAISERROR).
 * Se usa para traducir la validación interna de rol de
 * sp_ListarHistorialVisitantes en un HTTP 403.
 */
const esErrorDePermisos = (error: unknown): boolean => {
    // Solo se traducen a 403 los errores lanzados por el propio SP (RAISERROR):
    // se exige procName para evitar falsos positivos de otros errores (p. ej.
    // mensajes de conexión que contengan la palabra "permisos").
    const esDeSP = typeof (error as { procName?: unknown }).procName === 'string';
    if (!esDeSP) return false;
    const mensaje = error instanceof Error ? error.message : String(error);
    return /permisos|no autorizad|acceso denegado|forbidden|no tiene.*permiso|solo (el |un |los )?(admin|administrador)/i.test(mensaje);
};

/**
 * 1. GET /api/visitas/hoy
 * Visitas cuya fecha_hora_estimada cae en el día de HOY, en CUALQUIER estado
 * (Pendiente | Autorizado | Rechazado), vía sp_ListarVisitasDelDia.
 *
 * ¿Por qué un SP nuevo y no sp_ListarHistorialVisitas_Del_Dia?
 * El SP de "historial del día" solo devuelve visitas ya DECIDIDAS
 * (Autorizado/Rechazado): una visita Pendiente para HOY nunca aparecía en
 * "Hoy" y caía al Historial. sp_ListarVisitasDelDia lista TODAS las del día.
 *
 * Query params (opcionales): busqueda, estado (Pendiente|Autorizado|Rechazado).
 */
export const getVisitasDelDia = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        // El frontend envía `busqueda` y `estado`; se aceptan `search` y
        // `estado_filtro`/`status` como alias por compatibilidad.
        const { busqueda, search, estado, estado_filtro, status } = req.query;
        const textoBusqueda = String(busqueda ?? search ?? '').trim() || null;
        const estadoFiltro = String(estado ?? estado_filtro ?? status ?? '').trim() || null;

        const pool = await obtenerPool(req);
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('busqueda', sql.VarChar(150), textoBusqueda)
            .input('estado_filtro', sql.VarChar(20), estadoFiltro)
            .execute('sp_ListarVisitasDelDia');

        // Sin paginación: el volumen del día es manejable.
        return res.status(200).json(result?.recordset ?? []);
    } catch (error: unknown) {
        console.error('Error al listar visitas del día:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 2. GET /api/visitas/historial
 * Historial completo de visitantes con paginación y filtros (solo Administrador).
 * El SP (sp_ListarHistorialVisitantes) NO muestra HOY ni visitas futuras:
 * solo días anteriores al actual. Los filtros fechaInicio/fechaFin solo
 * acotan dentro de ese rango.
 * Query params (todos opcionales):
 *   busqueda, estado, fechaInicio, fechaFin, pageNumber (def=1), pageSize (def=50)
 *
 * Respuesta paginada (mismo formato que /api/bitacora):
 *   { pagina, limite, totalRegistros, totalPaginas, datos: [...] }
 */
export const getHistorialVisitantes = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const { busqueda, estado, fechaInicio, fechaFin, pageNumber, pageSize } = req.query;

        // --- Paginación (valores seguros) ---
        const paginaActual = Math.max(1, Math.floor(Number(pageNumber) || 1));
        const limiteActual = Math.min(200, Math.max(1, Math.floor(Number(pageSize) || 50)));

        // --- Normalizar fechas ---
        // El SP ya excluye HOY y las visitas futuras (solo días anteriores a
        // hoy): aquí solo se expande 'YYYY-MM-DD' al día completo. Si vienen
        // con hora (ISO completo), se respetan tal cual.
        let fechaInicioParam: string | null = null;
        if (fechaInicio) {
            fechaInicioParam = expandirFecha(String(fechaInicio), false);
        }
        let fechaFinParam: string | null = null;
        if (fechaFin) {
            fechaFinParam = expandirFecha(String(fechaFin), true);
        }

        const pool = await obtenerPool(req);
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            // Fechas como VARCHAR (no DateTime2): el driver mssql desplazaría la
            // hora por la zona horaria (+6 h) y el filtro quedaría corrido.
            .input('FechaInicio', sql.VarChar(33), fechaInicioParam)
            .input('FechaFin', sql.VarChar(33), fechaFinParam)
            .input('Estado', sql.VarChar(20), estado ? String(estado).trim() : null)
            .input('Busqueda', sql.VarChar(150), busqueda ? String(busqueda).trim() : null)
            .input('PageNumber', sql.Int, paginaActual)
            .input('PageSize', sql.Int, limiteActual)
            .execute('sp_ListarHistorialVisitantes');

        const registros = result?.recordset ?? [];

        // El SP repite total_registros/total_paginas en cada fila; se toman de la primera.
        const totalRegistros = Number(registros[0]?.total_registros ?? 0);
        const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limiteActual));

        // Limpiar los campos de total que viajan en cada fila del recordset.
        const datos = registros.map((registro: Record<string, unknown>) => {
            const fila: Record<string, unknown> = { ...registro };
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
        console.error('Error al consultar historial de visitantes:', error);
        const err = error as Error;
        // El SP valida el rol internamente: si no es Administrador lanza
        // RAISERROR → se traduce a HTTP 403 (Forbidden).
        if (esErrorDePermisos(error)) {
            return res.status(403).json({ message: err.message || 'No tiene permisos para consultar el historial' });
        }
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 3. GET /api/visitas/detalle/:id
 * Detalle completo de un visitante específico (modal / drawer).
 */
export const getDetalleVisitante = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const { id } = req.params;
        const idVisitante = Number(id);
        if (!Number.isFinite(idVisitante)) {
            return res.status(400).json({ message: 'id_visitante inválido' });
        }

        const pool = await obtenerPool(req);
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_visitante', sql.Int, idVisitante)
            .execute('sp_ObtenerDetalleVisitante');

        const detalle = result.recordset?.[0];
        if (!detalle) {
            return res.status(404).json({ message: 'Visita no encontrada' });
        }

        return res.status(200).json(detalle);
    } catch (error: unknown) {
        console.error('Error al obtener detalle de visitante:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};
