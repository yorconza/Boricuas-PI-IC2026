/**
 * ============================================================================
 * Archivo: ReportesPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de reportes administrativos. Genera reportes reales en PDF
 * conectados a la base de datos para contratos y reservas.
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

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // 🚀 Función para abrir/descargar el PDF real desde Node.js
  const ejecutarDescargaPDF = (tipo: string, fechaInicio: string, fechaFin: string) => {
    const baseUrl = 'http://localhost:4000/api';

    // 1. Si no es un reporte disponible, mostramos alerta y salimos
    if (tipo !== 'contratos' && tipo !== 'reservas') {
      showAlert(`El reporte de ${tipo} estará disponible próximamente.`);
      return;
    }

    // 2. Definimos el endpoint según el tipo
    const endpoint = tipo === 'contratos'
      ? `${baseUrl}/contratos/reporte/pdf`
      : `${baseUrl}/reportes/reservas/pdf`;

    // 3. Construimos los parámetros URL si existen fechas
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);

    const queryString = params.toString() ? `?${params.toString()}` : '';

    // 4. Abrimos el PDF en nueva pestaña y cerramos el drawer
    window.open(`${endpoint}${queryString}`, '_blank');
    setDrawerOpen(false);
  };

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
      <button 
        className="btn-primary" 
        style={{ width: '100%', justifyContent: 'center' }} 
        onClick={() => confirmarRango(tipo)}
      >
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
        <button 
          className="btn-primary" 
          onClick={() => ejecutarDescargaPDF(tipo, fechaInicio, fechaFin)}
        >
          <i className="fas fa-download"></i> Abrir PDF
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
    //{ tipo: 'bitacora', titulo:'Reporte de bitácora', desc: 'Informe de bitácora'}
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