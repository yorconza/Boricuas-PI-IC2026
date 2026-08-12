// backend/src/services/pdfService.ts

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
  residente: string;
  departamento: string;
  fecha_inicio: string;
  fecha_fin: string;
  monto: number;
  estado: string;
}

export interface IPagoReporte {
  residente: string;
  departamento: string;
  concepto: string;
  monto: number;
  fecha_pago: string;
  estado: string;
}

export interface IVisitaReporte {
  visitante: string;
  residente: string;
  departamento: string;
  fecha_ingreso: string;
  estado: string;
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
      info: { Title: 'Reporte de Reservas - Boricuas Condominium', Author: 'Boricuas Condominium' }
    });
    doc.pipe(res);
    
    this.renderHeader(doc, 'REPORTE DE RESERVAS', 'Control de Áreas Comunes');

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
      if (y > 740) { doc.addPage(); y = 40; }

      doc.text(item.residente || '-', 40, y);
      doc.text(item.area || '-', 170, y);
      doc.text(item.fecha || '-', 290, y);
      doc.text(item.horario || '-', 380, y);
      doc.text(item.estado || '-', 470, y);
      y += 20;
    });

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
      info: { Title: 'Reporte de Contratos - Boricuas Condominium', Author: 'Boricuas Condominium' }
    });
    doc.pipe(res);

    this.renderHeader(doc, 'REPORTE DE CONTRATOS', 'Gestión de Alquileres y Departamentos');

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
      if (y > 740) { doc.addPage(); y = 40; }

      const montoNum = Number(item.monto) || 0;
      doc.text(item.residente || '-', 40, y);
      doc.text(item.departamento || '-', 160, y);
      doc.text(item.fecha_inicio || '-', 230, y);
      doc.text(item.fecha_fin || '-', 310, y);
      doc.text(`₡${montoNum.toLocaleString('en-US')}`, 390, y);
      doc.text(item.estado || '-', 470, y);
      y += 20;
    });

    this.renderFooter(doc);
    doc.end();
  }

  /**
   * Genera el PDF de pagos
   */
  public static generarPdfPagos(data: IPagoReporte[], res: Response): void {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: { Title: 'Reporte de Pagos - Boricuas Condominium', Author: 'Boricuas Condominium' }
    });
    doc.pipe(res);

    this.renderHeader(doc, 'REPORTE DE PAGOS', 'Gestión Financiera y Cobros');

    let y = 115;
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
    doc.text('Residente', 40, y);
    doc.text('Depto', 150, y);
    doc.text('Concepto', 210, y);
    doc.text('Fecha', 330, y);
    doc.text('Monto', 410, y);
    doc.text('Estado', 480, y);

    y += 15;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#cbd5e1').stroke();
    y += 10;

    doc.font('Helvetica').fontSize(9).fillColor('#334155');

    data.forEach((item: IPagoReporte) => {
      if (y > 740) { doc.addPage(); y = 40; }

      const montoNum = Number(item.monto) || 0;
      doc.text(item.residente || '-', 40, y);
      doc.text(item.departamento || '-', 150, y);
      doc.text(item.concepto || '-', 210, y);
      doc.text(item.fecha_pago || '-', 330, y);
      doc.text(`₡${montoNum.toLocaleString('en-US')}`, 410, y);
      doc.text(item.estado || '-', 480, y);
      y += 20;
    });

    this.renderFooter(doc);
    doc.end();
  }

  /**
   * Genera el PDF de visitas
   */
  public static generarPdfVisitas(data: IVisitaReporte[], res: Response): void {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: { Title: 'Reporte de Visitas - Boricuas Condominium', Author: 'Boricuas Condominium' }
    });
    doc.pipe(res);

    this.renderHeader(doc, 'REPORTE DE VISITAS', 'Control de Accesos y Seguridad');

    let y = 115;
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
    doc.text('Visitante', 40, y);
    doc.text('Residente', 180, y);
    doc.text('Depto', 320, y);
    doc.text('Fecha Ingreso', 380, y);
    doc.text('Estado', 480, y);

    y += 15;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#cbd5e1').stroke();
    y += 10;

    doc.font('Helvetica').fontSize(9).fillColor('#334155');

    data.forEach((item: IVisitaReporte) => {
      if (y > 740) { doc.addPage(); y = 40; }

      doc.text(item.visitante || '-', 40, y);
      doc.text(item.residente || '-', 180, y);
      doc.text(item.departamento || '-', 320, y);
      doc.text(item.fecha_ingreso || '-', 380, y);
      doc.text(item.estado || '-', 480, y);
      y += 20;
    });

    this.renderFooter(doc);
    doc.end();
  }

  // --- MÉTODOS PRIVADOS REUTILIZABLES ---

  private static renderHeader(doc: PDFKit.PDFDocument, titulo: string, subtitulo: string): void {
    try {
      SVGtoPDF(doc, LOGO_BORICUAS_SVG, 40, 30, {
        width: 150,
        preserveAspectRatio: 'xMinYMin meet'
      });
    } catch (error) {
      console.error('Error al renderizar el logo SVG:', error);
    }

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