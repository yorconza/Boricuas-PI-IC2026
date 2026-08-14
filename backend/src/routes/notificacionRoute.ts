/**
 * ============================================================================
 * Archivo: notificacionRoute.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Define las rutas del módulo de Notificaciones (montadas en /api/notificaciones
 * desde server.ts):
 *
 *   GET   /api/notificaciones               → sp_ListarNotificaciones
 *   PATCH /api/notificaciones/:id/leida     → sp_MarcarNotificacionLeida
 *   PATCH /api/notificaciones/marcar-todas  → sp_MarcarTodasNotificacionesLeidas
 *
 * Protección:
 *   Los TRES roles (Administrador, Guarda, Inquilino) consultan y marcan sus
 *   propias notificaciones, así que se usa la cadena estándar:
 *   JWT (401) → 2FA verificado (403) → sesión activa + SET CONTEXT_INFO (401)
 *   → authorizeRole (403). El id_usuario se toma SIEMPRE del JWT.
 *
 * ============================================================================
 */
import { Router } from 'express';
import {
    getNotificaciones,
    marcarLeida,
    marcarTodasLeidas
} from '../controllers/notificacionController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const notificaciones: Router = Router();

// Cadena de protección estándar (todos los roles pueden ver sus notificaciones).
const proteger = [
    authenticateToken,
    require2FA,
    validateSessionAndSetContext,
    authorizeRole('Administrador', 'Guarda', 'Inquilino'),
];

// GET /api/notificaciones?leida=0&limite=20
notificaciones.get('/', proteger, getNotificaciones);

// PATCH /api/notificaciones/marcar-todas (se define antes de /:id para evitar
// que "marcar-todas" se interprete como un id de notificación).
notificaciones.patch('/marcar-todas', proteger, marcarTodasLeidas);

// PATCH /api/notificaciones/:id/leida
notificaciones.patch('/:id/leida', proteger, marcarLeida);

export default notificaciones;
