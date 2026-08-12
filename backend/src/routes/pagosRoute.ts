import { Router } from 'express';
import {
    getPagos,
    getMetricasPagos,
    createPago
} from '../controllers/pagosController.js';

const pagosRoute: Router = Router();

/* ============================================================================
   RUTAS DEL MÓDULO DE PAGOS
   ============================================================================ */

// 1. Rutas específicas (GET) - Deben ir ANTES de las rutas dinámicas/generales
pagosRoute.get('/metricas', getMetricasPagos);

// 2. Rutas generales (GET)
pagosRoute.get('/', getPagos);

// 3. Registro de pago (POST)
pagosRoute.post('/', createPago);

export default pagosRoute;