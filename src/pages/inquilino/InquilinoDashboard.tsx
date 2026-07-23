/**
 * ============================================================================
 * Archivo: InquilinoDashboard.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla principal del panel de Inquilino. Muestra la próxima reserva,
 * la próxima visita y accesos rápidos a las funciones principales.
 *
 * Componentes que utiliza
 * - useData (contexto: inquilinoReservasData, inquilinoVisitantesData)
 * - useLocalDate (formato de hora)
 *
 * ============================================================================
 */

import { useData } from '../../context/DataContext';
import { formatHoraAMPM } from '../../hooks/useLocalDate';

export default function InquilinoDashboard() {
  const { inquilinoReservasData, inquilinoVisitantesData } = useData();

  const proximaReserva = inquilinoReservasData.filter(r => r.estado !== 'Cancelada')[0] || null;
  const proximaVisita = inquilinoVisitantesData.filter(v => v.estado === 'Pendiente')[0] || null;

  const goTo = (page: string) => {
    window.location.hash = page;
  };

  return (
    <>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Bienvenido nuevamente.</p>
      </div>

      <div className="dashboard-grid-inquilino">
        <div className="card">
          <div className="card-header"><h3>Mi próxima reserva</h3></div>
          <div id="proximaReservaContainer">
            {!proximaReserva ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-2)' }}>No tienes reservas próximas</p>
            ) : (
              <div className="reservation-preview">
                <div className="reservation-icon"><i className="fas fa-calendar"></i></div>
                <div className="reservation-info">
                  <div className="title">{proximaReserva.area}</div>
                  <div className="subtitle">{proximaReserva.fecha} · {formatHoraAMPM(proximaReserva.hora_inicio)} - {formatHoraAMPM(proximaReserva.hora_fin)}</div>
                </div>
                <div className="reservation-actions">
                  <button className="btn-sm" onClick={() => goTo('mis-reservas')}>Ver reserva</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Mi próxima visita</h3></div>
          <div id="proximaVisitaContainer">
            {!proximaVisita ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-2)' }}>No tienes visitas próximas</p>
            ) : (
              <div className="visit-preview">
                <div className="visit-icon"><i className="fas fa-user"></i></div>
                <div className="visit-info">
                  <div className="title">{proximaVisita.nombre}</div>
                  <div className="subtitle">Hoy · {proximaVisita.hora_esperada && proximaVisita.hora_esperada !== '--:--' ? formatHoraAMPM(proximaVisita.hora_esperada) : '--:--'}</div>
                  <div style={{ marginTop: '4px' }}><span className="badge badge-warning">Pendiente</span></div>
                </div>
                <div className="visit-actions">
                  <button className="btn-sm" onClick={() => goTo('mis-visitantes')}>Ver visita</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-4)' }}>
        <div className="card-header"><h3>Accesos rápidos</h3></div>
        <div className="quick-actions">
          <a className="quick-action-btn" onClick={() => goTo('registrar-visitante')}><i className="fas fa-user-plus"></i> Registrar visitante</a>
          <a className="quick-action-btn" onClick={() => goTo('reservar-area')}><i className="fas fa-plus-circle"></i> Reservar área</a>
          <a className="quick-action-btn" onClick={() => goTo('mis-reservas')}><i className="fas fa-calendar-alt"></i> Mis reservas</a>
          <a className="quick-action-btn" onClick={() => goTo('mis-visitantes')}><i className="fas fa-users"></i> Mis visitantes</a>
        </div>
      </div>
    </>
  );
}
