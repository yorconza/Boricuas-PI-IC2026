import { Router } from 'express';
import {
  getVisitasAutorizadas,
  createVisitante,
  updateVisitante,
  desactivarVisitante
} from '../controllers/visitantesController.js'; // Mantén la extensión .js si tu proyecto usa ES Modules en Node

const router = Router();

// GET /api/visitantes (soporta query params: ?busqueda=...&estado=...&solo_hoy=...)
router.get('/', getVisitasAutorizadas);

// POST /api/visitantes
router.post('/', createVisitante);

// PUT /api/visitantes/:id
router.put('/:id', updateVisitante);

// PATCH /api/visitantes/:id/desactivar
router.patch('/:id/desactivar', desactivarVisitante);

export default router;