/**
 * ============================================================================
 * Controller: notificacionController.ts
 * ============================================================================
 *
 * Endpoints del módulo de Notificaciones (montado en /api/notificaciones).
 * Consume los SPs del sistema de notificaciones de CondominioDB (la tabla
 * Notificacion se llena automáticamente mediante triggers):
 *
 *   getNotificaciones   → sp_ListarNotificaciones
 *   marcarLeida         → sp_MarcarNotificacionLeida
 *   marcarTodasLeidas   → sp_MarcarTodasNotificacionesLeidas
 *   crearNotificacion   → sp_CrearNotificacion
 *
 * Seguridad:
 *   - Las rutas pasan por authenticateToken + require2FA +
 *     validateSessionAndSetContext + authorizeRole (los 3 roles).
 *   - El id_usuario SIEMPRE se toma del token (req.user.id_usuario), NUNCA
 *     del cliente: así el usuario solo ve/marca SUS propias notificaciones
 *     (los SPs además validan la pertenencia).
 *
 * Caducidad automática (24 h):
 *   - Regla de negocio del módulo: una notificación que supera las 24 horas
 *     desde su fecha_envio se elimina automáticamente.
 *   - No existe un SP para esto, así que se hace una limpieza best-effort con
 *     DELETE parametrizado (mismo patrón de consultas directas que el módulo
 *     de recuperación de contraseña en authController.ts) ANTES de listar.
 *     Si el usuario de BD no tuviera permiso de DELETE, la limpieza falla en
 *     silencio y la lista sigue funcionando (el frontend además filtra por
 *     seguridad los items con más de 24 h).
 *
 * Auditoría (CONTEXT_INFO): se reutiliza req.pool (la misma conexión donde
 * validateSessionAndSetContext ejecutó SET CONTEXT_INFO).
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';
import { limpiarContexto } from '../services/contextoService.js';

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

/** Horas de vida de una notificación antes de eliminarse automáticamente. */
const HORAS_DE_VIDA = 24;

/**
 * Convierte el Date que devuelve el driver mssql a un string de hora de pared
 * LOCAL SIN la letra 'Z' (ej. "2026-08-14T13:32:07.063").
 *
 * ¿Por qué? El driver mssql serializa los DATETIME2 etiquetándolos como UTC
 * ("...T13:32:07.063Z") aunque la BD guardó la hora local CORRECTA con
 * SYSDATETIME() (en UTC-6: 13:32 local = 19:32 UTC, y los componentes del
 * string son los que guardó la BD). Esa 'Z' es el único punto del pipeline
 * donde la fecha "parece" UTC: se elimina aquí para que la API entregue la
 * fecha como LOCAL, sin conversiones (regla: la BD ya entrega la hora exacta
 * que se debe mostrar). Los componentes se conservan en el driver, así que
 * formatearlos con getUTC* reconstruye el valor que guardó la BD.
 */
const fechaLocalSinZ = (valor: unknown): string | null => {
    if (!(valor instanceof Date) || Number.isNaN(valor.getTime())) return null;
    const p = (n: number, longitud = 2) => String(n).padStart(longitud, '0');
    return (
        `${valor.getUTCFullYear()}-${p(valor.getUTCMonth() + 1)}-${p(valor.getUTCDate())}` +
        `T${p(valor.getUTCHours())}:${p(valor.getUTCMinutes())}:${p(valor.getUTCSeconds())}` +
        `.${String(valor.getUTCMilliseconds()).padStart(3, '0')}`
    );
};

/**
 * Elimina (best-effort) las notificaciones que superan las 24 horas desde
 * su fecha_envio. Aplica a TODOS los usuarios (caducidad global del módulo).
 * Si falla (p. ej. sin permiso de DELETE), se registra y se continúa: la
 * lista no debe romperse por la limpieza.
 */
const eliminarNotificacionesVencidas = async (pool: sql.ConnectionPool): Promise<void> => {
    try {
        // Acción del SISTEMA (caducidad por paso del tiempo): se limpia el
        // CONTEXT_INFO para que la bitácora registre "Sistema" y no al usuario
        // de la petición que disparó la consulta.
        await limpiarContexto(pool);

        await pool.request()
            .input('horas_vida', sql.Int, HORAS_DE_VIDA)
            .query('DELETE FROM Notificacion WHERE fecha_envio < DATEADD(HOUR, -@horas_vida, SYSDATETIME())');
    } catch (error) {
        console.error('Error al limpiar notificaciones vencidas (>24 h):', error);
    }
};

/**
 * 1. GET /api/notificaciones?leida=&limite=
 * Lista las notificaciones del usuario autenticado (ordenadas por fecha DESC
 * por el SP). Antes de listar, purga las que superan las 24 h.
 *
 * Query params (opcionales):
 *   leida  → 0 = solo no leídas, 1 = solo leídas, omitir = todas
 *   limite → máximo de filas a devolver (def: sin límite, máx 100)
 */
export const getNotificaciones = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const pool = await obtenerPool(req);

        // Caducidad automática: las notificaciones con más de 24 h se borran
        // en cada consulta (regla de negocio del módulo).
        await eliminarNotificacionesVencidas(pool);

        const { leida, limite } = req.query;

        // @leida = NULL (todas) | 0 (solo no leídas) | 1 (solo leídas)
        let filtroLeida: number | null = null;
        if (leida !== undefined && leida !== null) {
            const raw = String(leida).trim().toLowerCase();
            if (raw === '0' || raw === 'false') filtroLeida = 0;
            else if (raw === '1' || raw === 'true') filtroLeida = 1;
        }

        // Límite seguro (1–100; sin límite si no se envía)
        let limiteParam: number | null = null;
        if (limite !== undefined && limite !== null && String(limite).trim() !== '') {
            limiteParam = Math.min(100, Math.max(1, Math.floor(Number(limite))));
        }

        const result = await pool.request()
            .input('id_usuario', sql.Int, idActual)
            .input('leida', sql.Bit, filtroLeida)
            .input('limite', sql.Int, limiteParam)
            .execute('sp_ListarNotificaciones');

        // Reloj actual del servidor SQL (SYSDATETIME, mismo formato que
        // fecha_envio). El frontend lo usa como ANCLA para calcular el "hace X
        // min/h" de cada notificación contra el reloj de la BD y no contra el
        // del navegador: así un desfase de zona horaria del servidor (p. ej.
        // +6 h) no corre la edad de ninguna notificación en los 3 paneles.
        const relojResult = await pool.request()
            .query('SELECT SYSDATETIME() AS ahora_bd');
        const ahoraBd = relojResult?.recordset?.[0]?.ahora_bd ?? null;

        // FIX (zona horaria, capa de aplicación): se elimina la 'Z' de los
        // DATETIME2 para que la fecha viaje como string LOCAL ("...T13:32:07.063")
        // y no como UTC ("...T13:32:07.063Z"). La BD guardó la hora correcta de
        // Costa Rica con SYSDATETIME(); el marcador UTC solo lo añadía el driver.
        const datos = (result?.recordset ?? []).map((fila: Record<string, unknown>) => {
            const copia = { ...fila };
            if (copia.fecha_envio != null) {
                const local = fechaLocalSinZ(copia.fecha_envio);
                if (local) copia.fecha_envio = local;
            }
            return copia;
        });

        return res.status(200).json({
            ahora_bd: fechaLocalSinZ(ahoraBd),
            datos
        });
    } catch (error: unknown) {
        console.error('Error al listar notificaciones:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 2. POST /api/notificaciones
 * Crea una notificación para el usuario autenticado (sp_CrearNotificacion).
 *
 * ¿Para qué? La campana se recarga desde la BD y reemplaza la lista, así que
 * los avisos que la UI generaba SOLO en el estado local (p. ej. "Nueva área"
 * al crear un área) desaparecían a los segundos — la famosa "noti fantasma".
 * Este endpoint los persiste para que sobrevivan al poll. Best-effort en el
 * frontend: si falla, el aviso local igual se muestra.
 *
 * Body: { tipo (≤30), mensaje (≤500), id_referencia? }
 * El destinatario (id_usuario) SIEMPRE es el usuario del JWT, nunca del body.
 */
export const crearNotificacion = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const { tipo, mensaje, id_referencia } = req.body ?? {};
        if (!tipo || !mensaje) {
            return res.status(400).json({ message: 'tipo y mensaje son obligatorios' });
        }

        const pool = await obtenerPool(req);
        await pool.request()
            .input('id_usuario', sql.Int, idActual)
            .input('tipo', sql.VarChar(30), String(tipo).slice(0, 30))
            .input('mensaje', sql.VarChar(500), String(mensaje).slice(0, 500))
            .input('id_referencia', sql.Int, id_referencia != null ? Number(id_referencia) : null)
            .execute('sp_CrearNotificacion');

        return res.status(201).json({ message: 'Notificación creada correctamente' });
    } catch (error: unknown) {
        console.error('Error al crear notificación:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 3. PATCH /api/notificaciones/:id/leida
 * Marca UNA notificación como leída. El SP valida que la notificación
 * pertenezca al usuario autenticado (@id_usuario).
 */
export const marcarLeida = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const { id } = req.params;
        const idNotificacion = Number(id);
        if (!Number.isFinite(idNotificacion) || idNotificacion <= 0) {
            return res.status(400).json({ message: 'id_notificacion inválido' });
        }

        const pool = await obtenerPool(req);
        await pool.request()
            .input('id_notificacion', sql.Int, idNotificacion)
            .input('id_usuario', sql.Int, idActual)
            .execute('sp_MarcarNotificacionLeida');

        return res.status(200).json({ message: 'Notificación marcada como leída' });
    } catch (error: unknown) {
        console.error('Error al marcar notificación como leída:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 4. PATCH /api/notificaciones/marcar-todas
 * Marca TODAS las notificaciones del usuario autenticado como leídas.
 */
export const marcarTodasLeidas = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const pool = await obtenerPool(req);
        await pool.request()
            .input('id_usuario', sql.Int, idActual)
            .execute('sp_MarcarTodasNotificacionesLeidas');

        return res.status(200).json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error: unknown) {
        console.error('Error al marcar todas las notificaciones como leídas:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};
