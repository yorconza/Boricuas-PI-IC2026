/**
 * ============================================================================
 * Archivo: reservaRoute.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Define las rutas del módulo de Reservas (panel Admin, SOLO LECTURA),
 * montadas en /api/reservas desde server.ts:
 *
 *   GET /api/reservas            → sp_ConsultarHistorial (listado completo)
 *   GET /api/reservas/hoy        → sp_ListarReservas (solo del día)
 *   GET /api/reservas/historial  → sp_ConsultarHistorial (paginado)
 *
 * No hay POST/PUT/PATCH: la creación y cancelación de reservas es del
 * inquilino (POST/PATCH /api/inquilino/reservas).
 *
 * Protección: JWT → 2FA → sesión + SET CONTEXT_INFO → rol Administrador.
 *
 * Se comunica con:
 *   - reservaController.ts (handler de cada ruta).
 *   - server.ts (montaje en /api/reservas).
 *
 * ============================================================================
 */
import { Router } from 'express';
import {
    getReservasHoy,
    getHistorialReservas,
    getHistorialReservasPaginado
} from '../controllers/reservaController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const reserva: Router = Router();

// Protección JWT (cambio de seguridad):
// ANTES estas rutas eran públicas — cualquiera que conociera un id_usuario_actual
// de administrador podía listar/crear reservas sin haber iniciado sesión.
// AHORA cada ruta exige: 1) token Bearer válido (401 si falta/expira),
// 2) verificación 2FA completada (403 si no), 3) sesión activa en BD
// (401 por inactividad), 4) rol Administrador (403).
const protegerAdmin = [authenticateToken, require2FA, validateSessionAndSetContext, authorizeRole('Administrador')];

// 1. Rutas específicas GET
// GET /api/reservas -> Obtiene TODAS las reservas (para el listado general / DataContext)
reserva.get('/', protegerAdmin, getHistorialReservas);

// GET /api/reservas/hoy -> Obtiene solo las reservas del día actual
reserva.get('/hoy', protegerAdmin, getReservasHoy);

// GET /api/reservas/historial -> Historial paginado (mismo formato que
// /api/visitas/historial: { pagina, limite, totalRegistros, totalPaginas, datos })
reserva.get('/historial', protegerAdmin, getHistorialReservasPaginado);

// 2. Ruta dinámica GET con :id
// reserva.get('/:id', protegerAdmin, getDetalleReserva);

// 3. El panel admin es SOLO LECTURA: no hay POST/PUT/PATCH.
// Las reservas se crean (sp_CrearReservaPago) y cancelan (sp_CancelarReserva)
// únicamente desde el flujo del inquilino: POST/PATCH /api/inquilino/reservas.

export default reserva;
