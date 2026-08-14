/**
 * ============================================================================
 * Archivo: pagosRoute.ts
 * ============================================================================
 *
 * Rutas del módulo de Pagos (montadas en /api/pagos desde server.ts):
 *
 *   GET  /api/pagos/metricas   → sp_ObtenerMetricasPagos      (Administrador)
 *   GET  /api/pagos/reporte    → sp_ReportePagos + PDF        (Administrador)
 *   GET  /api/pagos            → listado unificado + filtros   (Administrador)
 *   POST /api/pagos/manual     → sp_RegistrarPago (admin.)     (Administrador)
 *   POST /api/pagos/contrato   → sp_RegistrarPagoContrato      (Inquilino)
 *
 * Seguridad (cadena estándar del proyecto):
 *   JWT válido (401) → 2FA completado (403) → sesión activa en BD +
 *   SET CONTEXT_INFO (401) → authorizeRole (403).
 *   - Las operaciones de gestión (listar, métricas, pago manual, reporte)
 *     son SOLO de Administrador.
 *   - El pago de mensualidad de un contrato es SOLO de Inquilino (el SP
 *     valida que sea el dueño del contrato).
 *
 * Nota: el endpoint de reporte PDF reutiliza `obtenerReportePagosPDF` del
 * módulo de Reportes (reportesController.ts), que ya ejecuta sp_ReportePagos
 * y genera el PDF con PdfService — así no se duplica la lógica.
 *
 * ============================================================================
 */
import { Router } from 'express';
import {
    getPagos,
    getMetricasPagos,
    createPago,
    registrarPagoContrato,
} from '../controllers/pagosController.js';
import { obtenerReportePagosPDF } from '../controllers/reportesController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const pagos: Router = Router();

// Cadena de protección estándar.
const proteger = [authenticateToken, require2FA, validateSessionAndSetContext];

// Solo el Administrador gestiona los pagos (listar, métricas, manual, reporte).
const protegerAdmin = [...proteger, authorizeRole('Administrador')];

// Solo el Inquilino paga la mensualidad de sus contratos.
const protegerInquilino = [...proteger, authorizeRole('Inquilino')];

// 1. Métricas / tarjetas resumen (antes de la ruta general para evitar colisión).
pagos.get('/metricas', protegerAdmin, getMetricasPagos);

// 2. Reporte exportable en PDF (sp_ReportePagos + PdfService).
pagos.get('/reporte', protegerAdmin, obtenerReportePagosPDF);

// 3. Listado unificado de pagos con filtros y paginación.
pagos.get('/', protegerAdmin, getPagos);

// 4. Registro de pago administrativo (sin reserva ni contrato).
pagos.post('/manual', protegerAdmin, createPago);

// 5. Pago de mensualidad de contrato (inquilino dueño del contrato).
pagos.post('/contrato', protegerInquilino, registrarPagoContrato);

export default pagos;
