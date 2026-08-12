/**
 * ============================================================================
 * Archivo: ReportesPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de reportes administrativos conectada al Backend de Express & SQL Server.
 * Genera y previsualiza reportes reales (PDF/JSON) para Reservas, Pagos, Contratos y Visitas.
 *
 * Componentes que utiliza
 * - PageHeader (título)
 * - Drawer (selector de fechas y descarga del reporte)
 * - useAlert (notificaciones tipo toast/alert)
 *
 * ============================================================================
 */

import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import { useAlert } from '../../components/Alert';

const API_URL = 'http://localhost:4000/api';

export default function ReportesPage() {
  const { showAlert } = useAlert();
  
  // Estados para controlar la interfaz del Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerBody, setDrawerBody] = useState<React.ReactNode>(null);
  const [drawerFooter, setDrawerFooter] = useState<React.ReactNode>(null);

  // Estados de control de filtros
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

  // Abrir el Drawer de fechas reseteando selecciones previas
  const abrirModalFiltros = (tipo: string) => {
    setReportType(tipo);
    setFechaInicio('');
    setFechaFin('');
    setDrawerFooter(null);
    setDrawerBody(null);
    setDrawerTitle(`Reporte de ${capitalize(tipo)}`);
    setDrawerOpen(true);
  };

  const cerrarDrawer = () => {
    setDrawerOpen(false);
    setDrawerFooter(null);
    setDrawerBody(null);
  };

  // 🚀 Abre el PDF o JSON en una pestaña nueva según las rutas configuradas en el backend
  const abrirEnNuevaPestana = (tipo: string, inicio: string, fin: string, formatoSel: string) => {
    const params = new URLSearchParams();
    if (inicio) params.append('fecha_inicio', inicio);
    if (fin) params.append('fecha_fin', fin);

    const queryString = params.toString() ? `?${params.toString()}` : '';

    // Mapeo dinámico de rutas según tipo y formato
    const mapaRutas: Record<string, Record<string, string>> = {
      pagos: {
        PDF: `${API_URL}/reportes/pagos/pdf${queryString}`,
        JSON: `${API_URL}/reportes/pagos/data${queryString}`,
      },
      visitas: {
        PDF: `${API_URL}/reportes/visitas/pdf${queryString}`,
        JSON: `${API_URL}/reportes/visitas/data${queryString}`,
      },
      contratos: {
        PDF: `${API_URL}/reportes/contratos/pdf${queryString}`,
        JSON: `${API_URL}/reportes/contratos/data${queryString}`,
      },
      reservas: {
        PDF: `${API_URL}/reportes/reservas/pdf${queryString}`,
        JSON: `${API_URL}/reportes/reservas/data${queryString}`,
      },
    };

    const targetUrl = mapaRutas[tipo]?.[formatoSel];

    if (targetUrl) {
      window.open(targetUrl, '_blank');
      cerrarDrawer();
    } else {
      showAlert(`El formato ${formatoSel} para el reporte de ${tipo} no está disponible actualmente.`);
    }
  };

  // Validación de fechas y vista previa en el Drawer
  const confirmarRango = (tipo: string, inicio: string, fin: string) => {
    if (!inicio || !fin) {
      showAlert('Selecciona la fecha de inicio y la fecha de fin para el reporte.');
      return;
    }
    if (inicio > fin) {
      showAlert('La fecha de inicio no puede ser posterior a la fecha de fin.');
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

    setDrawerFooter(
      <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', justifyContent: 'center' }}>
        <button
          className="btn-primary"
          onClick={() => abrirEnNuevaPestana(tipo, inicio, fin, formatoSel)}
        >
          <i className={formatoSel === 'PDF' ? 'fas fa-eye' : 'fas fa-code'}></i> Visualizar Reporte
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