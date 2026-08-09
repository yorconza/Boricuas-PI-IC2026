import { type Request, type Response } from 'express';
import { obtenerContratosParaReporte } from '../services/contratoService.js';
import { PdfService } from '../services/pdfService.js';

export const descargarReporteContratos = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Extraer fechas del query string (soporta tanto camelCase como snake_case)
    const rawInicio = req.query.fechaInicio || req.query.fecha_inicio;
    const rawFin = req.query.fechaFin || req.query.fecha_fin;

    // 2. Limpiar cadenas vacías ("") para enviarlas como undefined si no hay filtro
    const fechaInicio = rawInicio && String(rawInicio).trim() !== '' ? String(rawInicio) : undefined;
    const fechaFin = rawFin && String(rawFin).trim() !== '' ? String(rawFin) : undefined;

    // 3. Consultar servicio
    const contratos = await obtenerContratosParaReporte(fechaInicio, fechaFin);

    // 4. Configurar cabeceras HTTP y generar PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Reporte_Contratos.pdf"');

    PdfService.generarPdfContratos(contratos, res);
  } catch (error) {
    console.error('Error al generar el reporte de contratos:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error interno al generar el reporte de contratos' });
    }
  }
};