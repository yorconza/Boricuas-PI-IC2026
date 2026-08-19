/**
 * ============================================================================
 * Archivo: timezoneService.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Proporciona funciones para obtener la fecha y hora actual en la zona horaria
 * configurada para SQL Server. Esto garantiza que las fechas enviadas al SPs
 * sean consistentes con lo que GETDATE() / SYSDATETIME() devuelve en la BD.
 *
 * ¿Por qué existe?
 * SQL Server en Docker usa UTC por defecto, mientras que SQL Server local
 * usa la zona horaria del sistema. Si el backend construye fechas con
 * `new Date()` (zona del host) y la BD compara con GETDATE() (zona de la BD),
 * hay un desfase que causa:
 *   - Visitantes no se pueden registrar en horas "futuras"
 *   - Reservas del día no aparecen
 *   - Auto-finalización se ejecuta en el momento incorrecto
 *
 * Configuración:
 *   La variable de entorno DB_TIMEZONE define la zona horaria de la BD.
 *   Ejemplos: "America/Costa_Rica" (UTC-6), "America/Bogota" (UTC-5),
 *   "America/Mexico_City" (UTC-6), "UTC" (para Docker sin configurar TZ).
 *
 * Si DB_TIMEZONE no está definida, se asume la zona del sistema del host
 * (el comportamiento anterior). Se recomienda SIEMPRE definirla explícitamente.
 *
 * Se comunica con:
 *   - Ninguno (funciones puras, sin dependencias externas).
 *   - Usado por: Inquilinovisitantecontroller.ts, contractoController.ts,
 *     reportesController.ts, cualquier controller que construya fechas para SPs.
 *
 * ============================================================================
 */

/**
 * Obtiene la zona horaria configurada para la BD.
 * Prioriza DB_TIMEZONE del entorno; si no existe, usa la zona del sistema.
 */
const getDbTimezone = (): string => {
    return process.env.DB_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Devuelve los componentes de fecha/hora actuales en la zona horaria de la BD
 * como un objeto Date "virtual" (los getters de locale devuelven los valores
 * en la zona configurada via TZ o Intl).
 *
 * IMPORTANTE: Internamente usa Intl.DateTimeFormat para forzar los
 * componentes a la zona de la BD, independientemente de la zona del host.
 */
const nowEnDbTimezone = (): Date => {
    const tz = getDbTimezone();
    // Intl.DateTimeFormat con la zona objetivo nos da los componentes correctos
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';

    return new Date(
        Number(get('year')),
        Number(get('month')) - 1,
        Number(get('day')),
        Number(get('hour')),
        Number(get('minute')),
        Number(get('second')),
    );
};

/**
 * Retorna la fecha actual en formato "YYYY-MM-DD" usando la zona horaria de la BD.
 * Equivalente a CAST(GETDATE() AS DATE) en SQL Server.
 */
export const getFechaActualDB = (): string => {
    const d = nowEnDbTimezone();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Retorna la hora actual en formato "HH:mm:ss" usando la zona horaria de la BD.
 * Equivalente a CONVERT(VARCHAR(8), GETDATE(), 108) en SQL Server.
 */
export const getHoraActualDB = (): string => {
    const d = nowEnDbTimezone();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
};

/**
 * Retorna fecha y hora completas en formato "YYYY-MM-DD HH:mm:ss"
 * usando la zona horaria de la BD. Equivalente a CONVERT(VARCHAR(19), GETDATE(), 120).
 */
export const getFechaHoraActualDB = (): string => {
    return `${getFechaActualDB()} ${getHoraActualDB()}`;
};

/**
 * Combina una fecha "YYYY-MM-DD" con una hora "HH:mm" usando la zona de la BD.
 * Retorna "YYYY-MM-DD HH:mm:00".
 * Nota: la fecha se asume que ya viene del frontend (zona del usuario),
 * la hora también; esta función solo asegura el formato correcto.
 * La zona horaria relevante aquí es la del SP que recibe el string.
 */
export const combinarFechaHora = (fecha: string, hora: string): string => {
    return `${fecha} ${hora}:00`;
};

/**
 * Retorna el nombre de la zona horaria configurada (para logs de diagnóstico).
 */
export const getTimezoneInfo = (): string => {
    const tz = getDbTimezone();
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(now);
    const offset = parts.find(p => p.type === 'timeZoneName')?.value ?? '';
    return `${tz} (${offset})`;
};
