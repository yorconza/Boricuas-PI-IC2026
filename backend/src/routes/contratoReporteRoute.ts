import { Router } from 'express';
import { descargarReporteContratos } from '../controllers/contratoReporteController.js';

const router = Router();

// Como app.ts ya tiene '/api/reportes/contratos', aquí solo pones '/pdf'
router.get('/pdf', descargarReporteContratos);

export default router;