/**
 * ============================================================================
 * Middleware: roles.ts
 * ============================================================================
 * authorizeRole(...roles)
 *   Verifica que req.user.nombre_rol esté dentro de la lista de roles
 *   permitidos. DEBE ejecutarse después de authenticateToken
 *   (y opcionalmente de validateSessionAndSetContext).
 *
 * Uso:
 *   router.get('/ruta-admin',
 *     authenticateToken, validateSessionAndSetContext,
 *     authorizeRole('Administrador'),
 *     handler
 *   );
 * ============================================================================
 */
import { type NextFunction, type Request, type Response } from 'express';

/**
 * Devuelve un middleware que solo permite continuar si el rol del usuario
 * autenticado está dentro de los roles permitidos.
 *  - 401 si no hay usuario autenticado.
 *  - 403 si el rol no tiene permisos.
 */
export const authorizeRole = (...rolesPermitidos: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const rol = req.user?.nombre_rol;

        if (!rol) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        if (!rolesPermitidos.includes(rol)) {
            return res.status(403).json({
                message: 'No tiene permisos para realizar esta acción',
            });
        }

        return next();
    };
};
