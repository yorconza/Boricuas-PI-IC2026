/**
 * ============================================================================
 * Servicio: reservaService.ts
 * ============================================================================
 * Manejo de reservas:
 * 1. Auto-finalización de reservas por fecha/hora fin (sp_FinalizarReservasVencidas).
 *
 * Misma estrategia *lazy* que los contratos (contratoService.finalizarContratosVencidos
 * → sp_Contrato_AutoFinalizar): la BD se pone al día en cuanto alguien consulta,
 * sin necesidad de un scheduler. El helper NUNCA lanza: si falla, el listado
 * sigue igual (solo se registra el error).
 * ============================================================================
 */
import sql from 'mssql';

/**
 * Ejecuta sp_FinalizarReservasVencidas: marca como 'Finalizada' las reservas
 * activas (Confirmada/Reservado) cuya fecha ya pasó, o que HOY ya tienen
 * hora_fin vencida. Devuelve la cantidad de reservas finalizadas.
 */
export const finalizarReservasVencidas = async (
    pool: sql.ConnectionPool | undefined,
): Promise<number> => {
    if (!pool) return 0;
    try {
        const result = await pool.request()
            .execute('sp_FinalizarReservasVencidas');
        return Number(result?.recordset?.[0]?.reservas_finalizadas ?? 0);
    } catch (err) {
        console.error('Error al auto-finalizar reservas vencidas:', err);
        return 0;
    }
};
