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
import { limpiarContexto, fijarContextoUsuario } from './contextoService.js';

/**
 * Ejecuta sp_FinalizarReservasVencidas: marca como 'Finalizada' las reservas
 * activas (Confirmada/Reservado) cuya fecha ya pasó, o que HOY ya tienen
 * hora_fin vencida. Devuelve la cantidad de reservas finalizadas.
 *
 * NOTA (auditoría): el vencimiento es una acción del SISTEMA (pasa el tiempo),
 * así que se limpia el CONTEXT_INFO antes de ejecutar el SP para que la
 * bitácora registre "Sistema" y no al usuario de la petición que disparó la
 * consulta lazy; luego se restaura el contexto del usuario para que el resto
 * del request siga atribuyéndose correctamente.
 */
export const finalizarReservasVencidas = async (
    pool: sql.ConnectionPool | undefined,
    idUsuarioActual?: number,
): Promise<number> => {
    if (!pool) return 0;
    try {
        await limpiarContexto(pool);
        const result = await pool.request()
            .execute('sp_FinalizarReservasVencidas');
        return Number(result?.recordset?.[0]?.reservas_finalizadas ?? 0);
    } catch (err) {
        console.error('Error al auto-finalizar reservas vencidas:', err);
        return 0;
    } finally {
        // Restaurar el contexto del usuario autenticado (best-effort).
        if (idUsuarioActual != null) {
            await fijarContextoUsuario(pool, idUsuarioActual);
        }
    }
};
