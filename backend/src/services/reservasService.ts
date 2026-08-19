/**
 * ============================================================================
 * Archivo: reservasService.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Service que consulta sp_ObtenerReporteReservas para obtener las reservas
 * en formato plano (ReservaReporte[]) destinado al PDF.
 *
 *   obtenerReservasParaReporte(fechaInicio?, fechaFin?) → ReservaReporte[]
 *
 * Los parámetros son opcionales: si no se envían, el SP devuelve todas las
 * reservas sin filtro de fecha.
 *
 * Se comunica con:
 *   - SQL Server vía confDB.getConnection().
 *   - Controller: reservaReporteController.ts.
 *   - pdfService.ts (generarPdfReservas recibe los datos que aquí se consultan).
 *
 * ============================================================================
 */
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';

export interface ReservaReporte {
  residente: string;
  area: string;
  fecha: string;
  horario: string;
  estado: string;
}

export const obtenerReservasParaReporte = async (
  fechaInicio?: string,
  fechaFin?: string
): Promise<ReservaReporte[]> => {
  try {
    const pool = await getConnection();
    if (!pool) throw new Error('No hay conexión con la base de datos');

    const result = await pool.request()
      // ⚠️ Deben llamarse idéntico a las variables del Stored Procedure (@fecha_inicio y @fecha_fin)
      .input('fecha_inicio', sql.Date, fechaInicio || null)
      .input('fecha_fin', sql.Date, fechaFin || null)
      .execute('sp_ObtenerReporteReservas');

    return (result?.recordset as ReservaReporte[]) ?? [];
  } catch (err) {
    console.error('Error al consultar el reporte de reservas:', err);
    throw new Error('Error al consultar la base de datos para el reporte de reservas', { cause: err });
  }
};