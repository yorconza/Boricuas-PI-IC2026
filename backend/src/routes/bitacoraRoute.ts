/**
 * ============================================================================
 * Archivo: bitacoraRoute.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Define la ruta GET /api/bitacora del módulo de auditoría (Bitácora).
 * Solo el rol Administrador puede consultarla: usa la misma cadena de
 * middlewares que el resto de rutas del panel admin (JWT + 2FA + sesión
 * activa + authorizeRole('Administrador')).
 *
 * Quién la utiliza
 * - El panel de Administrador (BitacoraPage → bitacoraService) para listar
 *   los eventos de la tabla Bitacora con filtros y paginación.
 *
 * ============================================================================
 */
import { Router } from 'express';
import { getBitacora } from '../controllers/bitacoraController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const bitacora: Router = Router();

// Protección JWT (misma cadena que el resto de rutas admin):
// 1) token Bearer válido (401), 2) verificación 2FA completada (403),
// 3) sesión activa en BD (401), 4) rol Administrador (403).
const protegerAdmin = [authenticateToken, require2FA, validateSessionAndSetContext, authorizeRole('Administrador')];

// GET /api/bitacora -> Consulta de auditoría paginada con filtros
bitacora.get('/', protegerAdmin, getBitacora);

export default bitacora;
