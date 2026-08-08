// src/services/reportesService.ts

// Ajusta la URL base según la configuración de tus otros servicios o variables de entorno
const API_URL = 'http://localhost:3000/api';

/**
 * Petición para obtener el reporte de pagos en formato PDF.
 * Retorna un Blob binario listo para la descarga.
 */
export async function descargarReportePagosPDF(fechaInicio: string, fechaFin: string): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/reportes/pagos/pdf?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`
  );

  if (!response.ok) {
    throw new Error('Error al generar el reporte en PDF desde el servidor.');
  }

  return await response.blob();
}

/**
 * Petición para consultar los datos del reporte de pagos en formato JSON.
 */
export async function obtenerReportePagosJSON(fechaInicio: string, fechaFin: string): Promise<unknown> {
  const response = await fetch(
    `${API_URL}/reportes/pagos/data?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`
  );

  if (!response.ok) {
    throw new Error('Error al consultar los datos del reporte en JSON.');
  }

  return await response.json();
}