/**
 * ============================================================================
 * Archivo: Inquilinoreservaroute.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Define las rutas de Reservas para Inquilinos (montadas en /api/inquilino/reservas
 * desde server.ts):
 *
 *   GET    /api/inquilino/reservas/proxima  → sp_ObtenerMiProximaReserva
 *   GET    /api/inquilino/reservas          → sp_ListarMisReservas
 *   GET    /api/inquilino/reservas/:id      → sp_ObtenerReservaDetalle
 *   POST   /api/inquilino/reservas          → sp_CrearReservaPago
 *   PATCH  /api/inquilino/reservas/:id      → sp_CancelarReserva
 *
 * Protección: JWT → 2FA → sesión + SET CONTEXT_INFO → rol Inquilino.
 *
 * Se comunica con:
 *   - Inquilinoreservacontroller.ts (handler de cada ruta).
 *   - server.ts (montaje en /api/inquilino/reservas).
 *
 * ============================================================================
 */
import { Router } from 'express';
import {crearReserva,getMisReservas,getProximaReserva,getDetalleReserva,updateReserva} from '../controllers/Inquilinoreservacontroller.js';

import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const inquilinoReserva: Router = Router();

// Protección:
// 1) JWT válido
// 2) 2FA completado
// 3) Sesión activa en BD
// 4) Rol Inquilino
const protegerInquilino = [authenticateToken,require2FA,validateSessionAndSetContext,authorizeRole('Inquilino')];

// GET /api/inquilino/reservas/proxima
inquilinoReserva.get('/proxima', protegerInquilino, getProximaReserva);

// GET /api/inquilino/reservas
inquilinoReserva.get('/', protegerInquilino, getMisReservas);

// GET /api/inquilino/reservas/:id
inquilinoReserva.get('/:id', protegerInquilino, getDetalleReserva);

// POST /api/inquilino/reservas
inquilinoReserva.post('/', protegerInquilino, crearReserva);

// PATCH /api/inquilino/reservas/:id
inquilinoReserva.patch('/:id', protegerInquilino, updateReserva);

export default inquilinoReserva;