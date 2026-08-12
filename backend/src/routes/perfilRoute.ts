/**
 * ============================================================================
 * Rutas: perfilRoute.ts
 * ============================================================================
 * Protegidas (authenticateToken + require2FA + validateSessionAndSetContext):
 *   GET  /api/perfil                      → obtenerPerfil
 *   PUT  /api/perfil                      → actualizarPerfil
 *   PUT  /api/perfil/cambiar-contrasena   → cambiarContrasena
 *   POST /api/perfil/upload-avatar        → multerAvatar + uploadAvatar
 *
 * Nota: los paths son exactos (raíz "/", "/cambiar-contrasena",
 * "/upload-avatar") y con métodos distintos, por lo que el orden de
 * declaración no genera conflictos.
 * ============================================================================
 */
import { Router } from 'express';
import {
    obtenerPerfil,
    actualizarPerfil,
    cambiarContrasena,
    multerAvatar,
    uploadAvatar,
} from '../controllers/perfilController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';

const perfilRoute: Router = Router();

// Protección JWT (mismo estándar que el resto de módulos):
// 1) token Bearer válido (401 si falta/expira),
// 2) verificación 2FA completada (403 si no),
// 3) sesión activa en BD + SET CONTEXT_INFO (401 por inactividad).
const protegerPerfil = [authenticateToken, require2FA, validateSessionAndSetContext];

// --- Perfil ---
perfilRoute.get('/', protegerPerfil, obtenerPerfil);
perfilRoute.put('/', protegerPerfil, actualizarPerfil);

// --- Contraseña ---
perfilRoute.put('/cambiar-contrasena', protegerPerfil, cambiarContrasena);

// --- Avatar (multipart/form-data) ---
perfilRoute.post('/upload-avatar', protegerPerfil, multerAvatar, uploadAvatar);

export default perfilRoute;
