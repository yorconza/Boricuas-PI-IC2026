/**
 * ============================================================================
 * Rutas: authRoutes.ts
 * ============================================================================
 * Públicas (sin JWT ni 2FA):
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/recuperar-solicitar      → solicita enlace de recuperación
 *   POST /api/auth/recuperar-restablecer    → valida token y cambia la contraseña
 *
 * 2FA (requieren token — el temporal del login es suficiente, NO exigen
 *      verificación 2FA previa):
 *   POST /api/auth/2fa/send     → genera y envía el código al correo
 *   POST /api/auth/2fa/verify   → valida el código → JWT definitivo
 *
 * Protegidas (authenticateToken + validateSessionAndSetContext):
 *   POST /api/auth/logout       (se permite sin 2FA para poder salir)
 *   GET  /api/auth/me           (se permite sin 2FA: devuelve 2faVerified para
 *                                 que el frontend decida si redirigir a /2fa)
 *
 * ============================================================================
 */
import { Router } from 'express';
import {
    register,
    login,
    send2FACode,
    verify2FACode,
    logout,
    getMe,
    solicitarRecuperacion,
    restablecerContrasena,
} from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';

const authRoutes: Router = Router();

// ---------- Rutas públicas ----------
// Recuperación de contraseña: públicas a propósito (el usuario NO tiene sesión
// cuando olvidó su contraseña). No requieren JWT ni 2FA.
authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.post('/recuperar-solicitar', solicitarRecuperacion);
authRoutes.post('/recuperar-restablecer', restablecerContrasena);

// ---------- Rutas 2FA (token válido + sesión activa, SIN requerir 2FA) ----------
authRoutes.post('/2fa/send', authenticateToken, validateSessionAndSetContext, send2FACode);
authRoutes.post('/2fa/verify', authenticateToken, validateSessionAndSetContext, verify2FACode);

// ---------- Rutas protegidas (token válido + sesión activa) ----------
// logout y me NO exigen 2FA a propósito: el usuario debe poder salir o consultar
// su estado aunque aún no haya verificado el código.
authRoutes.post('/logout', authenticateToken, validateSessionAndSetContext, logout);
authRoutes.get('/me', authenticateToken, validateSessionAndSetContext, getMe);

export default authRoutes;
