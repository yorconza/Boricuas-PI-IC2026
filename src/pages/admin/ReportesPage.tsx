/**
 * ============================================================================
 * Archivo: ReportesPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de reportes administrativos. Permite generar reportes en
 * diferentes formatos (PDF, Excel, JSON, XML) para reservas, pagos,
 * contratos y visitas.
 *
 * Componentes que utiliza
 * - PageHeader (título)
 * - Drawer (selector de fechas y descarga del reporte)
 *
 * ============================================================================
 */

import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import { useAlert } from '../../components/Alert';

export default function ReportesPage() {
  const { showAlert } = useAlert();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerBody, setDrawerBody] = useState<React.ReactNode>(null);
  const [drawerFooter, setDrawerFooter] = useState<React.ReactNode>(null);
  // NOTA (cambio para compilar con `tsc -b`): se eliminó el estado `reportType`
  // porque solo se escribía (setReportType) pero nunca se leía (TS6133).

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const generarReporte = (tipo: string) => {
    setDrawerTitle(`Reporte de ${capitalize(tipo)}`);
    setDrawerBody(
      <div className="form-section">
        <h4>Rango de fechas</h4>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="reporteFechaInicio">Fecha inicio</label>
            <input type="date" id="reporteFechaInicio" />
          </div>
          <div className="form-group">
            <label htmlFor="reporteFechaFin">Fecha fin</label>
            <input type="date" id="reporteFechaFin" />
          </div>
        </div>
      </div>
    );
    setDrawerFooter(
      <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => confirmarRango(tipo)}>
        <i className="fas fa-file-export"></i> Generar reporte
      </button>
    );
    setDrawerOpen(true);
  };

  const confirmarRango = (tipo: string) => {
    const fechaInicio = (document.getElementById('reporteFechaInicio') as HTMLInputElement)?.value;
    const fechaFin = (document.getElementById('reporteFechaFin') as HTMLInputElement)?.value;

    if (!fechaInicio || !fechaFin) {
      showAlert('Selecciona la fecha de inicio y la fecha de fin para el reporte.');
      return;
    }
    if (fechaInicio > fechaFin) {
      showAlert('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    const rangoTexto = `${fechaInicio} al ${fechaFin}`;
    setDrawerTitle(`Reporte de ${capitalize(tipo)}`);
    setDrawerBody(
      <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
        <i className="fas fa-file-pdf" style={{ fontSize: '4rem', color: 'var(--accent)', marginBottom: 'var(--space-3)' }}></i>
        <h3>Reporte listo para descargar</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 'var(--space-3) 0' }}>
          El informe se generó correctamente para el rango <strong>{rangoTexto}</strong>.
        </p>
      </div>
    );
    setDrawerFooter(
      <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', justifyContent: 'center' }}>
        <button className="btn-primary" onClick={() => showAlert('Descargando...')}>
          <i className="fas fa-download"></i> Descargar
        </button>
        <button className="btn-secondary" onClick={() => setDrawerOpen(false)}>
          Cerrar
        </button>
      </div>
    );
  };

  const reportes = [
    { tipo: 'reservas', titulo: 'Reporte de Reservas', desc: 'Informe detallado de todas las reservas.' },
    { tipo: 'pagos', titulo: 'Reporte de Pagos', desc: 'Resumen de pagos y morosidad.' },
    { tipo: 'contratos', titulo: 'Reporte de Contratos', desc: 'Listado de contratos activos y vencidos.' },
    { tipo: 'visitas', titulo: 'Reporte de Visitas', desc: 'Registro de accesos autorizados con filtros.' },
  ];

  return (
    <>
      <PageHeader title="Reportes" />

      <div className="reports-grid">
        {reportes.map(r => (
          <div key={r.tipo} className="report-card">
            <h4>{r.titulo}</h4>
            <p>{r.desc}</p>
            <div className="report-actions">
              <select defaultValue="PDF">
                <option>PDF</option>
                <option>Excel</option>
                <option>JSON</option>
                <option>XML</option>
              </select>
              <button className="btn-primary" onClick={() => generarReporte(r.tipo)}>
                Generar
              </button>
            </div>
          </div>
        ))}
      </div>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        size="md"
        footer={drawerFooter}
      >
        {drawerBody}
      </Drawer>
    </>
  );
}
