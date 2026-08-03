import { Router } from 'express';
import {
    getContratos,
    createContrato,
    updateContrato
} from '../controllers/contractoController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const contrato: Router = Router();

// Protección JWT (cambio de seguridad):
// ANTES estas rutas eran públicas — cualquiera que conociera un id_usuario_actual
// de administrador podía listar/crear contratos sin haber iniciado sesión.
// AHORA cada ruta exige: 1) token Bearer válido (401 si falta/expira),
// 2) verificación 2FA completada (403 si no), 3) sesión activa en BD
// (401 por inactividad), 4) rol Administrador (403).
const protegerAdmin = [authenticateToken, require2FA, validateSessionAndSetContext, authorizeRole('Administrador')];

contrato.get('/', protegerAdmin, getContratos);
contrato.post('/', protegerAdmin, createContrato);
contrato.put('/:id', protegerAdmin, updateContrato);

export default contrato;
