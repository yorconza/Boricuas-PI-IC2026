// src/controllers/reportesController.ts
import type { Request, Response } from 'express';
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';
import { 
    generarPDFReportePagos, 
    generarPDFReporteVisitas, 
    type IPagoReporte, 
    type IVisitaReporte 
} from '../services/pdfServices.js';

interface IReporteQueryParams {
    fecha_inicio?: string;
    fecha_fin?: string;
}

/**
 * Función auxiliar para ajustar la fecha fin sumándole 1 día,
 * resolviendo el desfase por zona horaria/UTC en consultas por fecha.
 */
function calcularFechaFinInclusiva(fechaFin?: string): string | null {
    if (!fechaFin) return null;
    const date = new Date(fechaFin);
    date.setDate(date.getDate() + 1);
    
    const isoString = date.toISOString();
    const partes = isoString.split('T');
    
    // Garantizamos a TypeScript que devolvemos un string explícito
    return partes[0] ?? null;
}

// ==========================================
// 1. REPORTE DE PAGOS
// ==========================================

/**
 * Endpoint para obtener el reporte de pagos en formato PDF
 * GET /api/reportes/pagos/pdf?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
 */
export async function obtenerReportePagosPDF(
    req: Request<Record<string, never>, unknown, unknown, IReporteQueryParams>,
    res: Response
): Promise<void> {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        // Ajustamos la fecha_fin para incluir todos los registros del día seleccionado
        const fechaFinAjustada = calcularFechaFinInclusiva(fecha_fin);

        // Configurar encabezados HTTP para transmitir un archivo PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename=Reporte_Pagos_${fecha_inicio || 'Inicio'}_a_${fecha_fin || 'Fin'}.pdf`
        );

        // Obtenemos la conexión con la base de datos
        const pool = await getConnection();
        const request = new sql.Request(pool);

        // Aseguramos que los valores sean explícitamente string | null
        const paramInicio: string | null = fecha_inicio ? fecha_inicio : null;
        const paramFin: string | null = fechaFinAjustada ? fechaFinAjustada : null;

        request.input('fecha_inicio', sql.Date, paramInicio);
        request.input('fecha_fin', sql.Date, paramFin);

        const result = await request.execute<IPagoReporte>('dbo.sp_ReportePagos');
        const listaPagos: IPagoReporte[] = result.recordset;

        // Generar y transmitir el PDF
        generarPDFReportePagos(listaPagos, fecha_inicio, fecha_fin, res);

    } catch (error) {
        console.error('Error generando reporte PDF:', error);
        
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                message: 'Error interno al generar el reporte en PDF',
                error: error instanceof Error ? error.message : error 
            });
        }
    }
}

/**
 * Endpoint para obtener los datos del reporte en JSON
 * GET /api/reportes/pagos/data?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
 */
export async function obtenerReportePagosJSON(
    req: Request<Record<string, never>, unknown, unknown, IReporteQueryParams>,
    res: Response
): Promise<void> {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        // Ajustamos la fecha_fin para incluir todos los registros del día seleccionado
        const fechaFinAjustada = calcularFechaFinInclusiva(fecha_fin);

        const pool = await getConnection();
        const request = new sql.Request(pool);

        const paramInicio: string | null = fecha_inicio ? fecha_inicio : null;
        const paramFin: string | null = fechaFinAjustada ? fechaFinAjustada : null;

        request.input('fecha_inicio', sql.Date, paramInicio);
        request.input('fecha_fin', sql.Date, paramFin);

        const result = await request.execute<IPagoReporte>('dbo.sp_ReportePagos');

        res.status(200).json({
            success: true,
            total_registros: result.recordset.length,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error obteniendo datos del reporte:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al consultar los datos del reporte',
            error: error instanceof Error ? error.message : error 
        });
    }
}

// ==========================================
// 2. REPORTE DE VISITAS AUTORIZADAS
// ==========================================

/**
 * Endpoint para obtener el reporte de visitas autorizadas en PDF
 * GET /api/reportes/visitas/pdf?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
 */
export async function obtenerReporteVisitasPDF(
    req: Request<Record<string, never>, unknown, unknown, IReporteQueryParams>,
    res: Response
): Promise<void> {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        const fechaFinAjustada = calcularFechaFinInclusiva(fecha_fin);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename=Reporte_Visitas_${fecha_inicio || 'Inicio'}_a_${fecha_fin || 'Fin'}.pdf`
        );

        const pool = await getConnection();
        const request = new sql.Request(pool);

        const paramInicio: string | null = fecha_inicio ? fecha_inicio : null;
        const paramFin: string | null = fechaFinAjustada ? fechaFinAjustada : null;

        request.input('fecha_inicio', sql.Date, paramInicio);
        request.input('fecha_fin', sql.Date, paramFin);

        const result = await request.execute<IVisitaReporte>('dbo.sp_ReporteVisitas');
        const listaVisitas: IVisitaReporte[] = result.recordset;

        generarPDFReporteVisitas(listaVisitas, fecha_inicio, fecha_fin, res);

    } catch (error) {
        console.error('Error generando reporte de visitas PDF:', error);
        
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                message: 'Error interno al generar el reporte de visitas en PDF',
                error: error instanceof Error ? error.message : error 
            });
        }
    }
}

/**
 * Endpoint para obtener los datos del reporte de visitas en JSON
 * GET /api/reportes/visitas/data?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
 */
export async function obtenerReporteVisitasJSON(
    req: Request<Record<string, never>, unknown, unknown, IReporteQueryParams>,
    res: Response
): Promise<void> {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        const fechaFinAjustada = calcularFechaFinInclusiva(fecha_fin);

        const pool = await getConnection();
        const request = new sql.Request(pool);

        const paramInicio: string | null = fecha_inicio ? fecha_inicio : null;
        const paramFin: string | null = fechaFinAjustada ? fechaFinAjustada : null;

        request.input('fecha_inicio', sql.Date, paramInicio);
        request.input('fecha_fin', sql.Date, paramFin);

        const result = await request.execute<IVisitaReporte>('dbo.sp_ReporteVisitas');

        res.status(200).json({
            success: true,
            total_registros: result.recordset.length,
            data: result.recordset
        });

    } catch (error) {
        console.error('Error obteniendo datos del reporte de visitas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al consultar las visitas autorizadas',
            error: error instanceof Error ? error.message : error 
        });
    }
}