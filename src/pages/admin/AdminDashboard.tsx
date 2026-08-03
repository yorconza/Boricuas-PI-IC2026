/**
 * ============================================================================
 * Archivo: AdminDashboard.tsx
 * ============================================================================
 */

import { useData } from '../../context/DataContext';
import { getLocalDateString, getTimeAgo } from '../../hooks/useLocalDate';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  // 1. Asignamos valores por defecto (Arrays vacíos) por si el Context falla o viene undefined
  // NOTA (cambio para compilar con `tsc -b`): DataContext expone las reservas
  // del admin como `reservasData` (la variable interna se llama `adminReservas`,
  // pero NO forma parte de `DataContextType`). Se usa `reservasData` para
  // corregir TS2339 (la propiedad `adminReservas` no existe en el tipo del contexto).
  const { 
    reservasData = [], 
    activityLog = [], 
    alertas = [] 
  } = useData() || {};

  const today = getLocalDateString();

  // 2. Evaluamos (reservasData || []) antes del .filter() para garantizar la inmunidad ante undefined
  const reservasHoy = (reservasData || []).filter(
    r => r?.fecha === today && r?.estado !== 'Cancelada'
  );

  return (
    <>
      <h2 style={{ marginBottom: 'var(--space-4)' }}>Dashboard</h2>

      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => onNavigate('reservas')} tabIndex={0} role="button">
          <div className="kpi-icon"><i className="fas fa-calendar-day"></i></div>
          <div className="kpi-label">Reservas hoy</div>
          <div className="kpi-value" id="kpiReservasHoy">{reservasHoy.length}</div>
        </div>
        <div className="kpi-card" onClick={() => onNavigate('empresas')} tabIndex={0} role="button">
          <div className="kpi-icon"><i className="fas fa-user-check"></i></div>
          <div className="kpi-label">Visitas registradas</div>
          <div className="kpi-value">8</div>
        </div>
        <div className="kpi-card" onClick={() => onNavigate('contratos')} tabIndex={0} role="button">
          <div className="kpi-icon"><i className="fas fa-file-contract"></i></div>
          <div className="kpi-label">Contratos activos</div>
          <div className="kpi-value">34</div>
        </div>
        <div className="kpi-card" onClick={() => onNavigate('areas')} tabIndex={0} role="button">
          <div className="kpi-icon"><i className="fas fa-people-arrows"></i></div>
          <div className="kpi-label">Áreas ocupadas</div>
          <div className="kpi-value">6</div>
        </div>
        <div className="kpi-card" onClick={() => onNavigate('pagos')} tabIndex={0} role="button">
          <div className="kpi-icon"><i className="fas fa-coins"></i></div>
          <div className="kpi-label">Ingresos del día</div>
          <div className="kpi-value">₡1.280</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3>Próximas reservas</h3>
            <a href="#reservas" onClick={e => { e.preventDefault(); onNavigate('reservas'); }}>Ver todas</a>
          </div>
          <div className="next-reservation-item">
            <span className="reservation-time">18:00</span>
            <span className="reservation-info"><strong>Salón Social</strong> · María Pérez</span>
          </div>
          <div className="next-reservation-item">
            <span className="reservation-time">20:00</span>
            <span className="reservation-info"><strong>Piscina</strong> · Carlos Gómez</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Alertas administrativas</h3></div>
          <div id="alertasContainer">
            {(!alertas || alertas.length === 0) ? (
              <p style={{ color: 'var(--text-muted)', padding: 'var(--space-2) 0' }}>No hay alertas.</p>
            ) : (
              alertas.slice(0, 5).map(alerta => (
                <div key={alerta.id} className="alert-item">
                  <span className="alert-text" dangerouslySetInnerHTML={{ __html: alerta.descripcion }}></span>
                  <span className="alert-badge">
                    <span className={`badge ${alerta.prioridad === 'Alta' ? 'badge-priority-high' : alerta.prioridad === 'Media' ? 'badge-priority-medium' : 'badge-priority-low'}`}>
                      {alerta.prioridad}
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Actividad reciente</h3>
            <a href="#actividad" onClick={e => { e.preventDefault(); onNavigate('actividad'); }}>Ver todas</a>
          </div>
          <div id="actividadContainer">
            {(!activityLog || activityLog.length === 0) ? (
              <p style={{ color: 'var(--text-muted)', padding: 'var(--space-2) 0' }}>No hay actividad reciente.</p>
            ) : (
              activityLog.slice(0, 5).map(item => (
                <div key={item.id} className="activity-item">
                  <span className="activity-dot" style={{ background: item.color }}></span>
                  <span className="activity-text" dangerouslySetInnerHTML={{ __html: item.descripcion }}></span>
                  <span className="activity-time">{getTimeAgo(item.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}