/**
 * ============================================================================
 * Archivo: reporteVisitasRoute.ts
 * ============================================================================
 *
 * Ruta del reporte de visitas autorizadas (montada en /api/reportes/visitas):
 *
 *   GET /api/reportes/visitas/pdf → sp_ReporteVisitas + PDF (Administrador)
 *
 * A diferencia de los reportes de contratos/reservas (públicos, se abren con
 * window.open), este reporte exige token JWT: el frontend lo descarga con
 * fetch + Authorization (mismo patrón que /api/pagos/reporte).
 *
 * ============================================================================
 */
import { Router } from 'express';
import { obtenerReporteVisitasPDF } from '../controllers/reportesController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const router: Router = Router();

// Cadena de protección estándar + rol Administrador.
const protegerAdmin = [
    authenticateToken,
    require2FA,
    validateSessionAndSetContext,
    authorizeRole('Administrador'),
];

// GET /api/reportes/visitas/pdf?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
router.get('/pdf', protegerAdmin, obtenerReporteVisitasPDF);

export default router;
