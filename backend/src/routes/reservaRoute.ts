import {Router} from 'express';
import{
    getReservasHoy,
    getDetalleReserva,
    getEstadisticasMensuales,
    getHistorialReservas, 
    createReserva,
    updateReserva,
    cancelarReserva
} from '../controllers/reservaController.js'

const reserva: Router = Router();

reserva.get('/hoy', getReservasHoy);
reserva.get('/', getHistorialReservas);
reserva.get('/estadisticas', getEstadisticasMensuales);
reserva.get('/:id', getDetalleReserva);
reserva.post('/', createReserva);
reserva.put('/:id', updateReserva);
reserva.patch('/:id/cancelar', cancelarReserva);

export default reserva