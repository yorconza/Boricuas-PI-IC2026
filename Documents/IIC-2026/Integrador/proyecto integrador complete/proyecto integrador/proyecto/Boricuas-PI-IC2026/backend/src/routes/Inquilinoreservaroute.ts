import { Router } from 'express';
import {crearReserva,getMisReservas,getProximaReserva,getDetalleReserva,updateReserva} from '../controllers/Inquilinoreservacontroller.js';

import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const inquilinoReserva: Router = Router();

// Protección:
// 1) JWT válido
// 2) 2FA completado
// 3) Sesión activa en BD
// 4) Rol Inquilino
const protegerInquilino = [authenticateToken,require2FA,validateSessionAndSetContext,authorizeRole('Inquilino')];

// GET /api/inquilino/reservas/proxima
inquilinoReserva.get('/proxima', protegerInquilino, getProximaReserva);

// GET /api/inquilino/reservas
inquilinoReserva.get('/', protegerInquilino, getMisReservas);

// GET /api/inquilino/reservas/:id
inquilinoReserva.get('/:id', protegerInquilino, getDetalleReserva);

// POST /api/inquilino/reservas
inquilinoReserva.post('/', protegerInquilino, crearReserva);

// PATCH /api/inquilino/reservas/:id
inquilinoReserva.patch('/:id', protegerInquilino, updateReserva);

export default inquilinoReserva;