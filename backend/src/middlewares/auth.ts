/**
 * ============================================================================
 * Middleware: auth.ts
 * ============================================================================
 * authenticateToken
 *   Verifica el JWT recibido en el header:
 *     Authorization: Bearer <token>
 *   Si es válido, adjunta el payload decodificado a `req.user` y continúa
 *   con la siguiente función (next()).
 *
 * require2FA
 *   DEBE ejecutarse DESPUÉS de authenticateToken en las rutas sensibles.
 *   Rechaza con 403 los tokens que aún no verificaron el 2FA
 *   (2faVerified !== true).
 *
 * Uso:
 *   router.post('/logout', authenticateToken, validateSessionAndSetContext, logout);
 *   router.get('/personal', authenticateToken, require2FA, validateSessionAndSetContext, getPersonal);
 * ============================================================================
 */
import { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import type { ConnectionPool } from 'mssql';
import dotenv from 'dotenv';

// Carga las variables de entorno ANTES de leer JWT_SECRET (independiente del orden de imports)
dotenv.config();

// Secret para firmar/verificar los JWT (definido en backend/.env)
const JWT_SECRET = process.env.JWT_SECRET || '';

if (!JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET no está definido en backend/.env — la autenticación no será segura.');
}

/**
 * Datos del usuario autenticado.
 * Se adjuntan a `req.user` después de pasar por authenticateToken
 * y provienen directamente del payload del JWT.
 */
export interface AuthUser {
    id_usuario: number;
    id_rol: number;
    nombre_rol: string;
    id_sesion: number;
    /** true solo si el JWT fue emitido después de verificar el código 2FA */
    // NOTA: la propiedad se declara entre comillas porque comienza con dígito.
    '2faVerified': boolean;
    /** Correo principal del usuario (los inquilinos reciben el código 2FA aquí) */
    correo?: string;
    /** Correo de contacto (Admin/Guarda reciben el código 2FA aquí) */
    correo_contacto?: string;
}

/**
 * Ampliación global del tipo Request de Express:
 *  - req.user → usuario autenticado (establecido por authenticateToken)
 *  - req.pool → pool de BD reutilizado (establecido por validateSessionAndSetContext,
 *               permite que el controlador use la MISMA conexión donde se ejecutó
 *               SET CONTEXT_INFO).
 */
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
            pool?: ConnectionPool;
        }
    }
}

/**
 * Middleware de autenticación JWT.
 * Lee el token del header `Authorization: Bearer <token>`, lo verifica
 * con el secret y guarda su payload en `req.user`.
 *
 * Respuestas de error:
 *  - 401 si falta el header, el token es inválido o está expirado.
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        // 1. Validar que exista el header Bearer
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No se proporcionó un token de acceso' });
        }

        // 2. Extraer el token
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token inválido' });
        }

        // 3. Verificar firma y expiración del JWT
        const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & AuthUser;

        if (!payload.id_usuario || !payload.id_sesion) {
            return res.status(401).json({ message: 'Token inválido' });
        }

        // 4. Adjuntar el usuario al request para los siguientes middlewares/controladores.
        //    Los tokens del login llevan 2faVerified: false; solo el flujo 2FA
        //    emite tokens con 2faVerified: true.
        req.user = {
            id_usuario: Number(payload.id_usuario),
            id_rol: Number(payload.id_rol ?? 0),
            nombre_rol: String(payload.nombre_rol ?? ''),
            id_sesion: Number(payload.id_sesion),
            '2faVerified': payload['2faVerified'] === true,
        };
        if (typeof payload.correo === 'string' && payload.correo) {
            req.user.correo = payload.correo;
        }
        if (typeof payload.correo_contacto === 'string' && payload.correo_contacto) {
            req.user.correo_contacto = payload.correo_contacto;
        }

        return next();
    } catch (error) {
        // Token expirado o firma inválida
        const mensaje = error instanceof jwt.TokenExpiredError
            ? 'Token expirado'
            : 'Token inválido o expirado';
        return res.status(401).json({ message: mensaje });
    }
};

/**
 * Middleware require2FA.
 * Exige que el JWT ya tenga 2faVerified = true (verificación 2FA completada).
 * DEBE ejecutarse DESPUÉS de authenticateToken y antes de las rutas sensibles.
 *  - 401 si no hay usuario autenticado.
 *  - 403 si el token es válido pero el usuario aún no verificó el 2FA.
 */
export const require2FA = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    if (req.user['2faVerified'] !== true) {
        return res.status(403).json({
            message: 'Se requiere la verificación 2FA para acceder a este recurso',
        });
    }

    return next();
};
