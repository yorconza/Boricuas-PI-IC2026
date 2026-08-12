// backend/src/routes/areaRoute.ts

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    getAreas,
    createArea,
    updateArea,
    activateArea,
    deactivateArea
} from '../controllers/areasController.js';

const router: Router = Router();

// Garantizar que exista el directorio uploads/areas
const uploadDir = path.join(process.cwd(), 'uploads', 'areas');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración del almacenamiento con Multer
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `area-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5 MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen (PNG, JPG, WEBP, etc.).'));
        }
    }
});

// 1. Obtener todas las áreas comunes
router.get('/', getAreas);

// 2. Crear una nueva área común (acepta archivo 'imagen' en FormData)
router.post('/', upload.single('imagen'), createArea);

// 3. Actualizar información de un área común (acepta archivo 'imagen' en FormData)
router.put('/:id', upload.single('imagen'), updateArea);

// 4. Cambiar estado de un área común (Activar / Desactivar)
router.patch('/:id/activar', activateArea);
router.patch('/:id/desactivar', deactivateArea);

export default router;