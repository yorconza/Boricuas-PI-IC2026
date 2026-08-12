/**
 * ============================================================================
 * Archivo: ReservasPage.tsx
 * ============================================================================
 */

import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import { useData } from '../../context/DataContext';
import type { Reserva } from '../../types';

// Extensión de la interfaz para soportar los campos transformados del DataContext
interface ReservaUI extends Reserva {
  id?: number;
  id_reserva?: number;
  id_area?: number;
  hora?: string;
  hora_inicio?: string;
  hora_fin?: string;
  personas?: number;
  cantidad_personas?: number;
}

export default function ReservasPage() {
  const { reservasData } = useData();

  const [activeTab, setActiveTab] = useState<'hoy' | 'historial'>('hoy');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReservaUI | null>(null);

  // Filtros de búsqueda
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroHora, setFiltroHora] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [buscarResidente, setBuscarResidente] = useState('');

  // Fecha actual en ISO
  const hoyFechaStr = new Date().toISOString().split('T')[0];

  // Cast seguro de reservasData al tipo con soporte UI
  const reservas = (reservasData || []) as ReservaUI[];

  // Filtrado de la lista en memoria según la pestaña activa
  const reservasFiltradas = reservas.filter((r: ReservaUI) => {
    if (activeTab === 'hoy' && r.fecha !== hoyFechaStr) {
      return false;
    }
    if (filtroArea && r.id_area !== Number(filtroArea)) return false;
    
    // Soporte para filtrar hora usando r.hora o r.hora_inicio
    const hInicio = r.hora_inicio || (r.hora ? r.hora.split(' - ')[0] : '');
    if (filtroHora && !hInicio.startsWith(filtroHora)) return false;

    if (filtroEstado && r.estado !== filtroEstado) return false;
    if (buscarResidente && !r.residente?.toLowerCase().includes(buscarResidente.toLowerCase())) return false;

    return true;
  });

  const resetFilters = () => {
    setFiltroArea('');
    setFiltroHora('');
    setFiltroEstado('');
    setBuscarResidente('');
  };

  const openDrawer = (item: ReservaUI) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const renderDrawerContent = () => {
    if (!selectedItem) return null;

    const item = selectedItem;
    const horario = item.hora || (item.hora_inicio && item.hora_fin ? `${item.hora_inicio} - ${item.hora_fin}` : '-');
    const numPersonas = item.personas ?? item.cantidad_personas ?? '-';

    return (
      <div className="detail-card">
        <div className="detail-row">
          <span className="detail-label">Residente</span>
          <span className="detail-value">{item.residente || '-'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Área</span>
          <span className="detail-value">{item.area || '-'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Fecha</span>
          <span className="detail-value">{item.fecha}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Horario</span>
          <span className="detail-value">{horario}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Personas</span>
          <span className="detail-value">{numPersonas}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Estado</span>
          <span className="detail-value">
            <span className={`badge ${item.estado === 'Reservado' || item.estado === 'Confirmada' ? 'badge-success' : 'badge-warning'}`}>
              {item.estado}
            </span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Reservas" />

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'hoy' ? 'active' : ''}`} 
          onClick={() => setActiveTab('hoy')}
        >
          Hoy
        </button>
        <button 
          className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`} 
          onClick={() => setActiveTab('historial')}
        >
          Historial
        </button>
      </div>

      <div className="filters-bar">
        {activeTab === 'historial' && (
          <div className="filter-group">
            <label>Residente</label>
            <input 
              type="text" 
              placeholder="Residente..." 
              value={buscarResidente} 
              onChange={e => setBuscarResidente(e.target.value)} 
            />
          </div>
        )}
        <div className="filter-group">
          <label>Área</label>
          <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}>
            <option value="">Todas</option>
            <option value="1">Piscina</option>
            <option value="2">Ranchos BBQ</option>
            <option value="3">Gimnasio</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Estado</label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="Reservado">Reservado</option>
            <option value="Confirmada">Confirmada</option>
            <option value="Completado">Completado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
        <button className="btn-secondary" onClick={resetFilters}>
          <i className="fas fa-undo"></i> Limpiar
        </button>
      </div>

      {reservasFiltradas.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
          <i className="fas fa-calendar-times" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
          <p style={{ marginTop: '1rem' }}>No hay reservas para mostrar {activeTab === 'hoy' ? 'hoy' : 'en el historial'}</p>
        </div>
      ) : (
        <table className="table-modern">
          <thead>
            <tr>
              <th>Residente</th>
              <th>Área</th>
              <th>Fecha</th>
              <th>Horario</th>
              <th>Personas</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservasFiltradas.map((r: ReservaUI) => {
              const resId = r.id ?? r.id_reserva ?? 0;
              const horario = r.hora || (r.hora_inicio && r.hora_fin ? `${r.hora_inicio} - ${r.hora_fin}` : '-');
              const numPersonas = r.personas ?? r.cantidad_personas ?? '-';
              const esActiva = r.estado === 'Reservado' || r.estado === 'Confirmada';

              return (
                <tr key={resId}>
                  <td data-label="Residente">{r.residente || '-'}</td>
                  <td data-label="Área">{r.area || '-'}</td>
                  <td data-label="Fecha">{r.fecha}</td>
                  <td data-label="Horario">{horario}</td>
                  <td data-label="Personas">{numPersonas}</td>
                  <td data-label="Estado">
                    <span className={`badge ${esActiva ? 'badge-success' : 'badge-warning'}`}>
                      {r.estado}
                    </span>
                  </td>
                  <td data-label="Acciones" className="action-icons">
                    <a onClick={() => openDrawer(r)} aria-label="Ver" title="Ver detalle">
                      <i className="fas fa-eye"></i>
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Ver reserva"
        size="md"
      >
        {renderDrawerContent()}
      </Drawer>
    </>
  );
}