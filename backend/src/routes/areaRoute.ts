/**
 * ============================================================================
 * Archivo: areaRoute.ts
 * ============================================================================
 *
 * Rutas del módulo de Áreas Comunes (SPs de CondominioDB, rol Administrador):
 *
 *   GET    /api/areas            → sp_ListarAreasComunes
 *   POST   /api/areas            → sp_CrearAreaComun      (multipart: campo 'imagen')
 *   PUT    /api/areas/:id        → sp_ActualizarAreaComun (multipart: campo 'imagen')
 *   PATCH  /api/areas/:id/activar     → sp_ActivarAreaComun
 *   PATCH  /api/areas/:id/desactivar  → sp_DesactivarAreaComun
 *
 * Subida de imágenes (MISMA lógica que los avatares de perfil en perfilRoute.ts):
 *   - Los archivos se guardan en backend/uploads/areas/ (subcarpeta propia dentro
 *     de uploads para orden y separación de los avatares).
 *   - La carpeta se resuelve con __dirname (backend/uploads/areas), NO con
 *     process.cwd(), para que la URL /uploads/areas/... que sirve
 *     express.static en server.ts siempre resuelva.
 *   - Solo se aceptan imágenes (JPG, PNG, GIF, WEBP) de hasta 2 MB.
 *   - Los errores de multer (tamaño/tipo) se convierten en JSON amigables.
 *   - La validación de "magic bytes" y el borrado de la imagen anterior ocurren
 *     en el controlador (misma lógica que perfilController).
 *
 * Protección (mismo estándar que el resto de módulos):
 *   JWT (401) → 2FA verificado (403) → sesión activa + SET CONTEXT_INFO (401)
 *   → authorizeRole('Administrador') (403). Los SPs también validan el rol
 *   internamente (el controlador traduce su RAISERROR a HTTP 403).
 * ============================================================================
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    getAreas,
    createArea,
    updateArea,
    activateArea,
    deactivateArea
} from '../controllers/areasController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const router: Router = Router();

// __dirname en ESM (el backend usa "type": "module")
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carpeta donde se guardan las imágenes de las áreas comunes.
// NOTA: __dirname es src/routes, por lo que se necesitan DOS niveles hacia
// arriba para llegar a la raíz del backend. server.ts sirve como estático
// path.join(__dirname, 'uploads') → backend/uploads, así que las imágenes deben
// guardarse en backend/uploads/areas para que la URL /uploads/areas/... resuelva.
const AREAS_IMG_DIR = path.join(__dirname, '..', '..', 'uploads', 'areas');
const MAX_AREA_IMG_BYTES = 2 * 1024 * 1024; // 2 MB (mismo límite que los avatares)
const MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Asegura que la carpeta exista (se crea al arrancar el servidor)
fs.mkdirSync(AREAS_IMG_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Configuración de multer (diskStorage) — misma lógica que perfilController.ts
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, AREAS_IMG_DIR);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `area-${uniqueSuffix}${ext}`);
    }
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    if (MIME_PERMITIDOS.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo imágenes (JPG, PNG, GIF, WEBP).'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_AREA_IMG_BYTES }
});

/**
 * Middleware que ejecuta multer y convierte sus errores en respuestas JSON
 * amigables (ej: archivo demasiado grande o tipo no permitido).
 */
const multerArea = (req: Request, res: Response, next: NextFunction) => {
    upload.single('imagen')(req, res, (error: unknown) => {
        if (error) {
            if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'La imagen supera el tamaño máximo de 2 MB' });
            }
            const mensaje = error instanceof Error ? error.message : 'Error al subir la imagen';
            return res.status(400).json({ message: mensaje });
        }
        next();
    });
};

// Cadena de protección estándar (SPs validan rol Administrador internamente).
const protegerAdmin = [
    authenticateToken,
    require2FA,
    validateSessionAndSetContext,
    authorizeRole('Administrador'),
];

// 1. Obtener todas las áreas comunes
router.get('/', protegerAdmin, getAreas);

// 2. Crear una nueva área común (acepta archivo 'imagen' en FormData)
router.post('/', [...protegerAdmin, multerArea], createArea);

// 3. Actualizar información de un área común (acepta archivo 'imagen' en FormData)
router.put('/:id', [...protegerAdmin, multerArea], updateArea);

// 4. Cambiar estado de un área común (Activar / Desactivar)
router.patch('/:id/activar', protegerAdmin, activateArea);
router.patch('/:id/desactivar', protegerAdmin, deactivateArea);

export default router;
