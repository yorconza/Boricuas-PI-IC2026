/**
 * ============================================================================
 * Archivo: Inquilinovisitantecontroller.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Controller del módulo de Visitantes para Inquilinos. CRUD completo:
 *
 *   registrarVisitante   → sp_RegistrarVisitante (alta de visitante)
 *   getMisVisitantes     → sp_ListarMisVisitantes (listado con filtro por estado)
 *   getProximaVisita     → sp_ObtenerMiProximaVisita (tarjeta Dashboard)
 *   getDetalleVisitante  → sp_ObtenerVisitanteDetalle (modal de detalle)
 *   cancelarVisitante    → sp_CancelarVisitante (PATCH)
 *
 * Nota: hora_esperada llega como "HH:mm" (input type="time" del frontend)
 * y se combina con la fecha de hoy para formar el DATETIME completo.
 *
 * Seguridad:
 *   - Rutas protegidas por JWT + 2FA + sesión + rol Inquilino.
 *   - id_usuario_actual se toma de req.user (token firmado).
 *
 * Se comunica con:
 *   - SQL Server vía confDB.getConnection().
 *   - Ruta: Inquilinovisitanteroute.ts.
 *   - Frontend: MisVisitantesPage.tsx, RegistrarVisitantePage.tsx → inquilinoService.
 *
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';
import { getFechaActualDB, getHoraActualDB } from '../services/timezoneService.js';

// 1. Registrar visitante (sp_RegistrarVisitante)
// POST /api/inquilino/visitantes
// Body: { nombre_completo, documento_identidad, placa, hora_esperada }
// Asunción: hora_esperada llega como 'HH:mm' (input type="time" del frontend,
// no incluye fecha), se combina con la fecha de hoy porque el formulario de
// RegistrarVisitantePage.tsx no pide fecha, solo hora.
// NOTA (cambio - fix seguridad/JWT): el id_usuario ya NO se lee del body
// (un cliente podría enviar el id de otro inquilino); se toma de req.user,
// que authenticateToken llena a partir del token firmado.
export const registrarVisitante = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const { nombre_completo, documento_identidad, placa, hora_esperada } = req.body;

        let horaEsperadaCompleta: string | null = null;
        if (hora_esperada) {
            // Construye el DateTime completo combinando la fecha actual de la BD
            // con la hora esperada. Si la hora ya pasó hoy, se asume que el
            // inquilino quiere programarla para mañana (auto-suma de día).
            const fechaHoy = getFechaActualDB();
            const horaActual = getHoraActualDB(); // HH:mm:ss
            const partes = hora_esperada.split(':');
            const hora = Number(partes[0] ?? 0);
            const minuto = Number(partes[1] ?? 0);
            const partesAct = horaActual.split(':');
            const hAct = Number(partesAct[0] ?? 0);
            const mAct = Number(partesAct[1] ?? 0);

            let fechaVisita = fechaHoy;
            // Si la hora esperada es menor o igual a la hora actual, es para mañana
            if (hora < hAct || (hora === hAct && minuto <= mAct)) {
                const fechaObj = new Date(`${fechaHoy}T12:00:00`);
                fechaObj.setDate(fechaObj.getDate() + 1);
                fechaVisita = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}-${String(fechaObj.getDate()).padStart(2, '0')}`;
            }

            horaEsperadaCompleta = `${fechaVisita} ${hora_esperada}:00`;
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .input('nombre_completo', sql.VarChar(150), nombre_completo)
            .input('documento_identidad', sql.VarChar(30), documento_identidad)
            .input('placa', sql.VarChar(20), placa || null)
            .input('hora_esperada', sql.VarChar(19), horaEsperadaCompleta)
            .execute('sp_RegistrarVisitante');

        const nuevoId = result?.recordset?.[0]?.id_visitante ?? null;

        return res.status(201).json({
            message: 'Visitante registrado exitosamente',
            id_visitante: nuevoId
        });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 2. Listar mis visitantes (sp_ListarMisVisitantes)
// GET /api/inquilino/visitantes?estado=Pendiente
// NOTA (cambio - fix seguridad/JWT): antes leía id_usuario_actual de
// req.query, pero el frontend (inquilinoService.obtenerVisitantes) ya no lo
// envía -> Number(undefined) = NaN -> el SP devolvía siempre un recordset
// vacío (por eso "Mis Visitantes" y el Dashboard se veían vacíos sin ningún
// error visible: el endpoint respondía 200 con []).
export const getMisVisitantes = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const { estado } = req.query;

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .input('estado', sql.VarChar, estado ? String(estado) : null)
            .execute('sp_ListarMisVisitantes');

        return res.status(200).json(result?.recordset);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 3. Próxima visita (sp_ObtenerMiProximaVisita) -> tarjeta del Dashboard
// GET /api/inquilino/visitantes/proxima
export const getProximaVisita = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .execute('sp_ObtenerMiProximaVisita');

        return res.status(200).json(result?.recordset?.[0] ?? null);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 4. Detalle de un visitante (sp_ObtenerVisitanteDetalle)
// GET /api/inquilino/visitantes/:id
export const getDetalleVisitante = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const { id } = req.params;

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .input('id_visitante', sql.Int, Number(id))
            .execute('sp_ObtenerVisitanteDetalle');

        return res.status(200).json(result?.recordset?.[0] ?? null);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// PATCH /api/inquilino/visitantes/:id
export const cancelarVisitante = async (req: Request, res: Response) => {
    try {
        const id_usuario_actual = req.user?.id_usuario;
        if (!id_usuario_actual) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const { id } = req.params;

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .input('id_visitante', sql.Int, Number(id))
            .execute('sp_CancelarVisitante');

        return res.status(200).json({ message: 'Visitante cancelado exitosamente' });
    } catch (error: unknown) {
        console.error("Error al cancelar visitante:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};