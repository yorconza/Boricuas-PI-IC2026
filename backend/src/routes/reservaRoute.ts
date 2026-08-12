import { Router } from 'express';
import {
    getReservasHoy,
    getEstadisticasMensuales,
    getHistorialReservas,
    createReserva,
    updateReserva,
    cancelarReserva
} from '../controllers/reservaController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const reserva: Router = Router();

// Protección JWT (cambio de seguridad):
// ANTES estas rutas eran públicas — cualquiera que conociera un id_usuario_actual
// de administrador podía listar/crear reservas sin haber iniciado sesión.
// AHORA cada ruta exige: 1) token Bearer válido (401 si falta/expira),
// 2) verificación 2FA completada (403 si no), 3) sesión activa en BD
// (401 por inactividad), 4) rol Administrador (403).
const protegerAdmin = [authenticateToken, require2FA, validateSessionAndSetContext, authorizeRole('Administrador')];

// 1. Rutas específicas GET
// GET /api/reservas -> Obtiene TODAS las reservas (para el listado general / DataContext)
reserva.get('/', protegerAdmin, getHistorialReservas);

// GET /api/reservas/hoy -> Obtiene solo las reservas del día actual
reserva.get('/hoy', protegerAdmin, getReservasHoy);

// GET /api/reservas/estadisticas -> Estadísticas para los KPI
reserva.get('/estadisticas', protegerAdmin, getEstadisticasMensuales);

// 2. Ruta dinámica GET con :id
// reserva.get('/:id', protegerAdmin, getDetalleReserva);

// 3. Modificaciones (POST, PUT, PATCH)
reserva.post('/', protegerAdmin, createReserva);
reserva.put('/:id', protegerAdmin, updateReserva);
reserva.patch('/:id/cancelar', protegerAdmin, cancelarReserva);

export default reserva;
