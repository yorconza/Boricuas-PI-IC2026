/**
 * ============================================================================
 * Middleware: session.ts
 * ============================================================================
 * validateSessionAndSetContext
 *   DEBE ejecutarse DESPUÉS de authenticateToken.
 *
 *   1. Llama a sp_VerificarYExpirarSesion(id_sesion, id_usuario, limite_minutos)
 *      para validar que la sesión siga activa (inactividad máxima 30 min).
 *      El propio SP actualiza fecha_ultima_actividad, por lo que NO se invoca
 *      sp_ActualizarActividadSesion.
 *   2. Si la sesión está expirada → responde 401 "Sesión expirada por inactividad".
 *   3. Si está activa → ejecuta SET CONTEXT_INFO(id_usuario) en la MISMA conexión
 *      (equivalente a SET CONTEXT_INFO(CAST(id_usuario AS VARBINARY(4))), útil para
 *      auditoría dentro de triggers/SPs) y guarda la pool en `req.pool` para que
 *      el controlador reutilice esa misma conexión.
 * ============================================================================
 */
import { type NextFunction, type Request, type Response } from 'express';
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';

// Límite de inactividad en minutos (debe coincidir con el definido en el SP)
const LIMITE_INACTIVIDAD_MIN = 30;

/**
 * Middleware de validación de sesión.
 * Reutiliza la pool (conexión) que usará el controlador y la adjunta en req.pool.
 */
export const validateSessionAndSetContext = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;

        // Requiere que authenticateToken haya corrido antes
        if (!user) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        // Reutiliza la misma pool (conexión) que usará el controlador
        const pool = await getConnection();

        // 1. Verificar/expirar la sesión. El SP retorna el OUTPUT @activa.
        const result = await pool.request()
            .input('id_sesion', sql.Int, user.id_sesion)
            .input('id_usuario', sql.Int, user.id_usuario)
            .input('limite_minutos', sql.Int, LIMITE_INACTIVIDAD_MIN)
            .output('activa', sql.Int)
            .execute('sp_VerificarYExpirarSesion');

        const activa = result.output?.activa
            ?? result.recordset?.[0]?.activa;

        // 2a. Si el SP no devolvió el valor esperado es un problema de
        //     configuración (nombre del OUTPUT), no una sesión expirada.
        if (activa === undefined) {
            console.error('sp_VerificarYExpirarSesion no devolvió el OUTPUT @activa');
            return res.status(500).json({ message: 'Error al validar la sesión' });
        }

        // 2b. Sesión inactiva/expirada
        if (Number(activa) !== 1) {
            return res.status(401).json({ message: 'Sesión expirada por inactividad' });
        }

        // 3. Establecer CONTEXT_INFO(id_usuario) en la misma conexión.
        //    SET CONTEXT_INFO CAST(@id_usuario AS VARBINARY(4)) — big-endian (4 bytes)
        //    INVARIANTE: los controladores protegidos deben lanzar su primera
        //    consulta a BD sin `await` previo, para que ninguna otra petición
        //    sobrescriba el CONTEXT_INFO entre medio (el pool max:1 lo garantiza).
        const contextBuffer = Buffer.alloc(4);
        contextBuffer.writeUInt32BE(user.id_usuario, 0);

        await pool.request()
            .input('context_info', sql.VarBinary(4), contextBuffer)
            .query('SET CONTEXT_INFO @context_info');

        // 4. Adjuntar la conexión al request para que el controlador la reutilice
        req.pool = pool;

        return next();
    } catch (error) {
        console.error('Error al validar la sesión:', error);
        return res.status(500).json({ message: 'Error al validar la sesión' });
    }
};
