import { type Request, type Response } from 'express';
import { dashboardService } from '../services/dashboardService.js';

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Obtener el ID del usuario desde req.user (inyectado por authenticateToken)
    const id_usuario = req.user?.id_usuario;

    if (!id_usuario) {
      res.status(401).json({ message: 'Usuario no autenticado o ID no encontrado en el token.' });
      return;
    }

    // 2. Pasar el id_usuario al servicio
    const data = await dashboardService.obtenerResumen(id_usuario);
    
    console.log('📊 DATOS ENVIADOS DESDE EL BACKEND:', JSON.stringify(data, null, 2));

    res.status(200).json(data);
  } catch (error: unknown) {
    console.error('Error en controller dashboard:', error);
    res.status(500).json({ 
      message: 'Error al obtener resumen del dashboard',
      error: error instanceof Error ? error.message : error 
    });
  }
};