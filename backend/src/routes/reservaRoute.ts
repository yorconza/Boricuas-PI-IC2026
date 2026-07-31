import { Router } from 'express';
import {
    getReservasHoy,
    getEstadisticasMensuales,
    getHistorialReservas, 
    createReserva,
    updateReserva,
    cancelarReserva
} from '../controllers/reservaController.js';

const reserva: Router = Router();

// 1. Rutas específicas GET
// GET /api/reservas -> Obtiene TODAS las reservas (para el listado general / DataContext)
reserva.get('/', getHistorialReservas);

// GET /api/reservas/hoy -> Obtiene solo las reservas del día actual
reserva.get('/hoy', getReservasHoy);

// GET /api/reservas/estadisticas -> Estadísticas para los KPI
reserva.get('/estadisticas', getEstadisticasMensuales);

// 2. Ruta dinámica GET con :id
// reserva.get('/:id', getDetalleReserva);

// 3. Modificaciones (POST, PUT, PATCH)
reserva.post('/', createReserva);
reserva.put('/:id', updateReserva);
reserva.patch('/:id/cancelar', cancelarReserva);

export default reserva;