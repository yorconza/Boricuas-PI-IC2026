/**
 * ============================================================================
 * Servicio: contextoService.ts
 * ============================================================================
 * Helpers para manipular CONTEXT_INFO — el valor que leen los triggers de
 * bitácora (dbo.fn_UsuarioSesion) para saber QUIÉN ejecutó cada operación.
 *
 * El backend usa UNA sola conexión física (pool max:1, ver confDB.ts) y el
 * CONTEXT_INFO persiste en ella entre peticiones. Si una operación del SISTEMA
 * (limpieza de notificaciones, scheduler de recordatorios, recuperación de
 * contraseña, auto-finalización de reservas/contratos, etc.) corre con el
 * CONTEXT_INFO de un usuario anterior, la bitácora le atribuye esa acción al
 * usuario equivocado en lugar de "Sistema".
 *
 *  - limpiarContexto(pool)      → deja CONTEXT_INFO en 16 bytes de ceros:
 *    las operaciones siguientes se registran como "Sistema" (id_usuario NULL).
 *  - fijarContextoUsuario(pool) → escribe el id del usuario autenticado
 *    (big-endian, 4 bytes, mismo formato que validateSessionAndSetContext).
 *    Se usa para RESTAURAR el contexto tras una operación del sistema que
 *    corrió dentro de un request autenticado.
 * ============================================================================
 */
import sql from 'mssql';

/** 16 bytes en ceros = CONTEXT_INFO vacío (forma estándar de limpiarlo). */
const CONTEXTO_VACIO = Buffer.alloc(16);

/**
 * Limpia CONTEXT_INFO (lo deja en ceros). Los triggers de bitácora
 * (dbo.fn_UsuarioSesion) devuelven NULL → la operación se registra como
 * "Sistema". Ejecútalo ANTES de operaciones del sistema que disparan triggers.
 * Nunca lanza: si falla, se registra y se continúa (best-effort).
 */
export const limpiarContexto = async (pool: sql.ConnectionPool | undefined): Promise<void> => {
    if (!pool) return;
    try {
        await pool.request()
            .input('context_info', sql.VarBinary(16), CONTEXTO_VACIO)
            .query('SET CONTEXT_INFO @context_info');
    } catch (err) {
        console.error('Error al limpiar CONTEXT_INFO:', err);
    }
};

/**
 * Escribe el id del usuario en CONTEXT_INFO (4 bytes big-endian, el mismo
 * formato que usa el middleware de sesión). Úsalo para RESTAURAR el contexto
 * después de una operación del sistema dentro de un request autenticado.
 * Nunca lanza: si falla, se registra y se continúa (best-effort).
 */
export const fijarContextoUsuario = async (pool: sql.ConnectionPool | undefined, idUsuario: number): Promise<void> => {
    if (!pool) return;
    try {
        const buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(idUsuario, 0);
        await pool.request()
            .input('context_info', sql.VarBinary(4), buffer)
            .query('SET CONTEXT_INFO @context_info');
    } catch (err) {
        console.error('Error al fijar CONTEXT_INFO:', err);
    }
};
