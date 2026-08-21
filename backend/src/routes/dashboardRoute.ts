/**
 * ============================================================================
 * Archivo: dashboardRoute.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Define la ruta del Dashboard del Administrador (montada en /api/dashboard
 * desde server.ts):
 *
 *   GET /api/dashboard → dashboardController.getDashboardSummary
 *
 * Protección: JWT → 2FA → sesión + SET CONTEXT_INFO (el SP valida el rol
 * internamente).
 *
 * Se comunica con:
 *   - dashboardController.ts → dashboardService.ts → sp_Dashboard_ObtenerDatos.
 *   - server.ts (montaje en /api/dashboard).
 *
 * ============================================================================
 */
// src/routes/dashboardRoutes.ts
import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';

const router = Router();

// Cadena de protección estándar (sin authorizeRole: el SP valida el rol).
const proteger = [authenticateToken, require2FA, validateSessionAndSetContext];

// ✅ Cambia '/summary' por '/'
router.get('/', proteger, getDashboardSummary);

export default router;