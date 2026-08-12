/**
 * ============================================================================
 * Archivo: VisitasPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de visitas autorizadas (Admin). Muestra las visitas del día y el
 * historial completo con filtros de búsqueda, estado y rango de fechas.
 *
 * Componentes que utiliza
 * - PageHeader (título)
 * - Drawer (detalle de la visita)
 * - useData (contexto: visitas)
 * - useLocalDate (fecha actual)
 *
 * ============================================================================
 */

import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import { useData } from '../../context/DataContext';
import { getLocalDateString } from '../../hooks/useLocalDate';
import type { Visitante } from '../../types';

export default function VisitasPage() {
  const { visitas } = useData();
  const [activeTab, setActiveTab] = useState<'hoy' | 'historial'>('hoy');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedVisita, setSelectedVisita] = useState<Visitante | null>(null);
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('all');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const today = getLocalDateString();

  const openDetail = (v: Visitante) => {
    setSelectedVisita(v);
    setDrawerOpen(true);
  };

  const limpiarFiltros = () => {
    setSearch('');
    setEstadoFiltro('all');
    setFechaDesde('');
    setFechaHasta('');
  };

  // Filter visits based on active tab and filters
  const filtered = visitas.filter(v => {
    // Tab filter
    const fechaVisita = v.fecha_autorizacion?.split(' ')[0] || '';
    if (activeTab === 'hoy') {
      // Hoy: only show Autorizado visits from today
      if (v.estado !== 'Autorizado') return false;
      if (fechaVisita !== today) return false;
    } else {
      // Historial: show everything except today's Autorizado
      if (v.estado === 'Autorizado' && fechaVisita === today) return false;
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchName = v.nombre_completo?.toLowerCase().includes(searchLower);
      const matchDoc = v.documento_identidad?.toLowerCase().includes(searchLower);
      const matchPlaca = v.placa?.toLowerCase().includes(searchLower);
      if (!matchName && !matchDoc && !matchPlaca) return false;
    }

    // Estado filter
    if (estadoFiltro !== 'all' && v.estado !== estadoFiltro) return false;

    // Date range filter (solo historial)
    if (activeTab === 'historial') {
      if (fechaDesde && fechaVisita < fechaDesde) return false;
      if (fechaHasta && fechaVisita > fechaHasta) return false;
    }
    return true;
  });

  const renderDetailContent = () => {
    if (!selectedVisita) return null;
    const v = selectedVisita;
    const fecha = v.fecha_autorizacion?.split(' ')[0] || '—';
    const hora = v.fecha_autorizacion?.split(' ')[1] || '—';

    return (
      <div className="detail-card">
        <div className="detail-row">
          <span className="detail-label">Visitante</span>
          <span className="detail-value">{v.nombre_completo || '—'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Cédula</span>
          <span className="detail-value">{v.documento_identidad || '—'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Placa</span>
          <span className="detail-value">{v.placa || '—'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Autorizado por</span>
          <span className="detail-value">{v.autoriza || '—'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Departamento</span>
          <span className="detail-value">{v.departamento || '—'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Fecha autorización</span>
          <span className="detail-value">{fecha} {hora}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Estado</span>
          <span className="detail-value">
            <span className={`badge ${v.estado === 'Autorizado' ? 'badge-success' : v.estado === 'Rechazado' ? 'badge-error' : 'badge-warning'}`}>
              {v.estado}
            </span>
          </span>
        </div>
        {v.motivo_rechazo && (
          <div className="detail-row">
            <span className="detail-label">Motivo de rechazo</span>
            <span className="detail-value" style={{ color: 'var(--error)' }}>{v.motivo_rechazo}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Visitas autorizadas" />

      <div className="visitas-tabs" id="visitasTabs">
        <button
          className={`tab-btn ${activeTab === 'hoy' ? 'active' : ''}`}
          data-tab="hoy"
          onClick={() => setActiveTab('hoy')}
        >
          Hoy
          <span className="tab-indicator"></span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
          data-tab="historial"
          onClick={() => setActiveTab('historial')}
        >
          Historial
          <span className="tab-indicator"></span>
        </button>
      </div>

      <div className={`tab-content ${activeTab === 'hoy' ? 'active' : ''}`} id="tabVisitasHoy">
        <div className="visitas-header">
          <h3>Hoy</h3>
          <div className="visitas-fecha" id="visitasFechaActual">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
      <div className={`tab-content ${activeTab === 'historial' ? 'active' : ''}`} id="tabVisitasHistorial"></div>

      <div className="visitas-filters" id="visitasFiltros">
        <div className="filter-group">
          <label htmlFor="visitasSearch">Buscar</label>
          <input type="text" id="visitasSearch" placeholder="Nombre, cédula, placa..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-group">
          <label htmlFor="visitasEstadoFiltro">Estado</label>
          <select id="visitasEstadoFiltro" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
            <option value="all">Todos</option>
            <option value="Autorizado">Autorizado</option>
            <option value="Rechazado">Rechazado</option>
          </select>
        </div>
        <div className="filter-group" id="visitasFechaDesdeGroup" style={{ display: activeTab === 'historial' ? 'flex' : 'none' }}>
          <label htmlFor="visitasFechaDesde">Fecha desde</label>
          <input type="date" id="visitasFechaDesde" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div className="filter-group" id="visitasFechaHastaGroup" style={{ display: activeTab === 'historial' ? 'flex' : 'none' }}>
          <label htmlFor="visitasFechaHasta">Fecha hasta</label>
          <input type="date" id="visitasFechaHasta" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <button className="btn-secondary" onClick={limpiarFiltros}><i className="fas fa-undo"></i> Limpiar</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table-modern" id="visitasTable">
          <thead>
            <tr>
              <th>Visitante</th><th>Cédula</th><th>Placa</th><th>Autorizado por</th><th>Fecha autorización</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody id="visitasBody">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
                  No se encontraron visitas
                </td>
              </tr>
            ) : (
              filtered.map(v => {
                const fecha = v.fecha_autorizacion?.split(' ')[0] || '--/--/----';
                return (
                  <tr key={v.id}>
                    <td data-label="Visitante">{v.nombre_completo || '—'}</td>
                    <td data-label="Cédula">{v.documento_identidad || '—'}</td>
                    <td data-label="Placa">{v.placa || '—'}</td>
                    <td data-label="Autorizado por">{v.autoriza || '—'}</td>
                    <td data-label="Fecha autorización">{fecha}</td>
                    <td data-label="Estado">
                      <span className={`badge ${v.estado === 'Autorizado' ? 'badge-success' : v.estado === 'Rechazado' ? 'badge-error' : 'badge-warning'}`}>
                        {v.estado}
                      </span>
                    </td>
                    <td data-label="Acciones" className="action-icons">
                      <a onClick={() => openDetail(v)} aria-label="Ver" style={{ cursor: 'pointer' }}>
                        <i className="fas fa-eye"></i>
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Detalle de visita autorizada"
        size="md"
      >
        {renderDetailContent()}
      </Drawer>
    </>
  );
}
