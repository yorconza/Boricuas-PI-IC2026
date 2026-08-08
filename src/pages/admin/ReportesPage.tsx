/**
 * ============================================================================
 * Archivo: ReportesPage.tsx
 * ============================================================================
 *
 * Pantalla de reportes administrativos conectada al Backend de Express & SQL Server.
 * Permite previsualizar reportes en una pestaña nueva o abrirlos en formato JSON.
 *
 * ============================================================================
 */

import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';

// URL base de la API Backend (ajusta el puerto/HOST según tu entorno)
const API_URL = 'http://localhost:4000/api';

export default function ReportesPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerBody, setDrawerBody] = useState<React.ReactNode>(null);
  const [drawerFooter, setDrawerFooter] = useState<React.ReactNode>(null);
  
  // Estados para controlar los filtros del formulario
  const [reportType, setReportType] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [formato, setFormato] = useState<Record<string, string>>({
    reservas: 'PDF',
    pagos: 'PDF',
    contratos: 'PDF',
    visitas: 'PDF',
  });

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const handleFormatoChange = (tipo: string, val: string) => {
    setFormato((prev) => ({ ...prev, [tipo]: val }));
  };

  // Abrir el Drawer para seleccionar rango de fechas (resetea el estado previo)
  const abrirModalFiltros = (tipo: string) => {
    setReportType(tipo);
    setFechaInicio('');
    setFechaFin('');
    setDrawerFooter(null);
    setDrawerBody(null);
    setDrawerTitle(`Reporte de ${capitalize(tipo)}`);
    setDrawerOpen(true);
  };

  // Cerrar el Drawer y restablecer los estados internos
  const cerrarDrawer = () => {
    setDrawerOpen(false);
    setDrawerFooter(null);
    setDrawerBody(null);
  };

  // Abre la URL directamente en una pestaña nueva sin descargar
  const abrirEnNuevaPestana = (tipo: string, inicio: string, fin: string, formatoSel: string) => {
    // ----------------------------------------------------------------
    // 1. REPORTE DE PAGOS
    // ----------------------------------------------------------------
    if (tipo === 'pagos' && formatoSel === 'PDF') {
      const url = `${API_URL}/reportes/pagos/pdf?fecha_inicio=${inicio}&fecha_fin=${fin}`;
      window.open(url, '_blank');
      cerrarDrawer();
    } 
    else if (tipo === 'pagos' && formatoSel === 'JSON') {
      const url = `${API_URL}/reportes/pagos/data?fecha_inicio=${inicio}&fecha_fin=${fin}`;
      window.open(url, '_blank');
      cerrarDrawer();
    } 
    // ----------------------------------------------------------------
    // 2. REPORTE DE VISITAS AUTORIZADAS
    // ----------------------------------------------------------------
    else if (tipo === 'visitas' && formatoSel === 'PDF') {
      const url = `${API_URL}/reportes/visitas/pdf?fecha_inicio=${inicio}&fecha_fin=${fin}`;
      window.open(url, '_blank');
      cerrarDrawer();
    } 
    else if (tipo === 'visitas' && formatoSel === 'JSON') {
      const url = `${API_URL}/reportes/visitas/data?fecha_inicio=${inicio}&fecha_fin=${fin}`;
      window.open(url, '_blank');
      cerrarDrawer();
    } 
    // ----------------------------------------------------------------
    // OTROS REPORTES (EN DESARROLLO)
    // ----------------------------------------------------------------
    else {
      alert(`La visualización de reportes en formato ${formatoSel} para ${tipo} aún está en desarrollo.`);
    }
  };

  // Validar fechas y mostrar pantalla de confirmación dentro del Drawer
  const confirmarRango = (tipo: string, inicio: string, fin: string) => {
    if (!inicio || !fin) {
      alert('Selecciona la fecha de inicio y la fecha de fin para el reporte.');
      return;
    }
    if (inicio > fin) {
      alert('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    const formatoSel = formato[tipo] || 'PDF';
    const rangoTexto = `${inicio} al ${fin}`;

    setDrawerTitle(`Reporte de ${capitalize(tipo)} (${formatoSel})`);
    
    setDrawerBody(
      <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
        <i
          className={formatoSel === 'PDF' ? 'fas fa-file-pdf' : 'fas fa-file-code'}
          style={{ fontSize: '4rem', color: 'var(--accent)', marginBottom: 'var(--space-3)' }}
        ></i>
        <h3>Reporte listo para previsualizar</h3>
        <p style={{ color: 'var(--text-secondary)', margin: 'var(--space-3) 0' }}>
          Formato: <strong>{formatoSel}</strong> <br />
          Rango: <strong>{rangoTexto}</strong>
        </p>
      </div>
    );

    // Cambiamos el texto y el ícono del botón
    setDrawerFooter(
      <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', justifyContent: 'center' }}>
        <button
          className="btn-primary"
          onClick={() => abrirEnNuevaPestana(tipo, inicio, fin, formatoSel)}
        >
          <i className="fas fa-eye"></i> Visualizar Reporte
        </button>
        <button className="btn-secondary" onClick={cerrarDrawer}>
          Cerrar
        </button>
      </div>
    );
  };

  const reportes = [
    { tipo: 'reservas', titulo: 'Reporte de Reservas', desc: 'Informe detallado de todas las reservas.' },
    { tipo: 'pagos', titulo: 'Reporte de Pagos', desc: 'Resumen de pagos y recaudación financiera.' },
    { tipo: 'contratos', titulo: 'Reporte de Contratos', desc: 'Listado de contratos activos y vencidos.' },
    { tipo: 'visitas', titulo: 'Reporte de Visitas', desc: 'Registro de accesos autorizados con filtros.' },
  ];

  return (
    <>
      <PageHeader title="Reportes Administrativos" />

      <div className="reports-grid">
        {reportes.map((r) => (
          <div key={r.tipo} className="report-card">
            <h4>{r.titulo}</h4>
            <p>{r.desc}</p>
            <div className="report-actions">
              <select
                value={formato[r.tipo]}
                onChange={(e) => handleFormatoChange(r.tipo, e.target.value)}
              >
                <option value="PDF">PDF</option>
                <option value="JSON">JSON</option>
                <option value="Excel">Excel</option>
                <option value="XML">XML</option>
              </select>
              <button className="btn-primary" onClick={() => abrirModalFiltros(r.tipo)}>
                Generar
              </button>
            </div>
          </div>
        ))}
      </div>

      <Drawer
        isOpen={drawerOpen}
        onClose={cerrarDrawer}
        title={drawerTitle}
        size="md"
        footer={
          drawerFooter || (
            <button
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => confirmarRango(reportType, fechaInicio, fechaFin)}
            >
              <i className="fas fa-file-export"></i> Continuar
            </button>
          )
        }
      >
        {!drawerFooter ? (
          <div className="form-section">
            <h4>Rango de fechas</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reporteFechaInicio">Fecha inicio</label>
                <input
                  type="date"
                  id="reporteFechaInicio"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reporteFechaFin">Fecha fin</label>
                <input
                  type="date"
                  id="reporteFechaFin"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          drawerBody
        )}
      </Drawer>
    </>
  );
}