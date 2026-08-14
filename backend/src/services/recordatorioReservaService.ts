/**
 * ============================================================================
 * Servicio: recordatorioReservaService.ts
 * ============================================================================
 *
 * Genera la notificación "Recordatorio de cancelación" para los inquilinos
 * cuando su reserva está por comenzar.
 *
 * Por qué un scheduler y no un trigger:
 *   Los triggers de Notificacion se disparan con INSERT/UPDATE; no pueden
 *   avisar por el PASO DEL TIEMPO. Este servicio corre cada 60 segundos,
 *   busca las reservas activas que inician en 30–35 minutos y, si aún no
 *   tienen un recordatorio, inserta uno con sp_CrearNotificacion.
 *
 * Reglas:
 *   - Ventana: faltan entre MINUTOS_ANTICIPACION (30) y 30 + MINUTOS_TOLERANCIA
 *     (35) minutos para el inicio. La tolerancia evita perder el aviso si el
 *     proceso corre tarde (servidor ocupado, reinicio, etc.).
 *   - Sin duplicados: la consulta excluye reservas que YA tienen una
 *     notificación de tipo RECORDATORIO_CANCELACION con su id_referencia.
 *   - Solo reservas activas: se excluyen estados finales (Cancelado,
 *     Completado, Finalizado, Cancelada).
 *   - El tipo "RECORDATORIO_CANCELACION" (23 chars) cabe en VARCHAR(30) de
 *     Notificacion.tipo.
 *
 * ============================================================================
 */
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';

/** Tipo de notificación (≤ 30 chars, cabe en Notificacion.tipo). */
const TIPO_RECORDATORIO = 'RECORDATORIO_CANCELACION';

/** Minutos de anticipación antes del inicio de la reserva. */
const MINUTOS_ANTICIPACION = 30;

/** Ventana de tolerancia: se avisa si faltan entre 30 y 30+5 minutos. */
const MINUTOS_TOLERANCIA = 5;

/** Frecuencia del ciclo (60 s → ~5 oportunidades dentro de la ventana). */
const INTERVALO_MS = 60_000;

/** Estados que NO son reservas activas (no se avisa sobre ellas). */
const ESTADOS_NO_ACTIVOS = ['Cancelado', 'Completado', 'Finalizado', 'Cancelada'];

/** Para los literales de estado se usan strings fijos (sin interpolación). */
const estadosNoActivosSql = ESTADOS_NO_ACTIVOS.map(s => `'${s}'`).join(', ');

let timer: NodeJS.Timeout | null = null;

/**
 * Un ciclo del recordatorio:
 * 1. Busca reservas activas que inician en 30–35 min y no tienen aviso aún.
 * 2. Inserta una notificación por cada una (sp_CrearNotificacion).
 */
export const ejecutarRecordatoriosReserva = async (): Promise<void> => {
    try {
        const pool = await getConnection();

        const result = await pool.request()
            .input('min_anticipacion', sql.Int, MINUTOS_ANTICIPACION)
            .input('min_tolerancia', sql.Int, MINUTOS_TOLERANCIA)
            .input('tipo', sql.VarChar(30), TIPO_RECORDATORIO)
            .query(`
                SELECT t.id_reserva, t.id_usuario, t.area, t.inicio
                FROM (
                    SELECT
                        r.id_reserva,
                        r.id_usuario,
                        a.nombre AS area,
                        DATEADD(MINUTE, DATEDIFF(MINUTE, 0, CAST(r.hora_inicio AS TIME)), CAST(r.fecha AS DATETIME2)) AS inicio
                    FROM Reserva r
                    LEFT JOIN AreaComun a ON a.id_area = r.id_area
                    WHERE r.estado NOT IN (${estadosNoActivosSql})
                ) t
                WHERE t.inicio > DATEADD(MINUTE, @min_anticipacion, SYSDATETIME())
                  AND t.inicio <= DATEADD(MINUTE, @min_anticipacion + @min_tolerancia, SYSDATETIME())
                  AND NOT EXISTS (
                      SELECT 1 FROM Notificacion n
                      WHERE n.id_referencia = t.id_reserva AND n.tipo = @tipo
                  )
            `);

        const reservas = result?.recordset ?? [];
        if (reservas.length === 0) return;

        let insertadas = 0;
        for (const reserva of reservas) {
            const area = typeof reserva.area === 'string' && reserva.area ? reserva.area : 'área común';
            const mensaje = `Tu reserva de ${area} comienza en ${MINUTOS_ANTICIPACION} minutos. Puedes cancelarla desde Mis Reservas.`;

            await pool.request()
                .input('id_usuario', sql.Int, Number(reserva.id_usuario))
                .input('tipo', sql.VarChar(30), TIPO_RECORDATORIO)
                .input('mensaje', sql.VarChar(500), mensaje)
                .input('id_referencia', sql.Int, Number(reserva.id_reserva))
                .execute('sp_CrearNotificacion');

            insertadas += 1;
        }

        console.log(`📢 Recordatorio de cancelación: ${insertadas} notificación(es) creada(s) para reservas en ${MINUTOS_ANTICIPACION} min.`);
    } catch (error: unknown) {
        // Un error aquí no debe tumbar el servidor: se registra y se reintenta
        // en el siguiente ciclo. Si es un problema de columnas del esquema,
        // el mensaje ayuda a diagnosticarlo.
        console.error('Error al generar recordatorios de cancelación de reserva:', error);
    }
};

/** Inicia el ciclo periódico (idempotente: no duplica timers). */
export const iniciarRecordatoriosReserva = (): void => {
    if (timer) return;

    // Primer ciclo inmediato: si el backend arranca justo dentro de la ventana
    // (30–35 min antes), el aviso no se pierde esperando al siguiente minuto.
    void ejecutarRecordatoriosReserva();

    timer = setInterval(() => {
        void ejecutarRecordatoriosReserva();
    }, INTERVALO_MS);

    console.log(`🔔 Recordatorios de cancelación de reserva activados (cada ${INTERVALO_MS / 1000} s).`);
};

/** Detiene el ciclo periódico (usado al apagar el servidor). */
export const detenerRecordatoriosReserva = (): void => {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
};
