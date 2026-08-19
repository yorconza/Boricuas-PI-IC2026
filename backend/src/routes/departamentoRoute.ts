/**
 * ============================================================================
 * Archivo: departamentoRoute.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Define las rutas del módulo de Departamentos (montadas en /api/departamentos
 * desde server.ts):
 *
 *   GET    /api/departamentos             → sp_Departamento_Listar
 *   POST   /api/departamentos             → sp_Departamento_Insertar
 *   PUT    /api/departamentos/:id         → sp_Departamento_Actualizar
 *   PATCH  /api/departamentos/:id/desactivar → sp_Departamento_CambiarEstado
 *   PATCH  /api/departamentos/:id/reactivar  → sp_Departamento_CambiarEstado
 *
 * Protección: JWT → 2FA → sesión + SET CONTEXT_INFO → rol Administrador.
 *
 * Se comunica con:
 *   - departamentoController.ts (handler de cada ruta).
 *   - server.ts (montaje en /api/departamentos).
 *
 * ============================================================================
 */
import { Router } from 'express';
import {
    getDepartamentos,
    createDepartamento,
    updateDepartamento,
    changeEstadoDepartamento
} from '../controllers/departamentoController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const departamento: Router = Router();

// Protección JWT (mismo patrón que las demás rutas del admin):
// 1) token Bearer válido (401), 2) verificación 2FA completada (403),
// 3) sesión activa en BD (401), 4) rol Administrador (403).
const protegerAdmin = [authenticateToken, require2FA, validateSessionAndSetContext, authorizeRole('Administrador')];

departamento.get('/', protegerAdmin, getDepartamentos);
departamento.post('/', protegerAdmin, createDepartamento);
departamento.put('/:id', protegerAdmin, updateDepartamento);
departamento.patch('/:id/desactivar', protegerAdmin, changeEstadoDepartamento);
departamento.patch('/:id/reactivar', protegerAdmin, changeEstadoDepartamento);

export default departamento;
