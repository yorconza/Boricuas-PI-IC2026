/**
 * ============================================================================
 * Archivo: verificarRelojBD.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Diagnóstico de arranque: compara el reloj del servidor SQL (SYSDATETIME)
 * contra el reloj de la máquina donde corre el backend (Node). Si el desfase
 * supera un umbral, imprime una advertencia clara en la consola.
 *
 * ¿Por qué importa?
 * Los filtros "de HOY" (visitas del guardia y del admin, reservas del día,
 * pagos del día, historial del día) se calculan DENTRO de los SPs con
 * `CAST(SYSDATETIME() AS DATE)`, es decir, con el reloj de la BD. Si el
 * Windows del servidor SQL tiene la zona horaria o el reloj mal configurados,
 * el límite de medianoche se corre (p. ej. +6 h) y entre 00:00 y esa hora las
 * visitas de HOY aparecen en el día anterior y viceversa. Esta verificación
 * hace visible ese problema al arrancar, en lugar de descubrirlo de noche.
 *
 * No cambia ningún comportamiento: solo registra en consola.
 * ============================================================================
 */
import { getConnection } from '../config/confDB.js';

/** Desfase máximo tolerado (minutos) entre el reloj de la BD y el de Node. */
const UMBRAL_DESFASE_MIN = 5;

/**
 * Reconstruye los componentes de un DATETIME2 como hora local.
 * El driver mssql entrega `ahora_bd` como objeto Date (cuyos componentes UTC
 * son los que guardó la BD con SYSDATETIME) o, según el SP, como string
 * ("YYYY-MM-DDTHH:mm:ss.sssZ"). Se aceptan ambos para no crashear con
 * "iso.match is not a function".
 */
export const componentesComoLocal = (valor: string | Date): number => {
    const iso = valor instanceof Date ? valor.toISOString() : String(valor);
    const partes = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
    if (!partes) return NaN;
    return new Date(
        Number(partes[1]),
        Number(partes[2]) - 1,
        Number(partes[3]),
        Number(partes[4]),
        Number(partes[5]),
        Number(partes[6])
    ).getTime();
};

/**
 * Consulta SYSDATETIME() y compara contra Date.now(). Imprime el resultado en
 * consola (✅ sincronizado / ⚠️ desfasado). Se ejecuta una vez al arrancar y
 * nunca lanza: si la BD no responde, solo registra el error.
 */
export const verificarRelojBD = async (): Promise<void> => {
    try {
        const pool = await getConnection();
        const res = await pool.request().query('SELECT SYSDATETIME() AS ahora_bd');
        const valor = res?.recordset?.[0]?.ahora_bd as string | Date | undefined;
        if (valor == null) return;

        const bdLocal = componentesComoLocal(valor);
        if (!Number.isFinite(bdLocal)) return;

        const desfaseMin = Math.round((Date.now() - bdLocal) / 60000);
        if (Math.abs(desfaseMin) >= UMBRAL_DESFASE_MIN) {
            console.warn(
                `⚠️  Reloj de la BD desfasado ${desfaseMin >= 0 ? '+' : ''}${desfaseMin} min respecto a este servidor. ` +
                'Los filtros "de HOY" (visitas, reservas, pagos, historial del día) y las horas de notificaciones ' +
                'pueden quedar corridos. Corrige la zona horaria/reloj del Windows de SQL Server.'
            );
        } else {
            console.log(`✅ Reloj de la BD sincronizado con este servidor (desfase ${desfaseMin} min).`);
        }
    } catch (error) {
        console.warn('No se pudo verificar el reloj de la BD:', error instanceof Error ? error.message : error);
    }
};
