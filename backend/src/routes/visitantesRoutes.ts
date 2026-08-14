/**
 * ============================================================================
 * Archivo: visitantesRoutes.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Define las rutas del módulo de control de visitas del panel ADMIN
 * (montadas en /api/visitas desde server.ts):
 *
 *   GET /api/visitas/hoy          → sp_ListarVisitasDelDia (visitas de HOY)
 *   GET /api/visitas/historial    → sp_ListarHistorialVisitantes (paginado)
 *   GET /api/visitas/detalle/:id  → sp_ObtenerDetalleVisitante
 *
 * Protección:
 *   - /hoy y /detalle/:id: Administrador | Guarda (los SPs también validan rol).
 *   - /historial: SOLO Administrador. El middleware authorizeRole ya rechaza
 *     con 403 a otros roles; además el controlador traduce el RAISERROR del
 *     SP en HTTP 403 como red de seguridad.
 *
 * Usa la misma cadena de middlewares que el resto de módulos:
 * JWT (401) → 2FA verificado (403) → sesión activa + SET CONTEXT_INFO (401)
 * → authorizeRole (403).
 *
 * ============================================================================
 */
import { Router } from 'express';
import {
    getVisitasDelDia,
    getHistorialVisitantes,
    getDetalleVisitante
} from '../controllers/visitantesController.js';
import { authenticateToken, require2FA } from '../middlewares/auth.js';
import { validateSessionAndSetContext } from '../middlewares/session.js';
import { authorizeRole } from '../middlewares/roles.js';

const visitantes: Router = Router();

// Cadena de protección estándar (sin authorizeRole, que se agrega por ruta).
const proteger = [
    authenticateToken,
    require2FA,
    validateSessionAndSetContext,
];

// /hoy y /detalle/:id → Guardas y Administradores (los SPs aceptan ambos roles).
const protegerAdminYGuarda = [...proteger, authorizeRole('Administrador', 'Guarda')];

// /historial → solo Administradores (sp_ListarHistorialVisitantes).
const protegerAdmin = [...proteger, authorizeRole('Administrador')];

// GET /api/visitas/hoy?busqueda=...&estado=... → Visitas de HOY en cualquier
// estado (Pendiente/Autorizado/Rechazado).
visitantes.get('/hoy', protegerAdminYGuarda, getVisitasDelDia);

// GET /api/visitas/historial?busqueda=...&estado=...&fechaInicio=...&fechaFin=...&pageNumber=1&pageSize=50
visitantes.get('/historial', protegerAdmin, getHistorialVisitantes);

// GET /api/visitas/detalle/:id → Detalle de una visita (modal/drawer)
visitantes.get('/detalle/:id', protegerAdminYGuarda, getDetalleVisitante);

export default visitantes;
