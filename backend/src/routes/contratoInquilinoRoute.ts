/**
 * ============================================================================
 * Archivo: contratoInquilinoRoute.ts
 * ============================================================================
 *
 * Rutas del módulo "Mis Contratos" (panel Inquilino). Se montan en el mismo
 * prefijo /api/contratos que la ruta de administración (contratoRoute.ts),
 * pero sin colisiones de path:
 *
 *   GET /api/contratos/mis-contratos  → contratos del inquilino
 *   GET /api/contratos/:id/pagos      → historial de pagos de un contrato
 *
 * (La ruta admin solo define GET /, POST / y PUT /:id, así que no hay choque.)
 *
 * Protección: cadena estándar del proyecto (JWT → 2FA → sesión +
 * SET CONTEXT_INFO) + rol Inquilino. El id_usuario SIEMPRE se toma del JWT.
 *
 * ============================================================================
 */
import { Router } from 'express';
import { getMisContratos, getPagosContrato } from '../controllers/contratoInquilinoController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const contratoInquilino: Router = Router();

// Cadena de protección estándar + rol Inquilino.
const protegerInquilino = [
    authenticateToken,
    require2FA,
    validateSessionAndSetContext,
    authorizeRole('Inquilino'),
];

// GET /api/contratos/mis-contratos
contratoInquilino.get('/mis-contratos', protegerInquilino, getMisContratos);

// GET /api/contratos/:id/pagos
contratoInquilino.get('/:id/pagos', protegerInquilino, getPagosContrato);

export default contratoInquilino;
