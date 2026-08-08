import type { Request, Response } from 'express';
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';


/**
 * Obtener / Listar visitas autorizadas usando sp_ListarVisitasAutorizadas
 * Acepta Query Params opcionales: ?busqueda=Juan&estado=Activo&solo_hoy=1
 */
export const getVisitasAutorizadas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { busqueda, estado, solo_hoy } = req.query;
    const pool = await getConnection();

    const request = pool.request();
    request.input('busqueda', sql.VarChar(150), busqueda ? String(busqueda) : null);
    request.input('estado', sql.VarChar(20), estado ? String(estado) : null);
    request.input('solo_hoy', sql.Bit, solo_hoy === '1' || solo_hoy === 'true' ? 1 : 0);

    const result = await request.execute('sp_ListarVisitasAutorizadas');
    res.json(result.recordset);
  } catch (error: unknown) {
    console.error('Error en getVisitasAutorizadas:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    res.status(500).json({ message });
  }
};

/**
 * Crear un nuevo visitante usando sp_CrearVisitante
 */
export const createVisitante = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_usuario, nombre_completo, documento_identidad, placa } = req.body;

    if (!id_usuario || !nombre_completo) {
      res.status(400).json({ message: 'Los campos id_usuario y nombre_completo son obligatorios.' });
      return;
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('id_usuario', sql.Int, Number(id_usuario))
      .input('nombre_completo', sql.VarChar(150), nombre_completo)
      .input('documento_identidad', sql.VarChar(30), documento_identidad || null)
      .input('placa', sql.VarChar(20), placa || null)
      .execute('sp_CrearVisitante');

    const idCreado = result.recordset[0]?.id_visitante_creado;

    res.status(201).json({
      message: 'Visitante creado exitosamente',
      id_visitante: idCreado
    });
  } catch (error: unknown) {
    console.error('Error en createVisitante:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    res.status(500).json({ message });
  }
};

/**
 * Actualizar datos de un visitante usando sp_ActualizarVisitante
 */
export const updateVisitante = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre_completo, documento_identidad, placa } = req.body;

    if (!nombre_completo) {
      res.status(400).json({ message: 'El campo nombre_completo es obligatorio.' });
      return;
    }

    const pool = await getConnection();
    await pool.request()
      .input('id_visitante', sql.Int, Number(id))
      .input('nombre_completo', sql.VarChar(150), nombre_completo)
      .input('documento_identidad', sql.VarChar(30), documento_identidad || null)
      .input('placa', sql.VarChar(20), placa || null)
      .execute('sp_ActualizarVisitante');

    res.json({ message: 'Visitante actualizado correctamente' });
  } catch (error: unknown) {
    console.error('Error en updateVisitante:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    res.status(500).json({ message });
  }
};

/**
 * Desactivar / Revocar un visitante usando sp_DesactivarVisitante
 */
export const desactivarVisitante = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const pool = await getConnection();
    await pool.request()
      .input('id_visitante', sql.Int, Number(id))
      .execute('sp_DesactivarVisitante');

    res.json({ message: 'Visitante desactivado / revocado con éxito' });
  } catch (error: unknown) {
    console.error('Error en desactivarVisitante:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    res.status(500).json({ message });
  }
};