// src/routes/reporteReservaRoute.ts
import { Router } from 'express';
import { descargarReporteReservas } from '../controllers/reservaReporteController.js';

const router = Router();

// Como app.ts ya tiene '/api/reportes/reservas', aquí solo pones '/pdf'
router.get('/pdf', descargarReporteReservas); 

export default router;