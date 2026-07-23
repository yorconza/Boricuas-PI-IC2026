/**
 * ============================================================================
 * Archivo: GuardiaDashboard.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla principal del panel de Guardia. Muestra KPIs de visitas:
 * pendientes, autorizadas hoy y rechazadas hoy. También lista las
 * próximas visitas pendientes.
 *
 * Componentes que utiliza
 * - useData (contexto: visitas)
 * - useLocalDate (formato de hora y fecha)
 *
 * ============================================================================
 */

import { useData } from '../../context/DataContext';
import { formatHoraAMPM, getLocalDateString } from '../../hooks/useLocalDate';

export default function GuardiaDashboard() {
  const { visitas } = useData();
  const today = getLocalDateString();

  const pendientes = visitas.filter(v => v.estado === 'Pendiente').length;
  const autorizadosHoy = visitas.filter(v => v.estado === 'Autorizado' && v.fecha_autorizacion?.startsWith(today)).length;
  const rechazadosHoy = visitas.filter(v => v.estado === 'Rechazado' && v.fecha_autorizacion?.startsWith(today)).length;

  return (
    <>
      <h2 style={{ marginBottom: 'var(--space-4)' }}>Dashboard</h2>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon"><i className="fas fa-hourglass-half"></i></div>
          <div className="kpi-label">Visitas Pendientes</div>
          <div className="kpi-value" id="pendientesCount">{pendientes}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><i className="fas fa-check-circle"></i></div>
          <div className="kpi-label">Autorizadas Hoy</div>
          <div className="kpi-value" id="autorizadasHoyCount">{autorizadosHoy}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><i className="fas fa-times-circle"></i></div>
          <div className="kpi-label">Rechazadas Hoy</div>
          <div className="kpi-value" id="rechazadasHoyCount">{rechazadosHoy}</div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Próximas visitas</h3>
            <a href="#visitas" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500 }}>Ver todas</a>
          </div>
          <div id="ultimasVisitasContainer">
            {visitas.filter(v => v.estado === 'Pendiente').slice(0, 4).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-2)' }}>No hay visitas pendientes</p>
            ) : (
              visitas.filter(v => v.estado === 'Pendiente').slice(0, 4).map(v => {
                const horaOriginal = v.fecha_autorizacion?.split(' ')[1] || '--:--';
                const horaFormateada = formatHoraAMPM(horaOriginal);
                return (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{v.nombre_completo}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 'var(--space-2)' }}>{v.departamento || ''}</span>
                    </div>
                    <div>
                      <span className="badge badge-warning">Pendiente</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 'var(--space-2)' }}>{horaFormateada}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
