import { Router } from 'express';
import { getAreasDisponibles } from '../controllers/Inquilinoareacontroller.js';

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

export default inquilinoArea;