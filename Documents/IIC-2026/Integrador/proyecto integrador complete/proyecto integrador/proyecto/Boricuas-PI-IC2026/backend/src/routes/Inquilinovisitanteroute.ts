import { Router } from 'express';
import {
    registrarVisitante,
    getMisVisitantes,
    getProximaVisita,
    getDetalleVisitante,
    cancelarVisitante
} from '../controllers/Inquilinovisitantecontroller.js';

import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const inquilinoVisitante: Router = Router();

// Protección:
// 1) JWT válido
// 2) 2FA completado
// 3) Sesión activa en BD
// 4) Rol Inquilino
const protegerInquilino = [authenticateToken,require2FA,validateSessionAndSetContext,authorizeRole('Inquilino')];

// GET /api/inquilino/visitantes/proxima
inquilinoVisitante.get('/proxima', protegerInquilino, getProximaVisita);

// GET /api/inquilino/visitantes
inquilinoVisitante.get('/', protegerInquilino, getMisVisitantes);

// GET /api/inquilino/visitantes/:id
inquilinoVisitante.get('/:id', protegerInquilino, getDetalleVisitante);

// POST /api/inquilino/visitantes
inquilinoVisitante.post('/', protegerInquilino, registrarVisitante);

// PATCH /api/inquilino/visitantes/:id
inquilinoVisitante.patch('/:id', protegerInquilino, cancelarVisitante);

export default inquilinoVisitante;