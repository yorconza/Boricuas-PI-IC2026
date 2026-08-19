/**
 * ============================================================================
 * Archivo: preferenciaController.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Controller del módulo de Preferencias de Usuario. Aplica a CUALQUIER rol
 * (Inquilino, Guarda, Administrador):
 *
 *   getPreferencias        → sp_ObtenerPreferencias (tema, idioma, fuente, tamaño)
 *   actualizarPreferencias → sp_ActualizarPreferencias (PATCH parcial, ISNULL en SP)
 *
 * Seguridad:
 *   - Rutas protegidas por JWT + 2FA + sesión (sin authorizeRole).
 *   - id_usuario_actual se toma de req.user.
 *
 * Se comunica con:
 *   - SQL Server vía confDB.getConnection().
 *   - Ruta: preferenciaRoute.ts.
 *   - Frontend: PreferenciasContext.tsx → preferenciaService.ts.
 *
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';

// 1. Obtener mis preferencias (sp_ObtenerPreferencias)
// GET /api/preferencias
// Aplica a cualquier rol autenticado (Inquilino, Guarda, Administrador) -
// cada usuario tiene una fila en PreferenciaUsuario sin importar su rol.
export const getPreferencias = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .execute('sp_ObtenerPreferencias');

        return res.status(200).json(result?.recordset?.[0] ?? null);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 2. Actualizar mis preferencias (sp_ActualizarPreferencias)
// PATCH /api/preferencias
// Body: { idioma?, tema?, fuente?, tamano_fuente? } - todos opcionales,
// el SP usa ISNULL(@param, columna_actual) así que solo actualiza lo que
// llega en el body y deja el resto igual.
export const actualizarPreferencias = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const { idioma, tema, fuente, tamano_fuente } = req.body;

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .input('idioma', sql.VarChar(2), idioma || null)
            .input('tema', sql.VarChar(10), tema || null)
            .input('fuente', sql.VarChar(50), fuente || null)
            .input('tamano_fuente', sql.VarChar(10), tamano_fuente || null)
            .execute('sp_ActualizarPreferencias');

        return res.status(200).json({ message: 'Preferencias actualizadas exitosamente' });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};
