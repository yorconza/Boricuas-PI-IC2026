/**
 * ============================================================================
 * Archivo: preferenciaRoute.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Define las rutas del módulo de Preferencias (montadas en /api/preferencias
 * desde server.ts):
 *
 *   GET   /api/preferencias → sp_ObtenerPreferencias
 *   PATCH /api/preferencias → sp_ActualizarPreferencias
 *
 * Protección: JWT → 2FA → sesión + SET CONTEXT_INFO (sin authorizeRole:
 * aplica a cualquier rol autenticado).
 *
 * Se comunica con:
 *   - preferenciaController.ts (handler de cada ruta).
 *   - server.ts (montaje en /api/preferencias).
 *
 * ============================================================================
 */
import { Router } from 'express';
import { getPreferencias, actualizarPreferencias } from '../controllers/preferenciaController.js';

import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';

const preferenciaRoute: Router = Router();

// Protección: preferencias aplican a CUALQUIER rol autenticado (Inquilino,
// Guarda, Administrador) - por eso NO se agrega authorizeRole() aquí, a
// diferencia de inquilinoReserva.ts que sí restringe a 'Inquilino'.
// 1) JWT válido
// 2) 2FA completado
// 3) Sesión activa en BD
const protegerUsuario = [authenticateToken, require2FA, validateSessionAndSetContext];

// GET /api/preferencias
preferenciaRoute.get('/', protegerUsuario, getPreferencias);

// PATCH /api/preferencias
preferenciaRoute.patch('/', protegerUsuario, actualizarPreferencias);

export default preferenciaRoute;
