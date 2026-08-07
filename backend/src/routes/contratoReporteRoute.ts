import { Router } from 'express';
import { descargarReporteContratos } from '../controllers/contratoReporteController.js';

const router = Router();

// GET /api/contratos/reporte/pdf  (o según cómo lo montes en app.ts)
router.get('/reporte/pdf', descargarReporteContratos);

export default router;