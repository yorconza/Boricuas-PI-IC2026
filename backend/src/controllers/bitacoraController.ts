/**
 * ============================================================================
 * Controller: bitacoraController.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Expone el endpoint GET /api/bitacora (solo Administrador) que consulta el
 * procedimiento almacenado sp_ObtenerBitacora y devuelve los registros de
 * auditoría paginados con la estructura:
 *
 * {
 *   "pagina": 1,
 *   "limite": 50,
 *   "totalRegistros": 123,
 *   "totalPaginas": 3,
 *   "datos": [ ... ]
 * }
 *
 * Filtros (todos opcionales, vienen por query params):
 *   fechaInicio  → YYYY-MM-DD (se completa con 00:00:00)
 *   fechaFin     → YYYY-MM-DD (se completa con 23:59:59.999 para abarcar el día)
 *   tabla        → nombre de la tabla afectada
 *   operacion    → INSERT | UPDATE | DELETE | LOGIN | LOGOUT | EXPIRADA
 *   busqueda     → texto en descripción o en los JSON (dato_anterior/dato_nuevo)
 *   pagina       → número de página (default 1)
 *   limite       → registros por página (default 50, máx 200)
 *
 * NOTA: el filtro por id_usuario no se expone en el endpoint porque la interfaz
 * no muestra los ids de usuario (el admin no puede conocerlos); el SP
 * sp_ObtenerBitacora sigue aceptando @IdUsuario por si se necesita en el futuro.
 *
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';

export const getBitacora = async (req: Request, res: Response) => {
    try {
        const {
            fechaInicio,
            fechaFin,
            tabla,
            operacion,
            busqueda,
            pagina,
            limite
        } = req.query;

        // --- Paginación (valores seguros) ---
        const paginaActual = Math.max(1, Math.floor(Number(pagina) || 1));
        const limiteActual = Math.min(200, Math.max(1, Math.floor(Number(limite) || 50)));

        // --- Normalizar fechas ---
        // Si vienen solo como 'YYYY-MM-DD', se expanden para abarcar el día completo.
        let fechaInicioParam: string | null = null;
        if (fechaInicio) {
            const raw = String(fechaInicio);
            fechaInicioParam = raw.length <= 10 ? `${raw}T00:00:00` : raw;
        }
        let fechaFinParam: string | null = null;
        if (fechaFin) {
            const raw = String(fechaFin);
            fechaFinParam = raw.length <= 10 ? `${raw}T23:59:59.999` : raw;
        }

        const pool = await getConnection();
        const result = await pool?.request()
            .input('FechaInicio', sql.DateTime2, fechaInicioParam)
            .input('FechaFin', sql.DateTime2, fechaFinParam)
            .input('Tabla', sql.VarChar(50), tabla ? String(tabla) : null)
            .input('Operacion', sql.VarChar(10), operacion ? String(operacion) : null)
            .input('Busqueda', sql.VarChar(100), busqueda ? String(busqueda) : null)
            .input('PageNumber', sql.Int, paginaActual)
            .input('PageSize', sql.Int, limiteActual)
            .execute('sp_ObtenerBitacora');

        const registros = result?.recordset ?? [];

        // El SP repite total_registros/total_paginas en cada fila; se toman de la primera.
        const totalRegistros = Number(registros[0]?.total_registros ?? 0);
        const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limiteActual));

        // Limpiar los campos de total que viajan en cada fila del recordset.
        const datos = registros.map((registro: Record<string, unknown>) => {
            const fila: Record<string, unknown> = { ...registro };
            delete fila.total_registros;
            delete fila.total_paginas;
            return fila;
        });

        return res.status(200).json({
            pagina: paginaActual,
            limite: limiteActual,
            totalRegistros,
            totalPaginas,
            datos
        });
    } catch (error: unknown) {
        console.error('Error al consultar la bitácora:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};
