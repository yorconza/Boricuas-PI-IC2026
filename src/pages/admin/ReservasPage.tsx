/**
 * ============================================================================
 * Archivo: ReservasPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de reservas (Admin). Muestra las reservas del día agrupadas por
 * horario (Mañana, Tarde, Noche) y el historial completo con filtros.
 *
 * Componentes que utiliza
 * - Drawer (detalle de la reserva)
 * - useData (contexto: adminReservas)
 * - useLocalDate (formato de fecha y hora)
 *
 * Pestañas
 * - Hoy: reservas del día filtradas por área, hora y estado
 * - Historial: reservas pasadas con filtros por fechas, área, estado, residente
 *
 * ============================================================================
 */

import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { getLocalDateString, formatHora } from '../../hooks/useLocalDate';
import Drawer from '../../components/Drawer';

function getIconForArea(area: string): string {
  const map: Record<string, string> = {
    'Salón Social': 'fa-champagne-glasses',
    'Piscina': 'fa-water',
    'Gimnasio': 'fa-dumbbell'
  };
  return map[area] || 'fa-calendar-day';
}

function getBadgeClass(estado: string): string {
  switch (estado) {
    case 'Confirmada': return 'badge-success';
    case 'Pendiente': return 'badge-warning';
    case 'Cancelada': return 'badge-error';
    case 'Finalizado': return 'badge-info';
    default: return '';
  }
}

function getEstadoDisplay(estado: string): string {
  return estado === 'Pendiente' ? 'Finalizado' : estado;
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const slots = [
  { label: 'Mañana', icon: 'fa-sun', start: 6, end: 11 },
  { label: 'Tarde', icon: 'fa-cloud-sun', start: 12, end: 17 },
  { label: 'Noche', icon: 'fa-moon', start: 18, end: 23 },
];

export default function ReservasPage() {
  const { adminReservas } = useData();
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState<any>(null);
  const today = getLocalDateString();
  const todayDateStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const openReservaDetail = (r: any) => {
    setSelectedReserva(r);
    setDrawerOpen(true);
  };

  return (
    <>
      <div className="page-header"><h2>Reservas</h2></div>

      <div className="reservas-tabs" id="reservasTabs">
        <button
          className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          Hoy
          <span className="tab-indicator"></span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Historial
          <span className="tab-indicator"></span>
        </button>
      </div>

      {activeTab === 'today' && (
        <TodayTab
          reservas={adminReservas}
          today={today}
          todayDateStr={todayDateStr}
          onOpenDetail={openReservaDetail}
        />
      )}
      {activeTab === 'history' && (
        <HistoryTab
          reservas={adminReservas}
          today={today}
          onOpenDetail={openReservaDetail}
        />
      )}

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Detalle de Reserva"
        size="md"
      >
        {selectedReserva && (
          <div className="detail-card">
            <div className="detail-row">
              <span className="detail-label">Área</span>
              <span className="detail-value">{selectedReserva.area}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Residente</span>
              <span className="detail-value">{selectedReserva.residente || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Departamento</span>
              <span className="detail-value">{selectedReserva.departamento || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Personas</span>
              <span className="detail-value">{selectedReserva.personas}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Fecha</span>
              <span className="detail-value">{selectedReserva.fecha}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Hora inicio</span>
              <span className="detail-value">{formatHora(selectedReserva.hora_inicio)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Hora fin</span>
              <span className="detail-value">{formatHora(selectedReserva.hora_fin)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Estado</span>
              <span className="detail-value">
                <span className={`badge ${getBadgeClass(selectedReserva.estado)}`}>
                  {getEstadoDisplay(selectedReserva.estado)}
                </span>
              </span>
            </div>
            {selectedReserva.costo !== undefined && (
              <div className="detail-row">
                <span className="detail-label">Costo</span>
                <span className="detail-value">${selectedReserva.costo}</span>
              </div>
            )}
            {selectedReserva.pago_estado && (
              <div className="detail-row">
                <span className="detail-label">Estado de pago</span>
                <span className="detail-value">{selectedReserva.pago_estado}</span>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}

// ============================================================
// TODAY TAB
// ============================================================
function TodayTab({
  reservas, today, todayDateStr, onOpenDetail
}: {
  reservas: any[]; today: string; todayDateStr: string;
  onOpenDetail: (r: any) => void;
}) {
  const hoy = reservas.filter(r => r.fecha === today && r.estado !== 'Cancelada');
  const [filterArea, setFilterArea] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTime, setFilterTime] = useState('all');

  const filtered = hoy.filter(r => {
    if (filterArea !== 'all' && r.area !== filterArea) return false;
    if (filterStatus !== 'all' && r.estado !== filterStatus) return false;
    if (filterTime !== 'all') {
      const hour = parseInt(r.hora_inicio.split(':')[0]);
      if (String(hour).padStart(2, '0') + ':00' !== filterTime) return false;
    }
    return true;
  });

  // Group by hour
  const hourGroups: Record<number, any[]> = {};
  filtered.forEach(r => {
    const hour = parseInt(r.hora_inicio.split(':')[0]);
    if (!hourGroups[hour]) hourGroups[hour] = [];
    hourGroups[hour].push(r);
  });

  return (
    <div className="tab-content active" id="tabToday">
      <div className="reservations-today-header">
        <div className="today-header-left">
          <span className="today-title">Hoy</span>
          <span className="today-date">{todayDateStr}</span>
        </div>
        <span className="today-count">{filtered.length} reservas</span>
      </div>

      <div className="filters-bar" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="filter-group">
          <label htmlFor="filterAreaToday">Área</label>
          <select
            id="filterAreaToday"
            value={filterArea}
            onChange={e => setFilterArea(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="Salón Social">Salón Social</option>
            <option value="Piscina">Piscina</option>
            <option value="Gimnasio">Gimnasio</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filterTimeToday">Hora</label>
          <select
            id="filterTimeToday"
            value={filterTime}
            onChange={e => setFilterTime(e.target.value)}
          >
            <option value="all">Todas</option>
            {Array.from({ length: 18 }, (_, i) => i + 6).map(h => (
              <option key={h} value={`${String(h).padStart(2, '0')}:00`}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filterStatusToday">Estado</label>
          <select
            id="filterStatusToday"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="Confirmada">Confirmada</option>
            <option value="Pendiente">Finalizado</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
        <button
          className="btn-secondary"
          style={{ padding: 'var(--space-1) var(--space-3)', fontSize: '0.7rem' }}
          onClick={() => { setFilterArea('all'); setFilterTime('all'); setFilterStatus('all'); }}
        >
          <i className="fas fa-undo"></i> Limpiar
        </button>
      </div>

      <div id="todayReservationsContainer">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-5)', color: 'var(--text-muted)' }}>
            <i className="fas fa-calendar-day" style={{ fontSize: '2rem', display: 'block', marginBottom: 'var(--space-2)' }}></i>
            <p>No hay reservas para hoy</p>
          </div>
        ) : (
          slots.map(slot => {
            const hoursInSlot = Object.keys(hourGroups)
              .map(Number)
              .filter(h => h >= slot.start && h <= slot.end)
              .sort((a, b) => a - b);

            if (hoursInSlot.length === 0) return null;

            return (
              <div key={slot.label} className="time-slot-group">
                <div className="slot-header">
                  <span className="slot-icon"><i className={`fas ${slot.icon}`}></i></span>
                  {slot.label}
                </div>
                {hoursInSlot.map(hour => {
                  const reservations = hourGroups[hour];
                  const timeStr = `${String(hour).padStart(2, '0')}:00`;
                  return (
                    <div key={hour} className="hour-block">
                      <div className="hour-header">
                        <i className="fas fa-clock"></i> {formatHora(timeStr)}
                        <span className="hour-count">
                          {reservations.length} reserva{reservations.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      {reservations.map(r => (
                        <div
                          key={r.id}
                          className="reservation-card"
                          onClick={() => onOpenDetail(r)}
                        >
                          <div className="card-icon">
                            <i className={`fas ${getIconForArea(r.area)}`}></i>
                          </div>
                          <div className="card-info">
                            <div className="area-name">{r.area}</div>
                            <div className="resident-name">
                              <i className="fas fa-user"></i> Residente
                            </div>
                          </div>
                          <div className="card-details">
                            <span className="detail-item">
                              <i className="fas fa-clock"></i> {formatHora(r.hora_inicio)} - {formatHora(r.hora_fin)}
                            </span>
                            <span className="detail-item">
                              <i className="fas fa-user-friends"></i> {r.personas} personas
                            </span>
                          </div>
                          <div className="card-status">
                            <span className={`badge ${getBadgeClass(r.estado)}`}>
                              {getEstadoDisplay(r.estado)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================
// HISTORY TAB
// ============================================================
function HistoryTab({
  reservas, today, onOpenDetail
}: {
  reservas: any[]; today: string;
  onOpenDetail: (r: any) => void;
}) {
  const [historyFechaDesde, setHistoryFechaDesde] = useState('');
  const [historyFechaHasta, setHistoryFechaHasta] = useState('');
  const [historyArea, setHistoryArea] = useState('all');
  const [historyEstado, setHistoryEstado] = useState('all');
  const [historyResidente, setHistoryResidente] = useState('');

  let filtered = reservas.filter(r => r.fecha !== today);
  if (historyFechaDesde) filtered = filtered.filter(r => r.fecha >= historyFechaDesde);
  if (historyFechaHasta) filtered = filtered.filter(r => r.fecha <= historyFechaHasta);
  if (historyArea !== 'all') filtered = filtered.filter(r => r.area === historyArea);
  if (historyEstado !== 'all') filtered = filtered.filter(r => r.estado === historyEstado);
  if (historyResidente) filtered = filtered.filter(r =>
    r.residente?.toLowerCase().includes(historyResidente.toLowerCase())
  );

  const resetFilters = () => {
    setHistoryFechaDesde('');
    setHistoryFechaHasta('');
    setHistoryArea('all');
    setHistoryEstado('all');
    setHistoryResidente('');
  };

  return (
    <div className="tab-content active" id="tabHistory">
      <div className="history-filters" id="historyFilters">
        <div className="filter-group">
          <label>Fecha desde</label>
          <input type="date" value={historyFechaDesde} onChange={e => setHistoryFechaDesde(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Fecha hasta</label>
          <input type="date" value={historyFechaHasta} onChange={e => setHistoryFechaHasta(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Área</label>
          <select value={historyArea} onChange={e => setHistoryArea(e.target.value)}>
            <option value="all">Todas</option>
            <option value="Salón Social">Salón Social</option>
            <option value="Piscina">Piscina</option>
            <option value="Gimnasio">Gimnasio</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Estado</label>
          <select value={historyEstado} onChange={e => setHistoryEstado(e.target.value)}>
            <option value="all">Todos</option>
            <option value="Confirmada">Confirmada</option>
            <option value="Pendiente">Finalizado</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Residente</label>
          <input type="text" placeholder="Buscar residente..." value={historyResidente} onChange={e => setHistoryResidente(e.target.value)} />
        </div>
        <button className="btn-secondary" style={{ fontSize: '0.7rem', padding: 'var(--space-1) var(--space-3)' }}>
          <i className="fas fa-search"></i> Filtrar
        </button>
        <button className="btn-secondary" style={{ fontSize: '0.7rem', padding: 'var(--space-1) var(--space-3)' }} onClick={resetFilters}>
          <i className="fas fa-undo"></i> Limpiar
        </button>
      </div>

      <table className="table-modern" id="reservasTable">
        <thead>
          <tr>
            <th>Área</th><th>Residente</th><th>Departamento</th><th>Personas</th><th>Fecha</th><th>Hora</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody id="reservasBody">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
                No se encontraron reservas con los filtros aplicados
              </td>
            </tr>
          ) : (
            filtered.map(r => (
              <tr key={r.id} className="dblclickable" onClick={() => onOpenDetail(r)}>
                <td data-label="Área">{r.area}</td>
                <td data-label="Residente">{r.residente || '—'}</td>
                <td data-label="Departamento">{r.departamento || '—'}</td>
                <td data-label="Personas">{r.personas}</td>
                <td data-label="Fecha">{r.fecha}</td>
                <td data-label="Hora">{formatHora(r.hora_inicio)}</td>
                <td data-label="Estado">
                  <span className={`badge ${getBadgeClass(r.estado)}`}>
                    {getEstadoDisplay(r.estado)}
                  </span>
                </td>
                <td data-label="Acciones" className="action-icons">
                  <a onClick={(e) => { e.stopPropagation(); onOpenDetail(r); }} aria-label="Ver">
                    <i className="fas fa-eye"></i>
                  </a>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
