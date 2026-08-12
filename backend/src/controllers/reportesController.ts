// backend/src/controllers/reportesController.ts

import type { Request, Response } from 'express';
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';
import { 
    PdfService, 
    type IPagoReporte, 
    type IVisitaReporte, 
    type ReservaReporte, 
    type ContratoReporte 
} from '../services/pdfService.js';

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
        const fechaFinAjustada = calcularFechaFinInclusiva(fecha_fin);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename=Reporte_Pagos_${fecha_inicio || 'Inicio'}_a_${fecha_fin || 'Fin'}.pdf`
        );

        const pool = await getConnection();
        const request = new sql.Request(pool);

        const paramInicio: string | null = fecha_inicio ? fecha_inicio : null;
        const paramFin: string | null = fechaFinAjustada ? fechaFinAjustada : null;

        request.input('fecha_inicio', sql.Date, paramInicio);
        request.input('fecha_fin', sql.Date, paramFin);

        const result = await request.execute<IPagoReporte>('dbo.sp_ReportePagos');
        const listaPagos: IPagoReporte[] = result.recordset;

        // Invocación del método estático del nuevo PdfService
        PdfService.generarPdfPagos(listaPagos, res);

    } catch (error) {
        console.error('Error generando reporte PDF de pagos:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                message: 'Error interno al generar el reporte de pagos en PDF',
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
        console.error('Error obteniendo datos del reporte de pagos:', error);
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

        // Invocación del método estático del nuevo PdfService
        PdfService.generarPdfVisitas(listaVisitas, res);

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

// ==========================================
// 3. REPORTE DE RESERVAS
// ==========================================

/**
 * Endpoint para obtener el reporte de reservas en PDF
 * GET /api/reportes/reservas/pdf?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
 */
export async function obtenerReporteReservasPDF(
    req: Request<Record<string, never>, unknown, unknown, IReporteQueryParams>,
    res: Response
): Promise<void> {
    try {
        const { fecha_inicio, fecha_fin } = req.query;
        const fechaFinAjustada = calcularFechaFinInclusiva(fecha_fin);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename=Reporte_Reservas_${fecha_inicio || 'Inicio'}_a_${fecha_fin || 'Fin'}.pdf`
        );

        const pool = await getConnection();
        const request = new sql.Request(pool);

        const paramInicio: string | null = fecha_inicio ? fecha_inicio : null;
        const paramFin: string | null = fechaFinAjustada ? fechaFinAjustada : null;

        request.input('fecha_inicio', sql.Date, paramInicio);
        request.input('fecha_fin', sql.Date, paramFin);

        const result = await request.execute<ReservaReporte>('dbo.sp_ReporteReservas');
        const listaReservas: ReservaReporte[] = result.recordset;

        PdfService.generarPdfReservas(listaReservas, res);

    } catch (error) {
        console.error('Error generando reporte de reservas PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                message: 'Error interno al generar el reporte de reservas en PDF',
                error: error instanceof Error ? error.message : error 
            });
        }
    }
}

// ==========================================
// 4. REPORTE DE CONTRATOS
// ==========================================

/**
 * Endpoint para obtener el reporte de contratos en PDF
 * GET /api/reportes/contratos/pdf?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
 */
export async function obtenerReporteContratosPDF(
    req: Request<Record<string, never>, unknown, unknown, IReporteQueryParams>,
    res: Response
): Promise<void> {
    try {
        const { fecha_inicio, fecha_fin } = req.query;
        const fechaFinAjustada = calcularFechaFinInclusiva(fecha_fin);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename=Reporte_Contratos_${fecha_inicio || 'Inicio'}_a_${fecha_fin || 'Fin'}.pdf`
        );

        const pool = await getConnection();
        const request = new sql.Request(pool);

        const paramInicio: string | null = fecha_inicio ? fecha_inicio : null;
        const paramFin: string | null = fechaFinAjustada ? fechaFinAjustada : null;

        request.input('fecha_inicio', sql.Date, paramInicio);
        request.input('fecha_fin', sql.Date, paramFin);

        const result = await request.execute<ContratoReporte>('dbo.sp_ReporteContratos');
        const listaContratos: ContratoReporte[] = result.recordset;

        PdfService.generarPdfContratos(listaContratos, res);

    } catch (error) {
        console.error('Error generando reporte de contratos PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                message: 'Error interno al generar el reporte de contratos en PDF',
                error: error instanceof Error ? error.message : error 
            });
        }
    }
}