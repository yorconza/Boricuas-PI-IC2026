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
 * Protección: JWT → 2FA (sin validateSessionAndSetContext por simplicidad;
 * el SP valida el rol internamente).
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

const router = Router();

// ✅ Cambia '/summary' por '/'
router.get('/', authenticateToken, require2FA, getDashboardSummary);

export default router;