// src/services/pdfServices.ts
import PDFDocument from 'pdfkit';
import { type Response } from 'express';

// ==========================================
// 1. INTERFACES
// ==========================================

export interface IPagoReporte {
    id_pago: number;
    residente: string | null;
    concepto: string | null;
    monto: number;
    fecha_pago: Date | string;
    metodo_pago: string | null;
    estado: string | null;
}

export interface IVisitaReporte {
    id_visitante: number;
    visitante?: string | null;
    nombre_visitante?: string | null;
    cedula?: string | null;
    documento_identidad?: string | null;
    placa?: string | null;
    autorizado_por?: string | null;
    fecha_autorizacion: Date | string;
    estado?: string | null;
}

// ==========================================
// 2. REPORTE DE PAGOS (PDF)
// ==========================================

export function generarPDFReportePagos(
    pagos: IPagoReporte[],
    fechaInicio: string | undefined,
    fechaFin: string | undefined,
    streamRespuesta: Response
): void {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Canaliza la salida del PDF directamente a la respuesta HTTP Express
    doc.pipe(streamRespuesta);

    // ENCABEZADO PRINCIPAL
    doc.fillColor('#1A365D')
       .fontSize(18)
       .text('REPORTE FINANCIERO DE PAGOS', { align: 'center' });

    doc.fontSize(10)
       .fillColor('#4A5568')
       .text('Condominio - Sistema de Administración', { align: 'center' });

    doc.moveDown(0.5);

    const textoRango = (fechaInicio && fechaFin)
        ? `Período: del ${fechaInicio} al ${fechaFin}`
        : 'Período: Histórico General';

    doc.fontSize(9)
       .fillColor('#718096')
       .text(textoRango, { align: 'center' });

    doc.moveDown(1.5);

    const startX = 40;
    let currentY = doc.y;

    // Encabezado de la tabla de pagos
    const dibujarEncabezadoTabla = (y: number) => {
        doc.rect(startX, y, 515, 20).fill('#2B6CB0');
        doc.fillColor('#FFFFFF')
           .fontSize(9)
           .text('ID', startX + 5, y + 5, { width: 30 })
           .text('Residente / Cédula', startX + 40, y + 5, { width: 140 })
           .text('Concepto', startX + 185, y + 5, { width: 125 })
           .text('Método', startX + 315, y + 5, { width: 70 })
           .text('Fecha', startX + 390, y + 5, { width: 60 })
           .text('Monto', startX + 455, y + 5, { width: 55, align: 'right' });
    };

    dibujarEncabezadoTabla(currentY);
    currentY += 22;

    let totalAcumulado = 0;

    if (!pagos || pagos.length === 0) {
        doc.moveDown(1);
        doc.fontSize(10)
           .fillColor('#E53E3E')
           .text('No se encontraron pagos registrados en el rango de fechas seleccionado.', { align: 'center' });
    } else {
        pagos.forEach((pago: IPagoReporte, index: number) => {
            if (currentY > 730) {
                doc.addPage();
                currentY = 40;
                dibujarEncabezadoTabla(currentY);
                currentY += 22;
            }

            if (index % 2 === 0) {
                doc.rect(startX, currentY - 2, 515, 18).fill('#F7FAFC');
            }

            const fechaFormateada = pago.fecha_pago 
                ? new Date(pago.fecha_pago).toLocaleDateString('es-CR') 
                : 'N/A';
            const montoNum = Number(pago.monto) || 0;
            totalAcumulado += montoNum;

            doc.fontSize(8)
               .fillColor('#2D3748')
               .text(pago.id_pago.toString(), startX + 5, currentY, { width: 30 })
               .text(pago.residente || 'Sin Cédula', startX + 40, currentY, { width: 140, lineBreak: false })
               .text(pago.concepto || 'Pago General', startX + 185, currentY, { width: 125, lineBreak: false })
               .text(pago.metodo_pago || 'Efectivo', startX + 315, currentY, { width: 70 })
               .text(fechaFormateada, startX + 390, currentY, { width: 60 })
               .text(`₡${montoNum.toLocaleString('es-CR')}`, startX + 455, currentY, { width: 55, align: 'right' });

            currentY += 18;
        });

        if (currentY > 720) {
            doc.addPage();
            currentY = 40;
        }

        currentY += 10;
        doc.rect(startX + 290, currentY, 225, 25).fill('#EDF2F7');
        doc.fillColor('#1A202C')
           .fontSize(10)
           .text('TOTAL RECAUDADO:', startX + 300, currentY + 7)
           .text(`₡${totalAcumulado.toLocaleString('es-CR')}`, startX + 430, currentY + 7, { align: 'right' });
    }

    doc.end();
}

// ==========================================
// 3. REPORTE DE VISITAS AUTORIZADAS (PDF)
// ==========================================

export function generarPDFReporteVisitas(
    visitas: IVisitaReporte[],
    fechaInicio: string | undefined,
    fechaFin: string | undefined,
    streamRespuesta: Response
): void {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    doc.pipe(streamRespuesta);

    // ENCABEZADO PRINCIPAL
    doc.fillColor('#1A365D')
       .fontSize(18)
       .text('REPORTE DE VISITAS AUTORIZADAS', { align: 'center' });

    doc.fontSize(10)
       .fillColor('#4A5568')
       .text('Condominio - Control de Acceso y Seguridad', { align: 'center' });

    doc.moveDown(0.5);

    const textoRango = (fechaInicio && fechaFin)
        ? `Período: del ${fechaInicio} al ${fechaFin}`
        : 'Período: Histórico General';

    doc.fontSize(9)
       .fillColor('#718096')
       .text(textoRango, { align: 'center' });

    doc.moveDown(1.5);

    const startX = 40;
    let currentY = doc.y;

    // Encabezado de la tabla de visitas
    const dibujarEncabezadoTabla = (y: number) => {
        doc.rect(startX, y, 515, 20).fill('#2B6CB0');
        doc.fillColor('#FFFFFF')
           .fontSize(9)
           .text('Visitante', startX + 5, y + 5, { width: 110 })
           .text('Cédula', startX + 120, y + 5, { width: 75 })
           .text('Placa', startX + 200, y + 5, { width: 60 })
           .text('Autorizado Por', startX + 265, y + 5, { width: 125 })
           .text('Fecha', startX + 395, y + 5, { width: 60 })
           .text('Estado', startX + 460, y + 5, { width: 50, align: 'center' });
    };

    dibujarEncabezadoTabla(currentY);
    currentY += 22;

    if (!visitas || visitas.length === 0) {
        doc.moveDown(1);
        doc.fontSize(10)
           .fillColor('#E53E3E')
           .text('No se encontraron visitas autorizadas en el rango de fechas seleccionado.', { align: 'center' });
    } else {
        visitas.forEach((visita: IVisitaReporte, index: number) => {
            if (currentY > 730) {
                doc.addPage();
                currentY = 40;
                dibujarEncabezadoTabla(currentY);
                currentY += 22;
            }

            if (index % 2 === 0) {
                doc.rect(startX, currentY - 2, 515, 18).fill('#F7FAFC');
            }

            const fechaFormateada = visita.fecha_autorizacion 
                ? new Date(visita.fecha_autorizacion).toLocaleDateString('es-CR') 
                : 'N/A';

            // Mapeo seguro con respaldos de nombres de propiedad
            const nombreVisitante = visita.visitante || visita.nombre_visitante || 'Anónimo';
            const cedulaVisitante = visita.cedula || visita.documento_identidad || 'N/A';
            const placaVehiculo = visita.placa || 'N/A';
            const autorizador = visita.autorizado_por || 'Residente';
            const estadoVisita = visita.estado || 'Pendiente';

            doc.fontSize(8)
               .fillColor('#2D3748')
               .text(nombreVisitante, startX + 5, currentY, { width: 110, lineBreak: false })
               .text(cedulaVisitante, startX + 120, currentY, { width: 75, lineBreak: false })
               .text(placaVehiculo, startX + 200, currentY, { width: 60, lineBreak: false })
               .text(autorizador, startX + 265, currentY, { width: 125, lineBreak: false })
               .text(fechaFormateada, startX + 395, currentY, { width: 60 })
               .text(estadoVisita, startX + 460, currentY, { width: 50, align: 'center' });

            currentY += 18;
        });

        // Resumen total al final de la tabla
        if (currentY > 720) {
            doc.addPage();
            currentY = 40;
        }

        currentY += 10;
        doc.rect(startX + 315, currentY, 200, 25).fill('#EDF2F7');
        doc.fillColor('#1A202C')
           .fontSize(10)
           .text('TOTAL VISITAS:', startX + 325, currentY + 7)
           .text(`${visitas.length}`, startX + 440, currentY + 7, { width: 65, align: 'right' });
    }

    doc.end();
}