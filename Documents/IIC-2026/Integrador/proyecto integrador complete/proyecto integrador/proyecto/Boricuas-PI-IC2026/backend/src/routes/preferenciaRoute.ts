import { Router } from 'express';
import { getPreferencias, actualizarPreferencias } from '../controllers/preferenciaController.js';

import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';

const preferenciaRoute: Router = Router();

// Protección: preferencias aplican a CUALQUIER rol autenticado (Inquilino,
// Guarda, Administrador) - por eso NO se agrega authorizeRole() aquí, a
// diferencia de inquilinoReserva.ts que sí restringe a 'Inquilino'.
// 1) JWT válido
// 2) 2FA completado
// 3) Sesión activa en BD
const protegerUsuario = [authenticateToken, require2FA, validateSessionAndSetContext];

// GET /api/preferencias
preferenciaRoute.get('/', protegerUsuario, getPreferencias);

// PATCH /api/preferencias
preferenciaRoute.patch('/', protegerUsuario, actualizarPreferencias);

export default preferenciaRoute;
