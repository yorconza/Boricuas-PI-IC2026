import { Router } from 'express';
import { 
  obtenerReportePagosPDF, 
  obtenerReportePagosJSON,
  obtenerReporteVisitasPDF,   // <-- Importado
  obtenerReporteVisitasJSON   // <-- Importado
} from '../controllers/reportesController.js';

const router = Router();

// ==========================================
// Rutas de Reportes de Pagos
// ==========================================
// Ruta para descargar/ver el PDF de pagos
router.get('/reportes/pagos/pdf', obtenerReportePagosPDF);

// Ruta para consultar la data de pagos en JSON
router.get('/reportes/pagos/data', obtenerReportePagosJSON);

// ==========================================
// Rutas de Reportes de Visitas
// ==========================================
// Ruta para descargar/ver el PDF de visitas
router.get('/reportes/visitas/pdf', obtenerReporteVisitasPDF);

// Ruta para consultar la data de visitas en JSON
router.get('/reportes/visitas/data', obtenerReporteVisitasJSON);

export default router;