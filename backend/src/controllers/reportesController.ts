/**
 * ============================================================================
 * Archivo: reportesController.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Endpoints para generar reportes en PDF. Consumen SPs de reportes y usan
 * PdfService para renderizar:
 *
 *   obtenerReportePagosPDF   → sp_ReportePagos  → PdfService.generarPdfPagos
 *   obtenerReporteVisitasPDF → sp_ReporteVisitas → PdfService.generarPdfVisitas
 *
 * Nota de fechas:
 *   - Pagos/Visitas: SPs comparan CAST(fecha AS DATE) ≤ fecha_fin (rango
 *     inclusivo por fecha), NO se suma +1 día.
 *   - Por defecto, si no llegan fechas, el reporte es solo de HOY (fecha
 *     local del servidor).
 *
 * Se comunica con:
 *   - SQL Server vía confDB.getConnection().
 *   - pdfService.ts (generación de PDF con pdfkit + svg-to-pdfkit).
 *   - Ruta: reporteRoute.ts (API REST) / reporteVisitasRoute.ts.
 *   - Frontend: reportesService.ts → botón de descarga en admin.
 *
 * ============================================================================
 */
// backend/src/controllers/reportesController.ts

import type { Request, Response } from 'express';
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';
import { 
    PdfService, 
    type IPagoReporte, 
    type IVisitaReporte 
} from '../services/pdfService.js';
import { getFechaActualDB } from '../services/timezoneService.js';

interface IReporteQueryParams {
    fecha_inicio?: string;
    fecha_fin?: string;
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

        // NOTA (fechas del reporte de pagos): a diferencia de los reportes de
        // visitas/reservas/contratos (cuyos SPs comparan DATETIME completos y
        // necesitan el ajuste de +1 día en la fecha fin), sp_ReportePagos compara
        // `CAST(fecha_pago AS DATE) <= @fecha_fin` (rango inclusivo por fecha),
        // así que aquí NO se suma un día — si se sumara, el reporte incluiría
        // un día de más (importante para el "reporte del día": hoy + mañana).
        //
        // Por defecto el reporte es SOLO de los pagos de HOY (fecha de la BD,
        // que puede diferir de la del host si SQL corre en Docker/UTC); si
        // llega un rango de fechas, se respeta tal cual.
        const hoyLocal = getFechaActualDB();
        const inicioEfectivo: string = fecha_inicio ? String(fecha_inicio) : hoyLocal;
        const finEfectivo: string = fecha_fin ? String(fecha_fin) : hoyLocal;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename=Reporte_Pagos_${inicioEfectivo}_a_${finEfectivo}.pdf`
        );

        const pool = await getConnection();
        const request = new sql.Request(pool);

        request.input('fecha_inicio', sql.Date, inicioEfectivo);
        request.input('fecha_fin', sql.Date, finEfectivo);

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
        // NOTA (fechas): sp_ReporteVisitas compara `CAST(fecha_autorizacion AS
        // DATE) <= @fecha_fin` (rango inclusivo por fecha), así que la fecha fin
        // se envía tal cual — sin el ajuste de +1 día (que solo aplica a los
        // SPs que comparan DATETIME completos, como los de reservas/contratos).
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename=Reporte_Visitas_${fecha_inicio || 'Inicio'}_a_${fecha_fin || 'Fin'}.pdf`
        );

        const pool = await getConnection();
        const request = new sql.Request(pool);

        const paramInicio: string | null = fecha_inicio ? fecha_inicio : null;
        const paramFin: string | null = fecha_fin ? fecha_fin : null;

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



