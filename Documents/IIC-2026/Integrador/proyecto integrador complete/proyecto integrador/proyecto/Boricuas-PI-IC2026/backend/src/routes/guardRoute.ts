import { Router } from 'express';
import {
    getResumenVisitasHoy,
    getProximasVisitas,
    getVisitasEsperadas,
    getHistorialVisitas,
    getDetalleVisita,
    registrarIngresoVisitante
} from '../controllers/guardController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const guard: Router = Router();

// Protección JWT (mismo estándar que el resto de módulos):
// 1) token Bearer válido (401 si falta/expira),
// 2) verificación 2FA completada (403 si no),
// 3) sesión activa en BD + SET CONTEXT_INFO (401 por inactividad),
// 4) rol Guarda (403 si no corresponde).
const protegerGuarda = [authenticateToken, require2FA, validateSessionAndSetContext, authorizeRole('Guarda')];

// --- Dashboard ---
// GET /api/guard/dashboard/summary -> Resumen de tarjetas (pendientes/autorizadas/rechazadas hoy)
guard.get('/dashboard/summary', protegerGuarda, getResumenVisitasHoy);

// GET /api/guard/dashboard/upcoming -> Próximas visitas pendientes (widget lateral)
guard.get('/dashboard/upcoming', protegerGuarda, getProximasVisitas);

// --- Visitas ---
// GET /api/guard/visits/pending?search=... -> Visitas esperadas (Pendiente)
guard.get('/visits/pending', protegerGuarda, getVisitasEsperadas);

// GET /api/guard/visits/history?search=...&status=... -> Historial del día
guard.get('/visits/history', protegerGuarda, getHistorialVisitas);

// GET /api/guard/visits/:id -> Detalle de una visita (modal)
guard.get('/visits/:id', protegerGuarda, getDetalleVisita);

// PATCH /api/guard/visits/:id/status -> Autorizar / Rechazar visita
guard.patch('/visits/:id/status', protegerGuarda, registrarIngresoVisitante);

export default guard;
