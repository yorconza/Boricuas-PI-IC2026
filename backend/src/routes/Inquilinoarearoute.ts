/**
 * ============================================================================
 * Archivo: Inquilinoarearoute.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Define las rutas de Áreas para Inquilinos (montadas en /api/inquilino/areas
 * desde server.ts):
 *
 *   GET /api/inquilino/areas                → sp_ListarAreasDisponibles
 *   GET /api/inquilino/areas/:id/horarios   → sp_ListarHorariosDisponibles
 *
 * Protección: JWT → 2FA → sesión + SET CONTEXT_INFO → rol Inquilino.
 *
 * Se comunica con:
 *   - Inquilinoareacontroller.ts (handler de cada ruta).
 *   - server.ts (montaje en /api/inquilino/areas).
 *
 * ============================================================================
 */
import { Router } from 'express';
import { getAreasDisponibles, getHorariosDisponibles } from '../controllers/Inquilinoareacontroller.js';

import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const inquilinoArea: Router = Router();

// Protección:
// 1) JWT válido
// 2) 2FA completado
// 3) Sesión activa en BD
// 4) Rol Inquilino
const protegerInquilino = [authenticateToken,require2FA,validateSessionAndSetContext,authorizeRole('Inquilino')];

// GET /api/inquilino/areas
inquilinoArea.get('/', protegerInquilino, getAreasDisponibles);

// GET /api/inquilino/areas/:id/horarios?fecha=YYYY-MM-DD
// Intervalos OCUPADOS del día (todas las reservas activas, cualquier inquilino).
inquilinoArea.get('/:id/horarios', protegerInquilino, getHorariosDisponibles);

export default inquilinoArea;