import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';

/**
 * Convierte horas como "08:00" a "08:00:00".
 * Retorna null si no se proporciona un valor válido.
 */
const formatTime = (time: string | undefined | null): string | null => {
    if (!time) return null;
    if (time.length === 5) {
        return `${time}:00`;
    }
    return time;
};

/**
 * =====================================================================
 * 1. Listar Áreas Comunes (GET) - GET /api/areas
 * =====================================================================
 */
export const getAreas = async (_req: Request, res: Response) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().execute('sp_ListarAreasComunes');

        return res.status(200).json(result.recordset);
    } catch (error: unknown) {
        console.error('Error en getAreas:', error);
        const err = error as Error;
        return res.status(500).json({ message: err.message });
    }
};

/**
 * =====================================================================
 * 2. Crear Área Común (POST) - POST /api/areas
 * =====================================================================
 */
export const createArea = async (req: Request, res: Response) => {
    try {
        const {
            nombre,
            capacidad_max,
            descripcion = null,
            costo_por_hora,
            hora_apertura,
            hora_cierre,
            max_reservas_semana = 10,
            foto_principal,
            foto_url
        } = req.body;

        // Permite recibir la foto como foto_principal o foto_url desde el body
        const fotoFinal = foto_principal || foto_url || null;

        // Validaciones básicas de entrada
        if (!nombre || capacidad_max === undefined || costo_por_hora === undefined) {
            return res.status(400).json({ 
                message: 'Campos requeridos faltantes: nombre, capacidad_max, costo_por_hora' 
            });
        }

        const pool = await getConnection();
        const result = await pool.request()
            .input('nombre', sql.VarChar(100), nombre)
            .input('capacidad_max', sql.Int, Number(capacidad_max))
            .input('descripcion', sql.VarChar(500), descripcion)
            .input('costo_por_hora', sql.Decimal(10, 2), Number(costo_por_hora))
            .input('hora_apertura', sql.VarChar(8), formatTime(hora_apertura))
            .input('hora_cierre', sql.VarChar(8), formatTime(hora_cierre))
            .input('max_reservas_semana', sql.Int, Number(max_reservas_semana))
            .input('foto_principal', sql.VarChar(255), fotoFinal)
            .execute('sp_CrearAreaComun');

        return res.status(201).json({
            message: 'Área creada correctamente',
            id_area: result.recordset[0]?.id_area_creada || null
        });
    } catch (error: unknown) {
        console.error('Error en createArea:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message });
    }
};

/**
 * =====================================================================
 * 3. Actualizar Área (PUT) - PUT /api/areas/:id
 * =====================================================================
 */
export const updateArea = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            capacidad_max,
            descripcion = null,
            costo_por_hora,
            hora_apertura,
            hora_cierre,
            max_reservas_semana = 10,
            foto_principal,
            foto_url
        } = req.body;

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ message: 'El ID del área es inválido.' });
        }

        if (!nombre || capacidad_max === undefined || costo_por_hora === undefined) {
            return res.status(400).json({ 
                message: 'Campos requeridos faltantes: nombre, capacidad_max, costo_por_hora' 
            });
        }

        const fotoFinal = foto_principal || foto_url || null;

        const pool = await getConnection();
        await pool.request()
            .input('id_area', sql.Int, Number(id))
            .input('nombre', sql.VarChar(100), nombre)
            .input('capacidad_max', sql.Int, Number(capacidad_max))
            .input('descripcion', sql.VarChar(500), descripcion)
            .input('costo_por_hora', sql.Decimal(10, 2), Number(costo_por_hora))
            .input('hora_apertura', sql.VarChar(8), formatTime(hora_apertura))
            .input('hora_cierre', sql.VarChar(8), formatTime(hora_cierre))
            .input('max_reservas_semana', sql.Int, Number(max_reservas_semana))
            .input('foto_principal', sql.VarChar(255), fotoFinal)
            .execute('sp_ActualizarAreaComun');

        return res.status(200).json({ message: 'Área actualizada correctamente' });
    } catch (error: unknown) {
        console.error('Error en updateArea:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message });
    }
};

/**
 * =====================================================================
 * 4. Activar Área (PATCH) - PATCH /api/areas/:id/activar
 * =====================================================================
 */
export const activateArea = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ message: 'El ID del área es inválido.' });
        }

        const pool = await getConnection();
        await pool.request()
            .input('id_area', sql.Int, Number(id))
            .execute('sp_ActivarAreaComun');

        return res.status(200).json({ message: 'Área activada correctamente' });
    } catch (error: unknown) {
        console.error('Error en activateArea:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message });
    }
};

/**
 * =====================================================================
 * 5. Desactivar Área (PATCH) - PATCH /api/areas/:id/desactivar
 * =====================================================================
 */
export const deactivateArea = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({ message: 'El ID del área es inválido.' });
        }

        const pool = await getConnection();
        await pool.request()
            .input('id_area', sql.Int, Number(id))
            .execute('sp_DesactivarAreaComun');

        return res.status(200).json({ message: 'Área desactivada correctamente' });
    } catch (error: unknown) {
        console.error('Error en deactivateArea:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message });
    }
};