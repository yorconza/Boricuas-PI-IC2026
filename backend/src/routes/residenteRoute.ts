/**
 * ============================================================================
 * Archivo: residenteRoute.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Define las rutas del módulo de Residentes (montadas en /api/residentes
 * desde server.ts):
 *
 *   GET    /api/residentes                           → sp_Residente_Listar
 *   POST   /api/residentes                           → sp_Residente_Insertar
 *   PUT    /api/residentes/:id                       → sp_Residente_Actualizar
 *   PATCH  /api/residentes/:id/changeEstadoResidente → sp_Residente_CambiarEstado
 *
 * Protección: JWT → 2FA → sesión + SET CONTEXT_INFO → rol Administrador.
 *
 * Se comunica con:
 *   - residentesControllers.ts (handler de cada ruta).
 *   - server.ts (montaje en /api/residentes).
 *
 * ============================================================================
 */
import { Router } from 'express';
import {
    getResidentes,
    createResidente,
    updateResidente,
    changeEstadoResidente
} from '../controllers/residentesControllers.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const residente: Router = Router();

// Protección JWT (cambio de seguridad):
// ANTES estas rutas eran públicas — cualquiera que conociera un id_usuario_actual
// de administrador podía listar/crear residentes sin haber iniciado sesión.
// AHORA cada ruta exige: 1) token Bearer válido (401 si falta/expira),
// 2) verificación 2FA completada (403 si no), 3) sesión activa en BD
// (401 por inactividad), 4) rol Administrador (403).
const protegerAdmin = [authenticateToken, require2FA, validateSessionAndSetContext, authorizeRole('Administrador')];

residente.get('/', protegerAdmin, getResidentes);
residente.post('/', protegerAdmin, createResidente);
residente.put('/:id', protegerAdmin, updateResidente);
residente.patch('/:id/changeEstadoResidente', protegerAdmin, changeEstadoResidente);

export default residente;
