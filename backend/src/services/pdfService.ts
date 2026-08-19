/**
 * ============================================================================
 * Archivo: pdfService.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Service estático para generar PDFs de reportes usando pdfkit + svg-to-pdfkit.
 * Métodos públicos (estáticos):
 *
 *   generarPdfReservas(data, res)   → Tabla de reservas con logo BORICUAS.
 *   generarPdfContratos(data, res)  → Tabla de contratos.
 *   generarPdfPagos(data, res)      → Tabla de pagos.
 *   generarPdfVisitas(data, res)    → Tabla de visitas autorizadas.
 *
 * Cada método:
 *   1. Crea un PDFDocument (A4, márgenes 40).
 *   2. Renderiza header con logo SVG + título + fecha.
 *   3. Renderiza filas de la tabla (paginación automática a >740px).
 *   4. Renderiza footer con numeración dinámica (Página X de Y).
 *
 * Interfaces exportadas: ReservaReporte, ContratoReporte, IPagoReporte,
 * IVisitaReporte (tolerantes a alias de columna del SP).
 *
 * Se comunica con:
 *   - Controllers: reportesController, reservaReporteController, contratoReporteController.
 *   - No accede directamente a la BD (recibe datos preconsultados).
 *
 * ============================================================================
 */
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { type Response } from 'express';

// --- INTERFACES DE REPORTES ---
export interface ReservaReporte {
  residente: string;
  area: string;
  fecha: string;
  horario: string;
  estado: string;
}

export interface ContratoReporte {
  residente?: string;
  departamento?: string;
  fecha_inicio?: string | Date;
  fecha_fin?: string | Date;
  monto?: number;
  estado?: string;
  [key: string]: unknown;
}

/** Filas de sp_ReportePagos (reporte de pagos, PDF/JSON). */
export interface IPagoReporte {
  id_pago?: number;
  residente?: string;
  concepto?: string;
  monto?: number;
  /** Alias reales que devuelve el SP/vista (se aceptan también fecha/metodo). */
  fecha_pago?: string | Date;
  fecha?: string | Date;
  metodo_pago?: string;
  metodo?: string;
  tipo_pago?: string;
  estado?: string;
  estado_pago?: string;
  [key: string]: unknown;
}

/** Filas de sp_ReporteVisitas (reporte de visitas autorizadas, PDF/JSON). */
export interface IVisitaReporte {
  id_visita?: number;
  id_visitante?: number;
  visitante?: string;
  nombre_completo?: string;
  /** Columna real que devuelve sp_ReporteVisitas (alias de nombre_completo). */
  nombre_visitante?: string;
  documento_identidad?: string;
  placa?: string;
  fecha?: string | Date;
  /** Columna real que devuelve sp_ReporteVisitas (alias de fecha). */
  fecha_autorizacion?: string | Date;
  autorizado_por?: string;
  departamento?: string;
  hora?: string;
  estado?: string;
  [key: string]: unknown;
}

// Logo SVG en String
const LOGO_BORICUAS_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 85">
  <g transform="translate(0, 0)">
    <rect x="12" y="20" width="24" height="55" rx="2" fill="#3b82f6" />
    <rect x="18" y="27" width="5" height="6" rx="1" fill="#ffffff" opacity="0.9" />
    <rect x="26" y="27" width="5" height="6" rx="1" fill="#ffffff" opacity="0.9" />
    <rect x="18" y="38" width="5" height="6" rx="1" fill="#ffffff" opacity="0.9" />
    <rect x="26" y="38" width="5" height="6" rx="1" fill="#ffffff" opacity="0.9" />
    <rect x="30" y="8" width="30" height="67" rx="3" fill="#1e3a8a" />
    <rect x="37" y="16" width="6" height="8" rx="1" fill="#ffffff" />
    <rect x="47" y="16" width="6" height="8" rx="1" fill="#ffffff" />
    <rect x="37" y="29" width="6" height="8" rx="1" fill="#ffffff" />
    <rect x="47" y="29" width="6" height="8" rx="1" fill="#ffffff" />
    <rect x="41" y="56" width="8" height="19" rx="1" fill="#60a5fa" />
  </g>
  <text x="75" y="45" font-family="Helvetica" font-weight="bold" font-size="26" fill="#1e3a8a">BORICUAS</text>
  <text x="76" y="62" font-family="Helvetica" font-size="10" fill="#64748b" letter-spacing="3">CONDOMINIUM</text>
</svg>
`;

export class PdfService {
  /**
   * Genera el PDF de reservas
   */
  public static generarPdfReservas(data: ReservaReporte[], res: Response): void {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: {
        Title: 'Reporte de Reservas - Boricuas Condominium', // 👈 Título para la pestaña del navegador
        Author: 'Boricuas Condominium'
      }
    });
    doc.pipe(res);
    
    // Encabezado con Logo y Título
    this.renderHeader(doc, 'REPORTE DE RESERVAS', 'Control de Áreas Comunes');

    // Tabla de Reservas
    let y = 115;
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
    doc.text('Residente', 40, y);
    doc.text('Área', 170, y);
    doc.text('Fecha', 290, y);
    doc.text('Horario', 380, y);
    doc.text('Estado', 470, y);

    y += 15;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#cbd5e1').stroke();
    y += 10;

    doc.font('Helvetica').fontSize(9).fillColor('#334155');

    data.forEach((item: ReservaReporte) => {
      if (y > 740) {
        doc.addPage();
        y = 40;
      }

      doc.text(item.residente || '-', 40, y);
      doc.text(item.area || '-', 170, y);
      doc.text(item.fecha || '-', 290, y);
      doc.text(item.horario || '-', 380, y);
      doc.text(item.estado || '-', 470, y);

      y += 20;
    });

    // Pie de página con numeración dinámica
    this.renderFooter(doc);
    doc.end();
  }

  /**
   * Genera el PDF de contratos
   */
  public static generarPdfContratos(data: ContratoReporte[], res: Response): void {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: {
        Title: 'Reporte de Contratos - Boricuas Condominium', // 👈 Título para la pestaña del navegador
        Author: 'Boricuas Condominium'
      }
    });
    doc.pipe(res);

    // Encabezado con Logo y Título
    this.renderHeader(doc, 'REPORTE DE CONTRATOS', 'Gestión de Alquileres y Departamentos');

    // Tabla de Contratos
    let y = 115;
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
    doc.text('Residente', 40, y);
    doc.text('Depto', 160, y);
    doc.text('F. Inicio', 230, y);
    doc.text('F. Fin', 310, y);
    doc.text('Monto', 390, y);
    doc.text('Estado', 470, y);

    y += 15;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#cbd5e1').stroke();
    y += 10;

    doc.font('Helvetica').fontSize(9).fillColor('#334155');

    data.forEach((item: ContratoReporte) => {
      if (y > 740) {
        doc.addPage();
        y = 40;
      }

      const montoNum = Number(item.monto) || 0;
      const montoFormateado = montoNum.toLocaleString('en-US');

      doc.text(item.residente || '-', 40, y);
      doc.text(item.departamento || '-', 160, y);
      // String() conserva el mismo output que antes (pdfkit ya convertía el
      // Date devuelto por mssql a string) y satisface el tipo de doc.text.
      doc.text(String(item.fecha_inicio || '-'), 230, y);
      doc.text(String(item.fecha_fin || '-'), 310, y);
      doc.text(montoFormateado, 390, y);
      doc.text(item.estado || '-', 470, y);

      y += 20;
    });

    // Pie de página con numeración dinámica
    this.renderFooter(doc);
    doc.end();
  }

  /**
   * Genera el PDF de pagos (endpoint /api/reportes/pagos/pdf)
   */
  public static generarPdfPagos(data: IPagoReporte[], res: Response): void {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: 'Reporte de Pagos - Boricuas Condominium',
        Author: 'Boricuas Condominium'
      }
    });
    doc.pipe(res);

    // Encabezado con Logo y Título
    this.renderHeader(doc, 'REPORTE DE PAGOS', 'Control de Pagos y Recibos');

    // Tabla de Pagos
    let y = 115;
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
    doc.text('Residente', 40, y);
    doc.text('Concepto', 150, y);
    doc.text('Fecha', 280, y);
    doc.text('Método', 370, y);
    doc.text('Monto', 450, y);
    doc.text('Estado', 500, y);

    y += 15;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#cbd5e1').stroke();
    y += 10;

    doc.font('Helvetica').fontSize(9).fillColor('#334155');

    data.forEach((item: IPagoReporte) => {
      if (y > 740) {
        doc.addPage();
        y = 40;
      }

      // FIX (columnas del reporte): sp_ReportePagos devuelve `fecha_pago` y
      // `metodo_pago`, pero el generador leía `fecha`/`metodo` → columnas
      // vacías en el PDF. Ahora se aceptan ambos nombres (y variantes de la
      // vista, ej. monto/monto_pagado) vía obtenerCampo, sin tocar el SP.
      const residente = String(this.obtenerCampo(item, 'residente', 'nombre') ?? '-');
      const concepto = String(this.obtenerCampo(item, 'concepto', 'descripcion') ?? '-');
      const montoNum = Number(this.obtenerCampo(item, 'monto', 'monto_pagado', 'total') ?? 0) || 0;
      const montoFormateado = montoNum.toLocaleString('en-US');
      const fechaRaw = this.obtenerCampo(item, 'fecha_pago', 'fecha');
      const fechaStr = fechaRaw instanceof Date
        ? fechaRaw.toLocaleDateString()
        : String(fechaRaw ?? '-');
      const metodo = String(this.obtenerCampo(item, 'metodo_pago', 'metodo', 'tipo_pago') ?? '-');
      const estado = String(this.obtenerCampo(item, 'estado', 'estado_pago') ?? '-');

      doc.text(residente, 40, y);
      doc.text(concepto, 150, y);
      doc.text(fechaStr, 280, y);
      doc.text(metodo, 370, y);
      doc.text(montoFormateado, 450, y);
      doc.text(estado, 500, y);

      y += 20;
    });

    // Pie de página con numeración dinámica
    this.renderFooter(doc);
    doc.end();
  }

  /**
   * Genera el PDF de visitas autorizadas (endpoint /api/reportes/visitas/pdf)
   */
  public static generarPdfVisitas(data: IVisitaReporte[], res: Response): void {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: 'Reporte de Visitas - Boricuas Condominium',
        Author: 'Boricuas Condominium'
      }
    });
    doc.pipe(res);

    // Encabezado con Logo y Título
    this.renderHeader(doc, 'REPORTE DE VISITAS', 'Control de Visitas Autorizadas');

    // Tabla de Visitas
    let y = 115;
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
    doc.text('Visitante', 40, y);
    doc.text('Documento', 160, y);
    doc.text('Placa', 240, y);
    doc.text('Depto', 300, y);
    doc.text('Autorizado', 350, y);
    doc.text('Fecha', 425, y);
    doc.text('Estado', 495, y);

    y += 15;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#cbd5e1').stroke();
    y += 10;

    doc.font('Helvetica').fontSize(9).fillColor('#334155');

    data.forEach((item: IVisitaReporte) => {
      if (y > 740) {
        doc.addPage();
        y = 40;
      }

      // FIX (columnas del reporte): sp_ReporteVisitas devuelve
      // `nombre_visitante`, `fecha_autorizacion`, `autorizado_por` y
      // `departamento`; el generador leía `nombre_completo`/`fecha` → columnas
      // vacías. Se resuelven con alias (obtenerCampo) y la fecha se formatea
      // con componentes UTC para no desplazar el día (mismo criterio que pagos).
      const visitante = String(this.obtenerCampo(item, 'nombre_visitante', 'nombre_completo', 'visitante') ?? '-');
      const documento = String(this.obtenerCampo(item, 'documento_identidad') ?? '-');
      const placa = String(this.obtenerCampo(item, 'placa') ?? '-');
      const departamento = String(this.obtenerCampo(item, 'departamento') ?? '-');
      const autorizadoPor = String(this.obtenerCampo(item, 'autorizado_por', 'residente') ?? '-');
      const fechaStr = this.formatearFechaReporte(
        this.obtenerCampo(item, 'fecha_autorizacion', 'fecha', 'fecha_hora_estimada')
      );
      const estado = String(this.obtenerCampo(item, 'estado') ?? '-');

      doc.text(visitante, 40, y);
      doc.text(documento, 160, y);
      doc.text(placa, 240, y);
      doc.text(departamento, 300, y);
      doc.text(autorizadoPor, 350, y);
      doc.text(fechaStr, 425, y);
      doc.text(estado, 495, y);

      y += 20;
    });

    // Pie de página con numeración dinámica
    this.renderFooter(doc);
    doc.end();
  }

  // --- MÉTODOS PRIVADOS REUTILIZABLES ---

  /**
   * Devuelve el primer valor no nulo entre los nombres de columna dados
   * (tolerancia a alias: la vista/SP puede nombrar las columnas distinto).
   */
  private static obtenerCampo(fila: Record<string, unknown>, ...claves: string[]): unknown {
    for (const clave of claves) {
      const valor = fila[clave];
      if (valor !== undefined && valor !== null) return valor;
    }
    return undefined;
  }

  /**
   * Formatea una fecha de reporte a "YYYY-MM-DD".
   * FIX (zona horaria): los DATETIME de SQL Server llegan como Date UTC; se
   * usan los componentes UTC para no desplazar el día (ej. 01:16 UTC no debe
   * verse como el día anterior en hora local). Acepta Date o string ISO.
   */
  private static formatearFechaReporte(valor: unknown): string {
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
      const y = valor.getUTCFullYear();
      const m = String(valor.getUTCMonth() + 1).padStart(2, '0');
      const d = String(valor.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const texto = String(valor ?? '');
    if (!texto) return '-';
    // split('T')[0] puede ser undefined bajo la config estricta de TS.
    return texto.includes('T') ? (texto.split('T')[0] ?? texto) : texto.slice(0, 10);
  }

  private static renderHeader(doc: PDFKit.PDFDocument, titulo: string, subtitulo: string): void {
    // 1. Logo SVG
    try {
      SVGtoPDF(doc, LOGO_BORICUAS_SVG, 40, 30, {
        width: 150,
        preserveAspectRatio: 'xMinYMin meet'
      });
    } catch (error) {
      console.error('Error al renderizar el logo SVG:', error);
    }

    // 2. Textos del encabezado
    doc.fillColor('#1e3a8a')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text(titulo, 240, 35, { align: 'right' });

    doc.fillColor('#64748b')
       .fontSize(9)
       .font('Helvetica')
       .text(subtitulo, 240, 55, { align: 'right' });

    doc.fontSize(8)
       .fillColor('#94a3b8')
       .text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 240, 68, { align: 'right' });

    // 3. Línea divisora
    doc.moveTo(40, 95).lineTo(555, 95).strokeColor('#e2e8f0').stroke();
  }

  private static renderFooter(doc: PDFKit.PDFDocument): void {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .fillColor('#94a3b8')
         .text(
           `Página ${i + 1} de ${range.count} - Documento generado automáticamente por el Sistema Condominium Boricuas`,
           40,
           780,
           { align: 'center' }
         );
    }
  }
}