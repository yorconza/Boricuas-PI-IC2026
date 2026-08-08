import { Router } from 'express';
import {
    getAreas,
    createArea,
    updateArea,
    activateArea,
    deactivateArea
} from '../controllers/areasController.js';

const router: Router = Router();

// 1. Obtener todas las áreas comunes
router.get('/', getAreas);

// 2. Crear una nueva área común
router.post('/', createArea);

// 3. Actualizar información de un área común
router.put('/:id', updateArea);

// 4. Cambiar estado de un área común (Activar / Desactivar)
router.patch('/:id/activar', activateArea);
router.patch('/:id/desactivar', deactivateArea);

export default router;