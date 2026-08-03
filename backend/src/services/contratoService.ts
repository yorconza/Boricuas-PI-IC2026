/**
 * ============================================================================
 * Servicio: contratoService.ts
 * ============================================================================
 * Auto-finalización de contratos por fecha fin.
 *
 * Contexto (cambio): el botón de "finalizar contrato" se eliminó de la UI — los
 * contratos ya NO se finalizan manualmente. Ahora solo pasan a 'Finalizado' de
 * forma automática cuando llega su fecha_fin. Este servicio expone el helper
 * compartido para que ambos paneles reflejen el estado real:
 *   - GET /api/contratos  (sp_Contrato_Listar)  → contractoController
 *   - GET /api/residentes (sp_Residente_Listar, muestra estado_contrato)
 *     → residentesControllers
 *
 * Estrategia "lazy": la actualización se ejecuta antes de cada listado, de modo
 * que el estado en BD siempre se pone al día en cuanto alguien consulta.
 *
 * Implementación: el UPDATE vive en el SP `sp_Contrato_AutoFinalizar`,
 * 100% SPs del proyecto. El SP recibe @id_usuario_actual (el admin autenticado)
 * para setear CONTEXT_INFO, que es lo que leen los triggers del main en la
 * bitácora de auditoría (mismo patrón que sp_Contrato_Insertar/Actualizar).
 * El UPDATE es idempotente (WHERE estado = 'Activo') y seguro con fechas NULL.
 * ============================================================================
 */
import sql from 'mssql';

/**
 * Ejecuta sp_Contrato_AutoFinalizar: marca como 'Finalizado' los contratos
 * 'Activo' cuya fecha_fin ya llegó (<= hoy). Devuelve la cantidad finalizada
 * (0 si no hay pool/id, o si la ejecución falla).
 *
 * NUNCA lanza: si el SP falla, se registra en consola y se devuelve 0, para que
 * el listado que la invoca siga funcionando (el estado se corregirá en la
 * siguiente consulta).
 */
export const finalizarContratosVencidos = async (
    pool: sql.ConnectionPool | undefined,
    idUsuarioActual: number | undefined,
): Promise<number> => {
    if (!pool || !idUsuarioActual) return 0;
    try {
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, idUsuarioActual)
            .execute('sp_Contrato_AutoFinalizar');
        return Number(result?.recordset?.[0]?.contratos_finalizados ?? 0);
    } catch (err) {
        console.error('Error al auto-finalizar contratos vencidos:', err);
        return 0;
    }
};
