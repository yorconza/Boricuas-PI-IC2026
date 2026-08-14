/**
 * ============================================================================
 * Archivo: contratoReporteRoute.ts
 * ============================================================================
 *
 * Ruta del reporte de contratos (montada en /api/reportes/contratos):
 *
 *   GET /api/reportes/contratos/pdf → sp_ObtenerReporteContratos + PDF
 *
 * Protección: JWT + 2FA + sesión + rol Administrador (igual que los reportes
 * de pagos y visitas). Antes era PÚBLICO (cualquiera con la URL podía bajar
 * el PDF con residentes, fechas y montos de contratos); ahora exige token, así
 * que el frontend lo descarga con fetch + Authorization (mismo patrón que
 * /api/pagos/reporte).
 *
 * ============================================================================
 */
import { Router } from 'express';
import { descargarReporteContratos } from '../controllers/contratoReporteController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const router = Router();

// Cadena de protección estándar + rol Administrador.
const protegerAdmin = [
    authenticateToken,
    require2FA,
    validateSessionAndSetContext,
    authorizeRole('Administrador'),
];

// GET /api/reportes/contratos/pdf?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
router.get('/pdf', protegerAdmin, descargarReporteContratos);

export default router;
