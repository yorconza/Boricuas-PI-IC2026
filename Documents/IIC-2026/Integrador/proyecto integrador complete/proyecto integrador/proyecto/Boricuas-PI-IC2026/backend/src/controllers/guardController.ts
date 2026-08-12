/**
 * ============================================================================
 * Controlador: guardController.ts
 * ============================================================================
 * Módulo Guardia — conecta el panel del guardia con la base de datos real:
 *
 *   1. getResumenVisitasHoy       → GET   /api/guard/dashboard/summary
 *   2. getProximasVisitas         → GET   /api/guard/dashboard/upcoming
 *   3. getVisitasEsperadas        → GET   /api/guard/visits/pending
 *   4. getHistorialVisitas        → GET   /api/guard/visits/history
 *   5. getDetalleVisita           → GET   /api/guard/visits/:id
 *   6. registrarIngresoVisitante  → PATCH /api/guard/visits/:id/status
 *
 * Seguridad:
 *   - Todas las rutas pasan por authenticateToken + validateSessionAndSetContext
 *     + authorizeRole('Guarda'). El id_usuario_actual SIEMPRE se toma del token
 *     firmado (req.user.id_usuario), NUNCA del cliente.
 *
 * Auditoría (CONTEXT_INFO):
 *   - El middleware validateSessionAndSetContext ya ejecuta
 *     SET CONTEXT_INFO(CAST(id_usuario AS VARBINARY(4))) sobre la MISMA conexión
 *     (pool max:1). Por eso estos controladores reutilizan `req.pool` para que
 *     los triggers de bitácora registren al guardia que autorizó/rechazó.
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';

/** Devuelve la pool reutilizada por el middleware de sesión (misma conexión con CONTEXT_INFO). */
const obtenerPool = async (req: Request) => req.pool ?? await getConnection();

/** Extrae el id del guardia autenticado desde el JWT (req.user). */
const obtenerIdActual = (req: Request, res: Response): number | null => {
    const idActual = req.user?.id_usuario;
    if (!idActual) {
        res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        return null;
    }
    return idActual;
};

/**
 * 1. GET /api/guard/dashboard/summary
 * Resumen de tarjetas (pendientes, autorizadas hoy, rechazadas hoy).
 */
export const getResumenVisitasHoy = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const pool = await obtenerPool(req);
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .execute('sp_ObtenerResumenVisitasHoy');

        // El SP puede devolver la fila como recordset o como OUTPUT params
        const resumen = result.recordset?.[0] ?? result.output ?? {
            pendientes: 0,
            autorizadas_hoy: 0,
            rechazadas_hoy: 0,
        };

        return res.status(200).json(resumen);
    } catch (error: unknown) {
        console.error('Error al obtener resumen de visitas:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 2. GET /api/guard/dashboard/upcoming
 * Próximas visitas pendientes (widget lateral del dashboard).
 */
export const getProximasVisitas = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const pool = await obtenerPool(req);
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .execute('sp_ListarProximasVisitas');

        return res.status(200).json(result?.recordset ?? []);
    } catch (error: unknown) {
        console.error('Error al listar próximas visitas:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 3. GET /api/guard/visits/pending?search=...
 * Lista de visitas esperadas (estado Pendiente), con búsqueda opcional.
 */
export const getVisitasEsperadas = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        // El frontend envía `search` (nombre o documento); se acepta `busqueda`
        // como alias por compatibilidad con clientes antiguos.
        const { search, busqueda } = req.query;
        const textoBusqueda = String(search ?? busqueda ?? '').trim() || null;

        const pool = await obtenerPool(req);
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('busqueda', sql.VarChar(150), textoBusqueda)
            .execute('sp_ListarVisitasEsperadas');

        return res.status(200).json(result?.recordset ?? []);
    } catch (error: unknown) {
        console.error('Error al listar visitas esperadas:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 4. GET /api/guard/visits/history?search=...&status=...
 * Historial del día (visitas ya procesadas), con filtros de búsqueda y estado.
 */
export const getHistorialVisitas = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        // El frontend envía `search` (nombre o documento) y `status`
        // (Autorizado/Rechazado); se aceptan `busqueda` y `estado_filtro` como
        // alias por compatibilidad con clientes antiguos.
        const { search, busqueda, estado_filtro, status } = req.query;
        const textoBusqueda = String(search ?? busqueda ?? '').trim() || null;
        const estado = String(estado_filtro ?? status ?? '').trim() || null;

        const pool = await obtenerPool(req);
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('busqueda', sql.VarChar(150), textoBusqueda)
            .input('estado_filtro', sql.VarChar(20), estado)
            .execute('sp_ListarHistorialVisitas_Del_Dia');

        return res.status(200).json(result?.recordset ?? []);
    } catch (error: unknown) {
        console.error('Error al listar historial de visitas:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 5. GET /api/guard/visits/:id
 * Detalle completo de una visita (modal).
 */
export const getDetalleVisita = async (req: Request, res: Response) => {
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
        console.error('Error al obtener detalle de visita:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 6. PATCH /api/guard/visits/:id/status
 * Autoriza (acceso_permitido = 1) o rechaza (acceso_permitido = 0) una visita.
 * Body: { acceso_permitido: boolean, motivo_rechazo?: string }
 */
export const registrarIngresoVisitante = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const { id } = req.params;
        const idVisitante = Number(id);
        if (!Number.isFinite(idVisitante)) {
            return res.status(400).json({ message: 'id_visitante inválido' });
        }

        const { acceso_permitido, motivo_rechazo } = req.body;

        // 1. Validar que acceso_permitido llegue (true/false o 0/1)
        if (typeof acceso_permitido !== 'boolean' && acceso_permitido !== 0 && acceso_permitido !== 1) {
            return res.status(400).json({ message: 'acceso_permitido es obligatorio (true = autorizar, false = rechazar)' });
        }

        const acceso = Boolean(acceso_permitido);

        // 2. Si se rechaza, el motivo es obligatorio (regla de negocio)
        if (!acceso && !motivo_rechazo?.trim()) {
            return res.status(400).json({ message: 'El motivo de rechazo es obligatorio' });
        }

        // 3. Ejecutar el SP de escritura usando la MISMA conexión donde el
        //    middleware ejecutó SET CONTEXT_INFO (auditoría del guardia).
        const pool = await obtenerPool(req);
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_visitante', sql.Int, idVisitante)
            .input('acceso_permitido', sql.Bit, acceso ? 1 : 0)
            .input('motivo_rechazo', sql.VarChar(255), acceso ? null : String(motivo_rechazo))
            .execute('sp_RegistrarIngresoVisitante');

        const idIngreso = result?.recordset?.[0]?.id_ingreso
            ?? result?.output?.id_ingreso
            ?? null;

        return res.status(200).json({
            message: acceso ? 'Visita autorizada exitosamente' : 'Visita rechazada exitosamente',
            id_ingreso: idIngreso,
        });
    } catch (error: unknown) {
        console.error('Error al registrar ingreso de visitante:', error);
        const err = error as Error;
        // Los errores lanzados con RAISERROR dentro del SP (ej. "El visitante no
        // existe o ya fue procesado") traen procName; solo esos mensajes se exponen.
        const esErrorDeSP = typeof (error as { procName?: unknown }).procName === 'string';
        return res.status(400).json({
            message: esErrorDeSP
                ? err.message
                : (err.message || 'Error interno del servidor'),
        });
    }
};
