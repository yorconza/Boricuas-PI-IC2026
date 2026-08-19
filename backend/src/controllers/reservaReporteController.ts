/**
 * ============================================================================
 * Archivo: reservaReporteController.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Endpoint para descargar el reporte de reservas en formato PDF.
 *   GET /api/reporte-reservas/pdf?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
 *
 * Flujo:
 *   1. Extrae fechas del query string.
 *   2. Llama a obtenerReservasParaReporte() (reservasService.ts).
 *   3. Genera el PDF con PdfService.generarPdfReservas() y lo envía.
 *
 * Se comunica con:
 *   - reservasService.ts (obtenerReservasParaReporte → sp_ObtenerReporteReservas).
 *   - pdfService.ts (PdfService.generarPdfReservas).
 *   - Ruta: reservaReporteRoute.ts.
 *
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import { obtenerReservasParaReporte } from '../services/reservasService.js';
import { PdfService } from '../services/pdfService.js';

export const descargarReporteReservas = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Extraer fechas del query string
    const rawInicio = req.query.fechaInicio || req.query.fecha_inicio;
    const rawFin = req.query.fechaFin || req.query.fecha_fin;

    // 2. Limpiar cadenas vacías
    const fechaInicio = rawInicio && String(rawInicio).trim() !== '' ? String(rawInicio) : undefined;
    const fechaFin = rawFin && String(rawFin).trim() !== '' ? String(rawFin) : undefined;

    // 3. Consultar servicio
    const reservas = await obtenerReservasParaReporte(fechaInicio, fechaFin);

    // 4. Configurar cabeceras HTTP y generar PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Reporte_Reservas.pdf"');

    PdfService.generarPdfReservas(reservas, res);
  } catch (error) {
    console.error('Error al generar el reporte de reservas:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error interno al generar el reporte de reservas' });
    }
  }
};