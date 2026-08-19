/**
 * ============================================================================
 * Archivo: personalRoute.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Define las rutas del módulo de Personal (montadas en /api/personal
 * desde server.ts):
 *
 *   GET    /api/personal              → sp_Personal_Listar
 *   POST   /api/personal              → sp_Personal_Insertar
 *   PUT    /api/personal/:id          → sp_Personal_Actualizar
 *   PATCH  /api/personal/:id/desactivar → sp_Personal_Desactivar
 *   PATCH  /api/personal/:id/reactivar  → sp_Personal_Reactivar
 *
 * Protección: JWT → 2FA → sesión + SET CONTEXT_INFO → rol Administrador.
 *
 * Se comunica con:
 *   - personalController.ts (handler de cada ruta).
 *   - server.ts (montaje en /api/personal).
 *
 * ============================================================================
 */
import { Router } from 'express';
import {
    getPersonal,
    createPersonal,
    updatePersonal,
    deactivatePersonal,
    reactivatePersonal
} from '../controllers/personalController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const personal: Router = Router();

// Protección JWT (cambio de seguridad):
// ANTES estas rutas eran públicas — cualquiera que conociera un id_usuario_actual
// de administrador podía listar/crear personal sin haber iniciado sesión.
// AHORA cada ruta exige: 1) token Bearer válido (401 si falta/expira),
// 2) verificación 2FA completada (403 si no), 3) sesión activa en BD
// (401 por inactividad), 4) rol Administrador (403).
const protegerAdmin = [authenticateToken, require2FA, validateSessionAndSetContext, authorizeRole('Administrador')];

personal.get('/', protegerAdmin, getPersonal);
personal.post('/', protegerAdmin, createPersonal);
personal.put('/:id', protegerAdmin, updatePersonal);
personal.patch('/:id/desactivar', protegerAdmin, deactivatePersonal);
personal.patch('/:id/reactivar', protegerAdmin, reactivatePersonal);

export default personal;
