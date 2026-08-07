// src/routes/reporteReservaRoute.ts
import { Router } from 'express';
import { descargarReporteReservas } from '../controllers/reservaReporteController.js';

const router = Router();

// GET /api/reportes/reservas/pdf
router.get('/reservas/pdf', descargarReporteReservas);

export default router;