/**
 * ============================================================================
 * Archivo: GuardiaVisitas.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla principal del Guardia para el control de visitas. Permite ver
 * las visitas esperadas, autorizarlas o rechazarlas con un motivo, y
 * consultar el historial del día.
 *
 * Componentes que utiliza
 * - useData (contexto: visitas, setVisitas, addNotification)
 * - useToast (notificaciones temporales)
 * - useLocalDate (formato de hora y fecha)
 *
 * Flujo
 * 1. Guardia ve lista de visitas pendientes
 * 2. Puede buscar por nombre, cédula o departamento
 * 3. Autorizar: cambia estado a "Autorizado" y notifica
 * 4. Rechazar: abre modal para ingresar motivo
 *
 * ============================================================================
 */

import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/Toast';
import { formatHoraAMPM, getLocalDateTimeString } from '../../hooks/useLocalDate';

export default function GuardiaVisitas() {
  const { visitas, setVisitas, addNotification } = useData();
  const { showToast } = useToast();
  const [currentTab, setCurrentTab] = useState<'esperadas' | 'historial'>('esperadas');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [rechazoId, setRechazoId] = useState<number | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const aplicarFiltros = () => {
    let filtered = [...visitas];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(v =>
        v.nombre_completo?.toLowerCase().includes(s) ||
        v.documento_identidad?.toLowerCase().includes(s) ||
        v.departamento?.toLowerCase().includes(s)
      );
    }
    if (currentTab === 'esperadas') {
      filtered = filtered.filter(v => v.estado === 'Pendiente');
    } else {
      if (filterEstado !== 'all') {
        filtered = filtered.filter(v => v.estado === filterEstado);
      }
      filtered = filtered.filter(v => v.estado === 'Autorizado' || v.estado === 'Rechazado');
    }
    return filtered;
  };

  const autorizarVisita = (id: number) => {
    setVisitas(prev => prev.map(v =>
      v.id === id && v.estado === 'Pendiente'
        ? { ...v, estado: 'Autorizado' as const, fecha_autorizacion: getLocalDateTimeString() }
        : v
    ));
    const visita = visitas.find(v => v.id === id);
    addNotification('guardia', 'Visita autorizada', `Se autorizó la visita de ${visita?.nombre_completo}`);
    addNotification('guardia', 'Notificación enviada', `Se notificó a ${visita?.autoriza} que su visita (${visita?.nombre_completo}) ha llegado`);
    showToast(`Visita de ${visita?.nombre_completo} autorizada correctamente.`, 'success');
  };

  const rechazarVisita = (id: number, motivo: string) => {
    setVisitas(prev => prev.map(v =>
      v.id === id && v.estado === 'Pendiente'
        ? { ...v, estado: 'Rechazado' as const, fecha_autorizacion: getLocalDateTimeString(), motivo_rechazo: motivo }
        : v
    ));
    const visita = visitas.find(v => v.id === id);
    addNotification('guardia', 'Visita rechazada', `Se rechazó la visita de ${visita?.nombre_completo}`);
    showToast(`Visita de ${visita?.nombre_completo} rechazada.`, 'error');
    setRechazoId(null);
    setMotivoRechazo('');
  };

  const verDetalle = (id: number) => {
    const visita = visitas.find(v => v.id === id);
    if (!visita) return;
    const horaOriginal = visita.fecha_autorizacion?.split(' ')[1] || '--:--';
    const horaFormateada = formatHoraAMPM(horaOriginal);
    const fecha = visita.fecha_autorizacion?.split(' ')[0] || '--/--/----';

    const body = document.getElementById('detailModalBody');
    const title = document.getElementById('detailModalTitle');
    const actions = document.getElementById('detailModalActions');
    if (!body || !title || !actions) return;

    title.textContent = `Detalle de ${visita.nombre_completo}`;
    body.innerHTML = `
      <div class="detail-row"><span class="detail-label">Visitante</span><span class="detail-value">${visita.nombre_completo}</span></div>
      <div class="detail-row"><span class="detail-label">Cédula</span><span class="detail-value">${visita.documento_identidad || '—'}</span></div>
      <div class="detail-row"><span class="detail-label">Placa</span><span class="detail-value">${visita.placa || '—'}</span></div>
      <div class="detail-row"><span class="detail-label">Departamento</span><span class="detail-value">${visita.departamento || '—'}</span></div>
      <div class="detail-row"><span class="detail-label">Fecha de autorización</span><span class="detail-value">${fecha}</span></div>
      <div class="detail-row"><span class="detail-label">Hora esperada</span><span class="detail-value">${horaFormateada}</span></div>
      <div class="detail-row"><span class="detail-label">Inquilino que registró</span><span class="detail-value">${visita.autoriza || '—'}</span></div>
      <div class="detail-row"><span class="detail-label">Estado</span><span class="detail-value">${visita.estado}</span></div>
      ${visita.estado === 'Rechazado' ? `<div class="detail-row"><span class="detail-label">Motivo de rechazo</span><span class="detail-value">${visita.motivo_rechazo || '—'}</span></div>` : ''}
    `;
    actions.innerHTML = `<button class="btn-secondary" onclick="document.getElementById('detailModalOverlay')?.classList?.remove('open')">Cerrar</button>`;

    document.getElementById('detailModalOverlay')?.classList.add('open');
  };

  const filtered = aplicarFiltros();

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <h2 style={{ fontWeight: 600, fontSize: '1.4rem' }}>Control de Visitas</h2>
      </div>

      <div className="visitas-header">
        <h3>Visitas Esperadas</h3>
        <div className="fecha-actual" id="fechaActual">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="tabs-container" id="visitasTabs">
        <button className={`tab-btn ${currentTab === 'esperadas' ? 'active' : ''}`} data-tab="esperadas" onClick={() => setCurrentTab('esperadas')}>
          Visitas esperadas
          <span className="tab-indicator"></span>
        </button>
        <button className={`tab-btn ${currentTab === 'historial' ? 'active' : ''}`} data-tab="historial" onClick={() => setCurrentTab('historial')}>
          Historial del día
          <span className="tab-indicator"></span>
        </button>
      </div>

      <div className="filters-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <label htmlFor="searchInput">Buscar</label>
          <input type="text" id="searchInput" placeholder="Buscar por nombre, cédula o departamento" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-group" id="filterEstadoGroup" style={{ display: currentTab === 'historial' ? 'flex' : 'none' }}>
          <label htmlFor="filterEstado">Estado</label>
          <select id="filterEstado" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
            <option value="all">Todos</option>
            {currentTab === 'historial' && (
              <>
                <option value="Autorizado">Autorizado</option>
                <option value="Rechazado">Rechazado</option>
              </>
            )}
          </select>
        </div>
        <button className="btn-secondary" onClick={() => { setSearch(''); setFilterEstado('all'); }} style={{ padding: 'var(--space-1) var(--space-3)' }}>Limpiar</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table-modern" id="visitasTable">
          <thead>
            <tr>
              <th>Visitante</th><th>Cédula</th><th>Placa</th><th>Hora Esperada</th><th>Estado</th><th>Acción</th>
            </tr>
          </thead>
          <tbody id="visitasBody">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)' }}>No se encontraron visitas</td></tr>
            ) : (
              filtered.map(v => {
                const horaOriginal = v.fecha_autorizacion?.split(' ')[1] || '--:--';
                const horaFormateada = formatHoraAMPM(horaOriginal);
                return (
                  <tr key={v.id}>
                    <td data-label="Visitante" className="nombre-visitante">{v.nombre_completo}</td>
                    <td data-label="Cédula">{v.documento_identidad || '—'}</td>
                    <td data-label="Placa">{v.placa || '—'}</td>
                    <td data-label="Hora Esperada">{horaFormateada}</td>
                    <td data-label="Estado">
                      <span className={`badge ${v.estado === 'Pendiente' ? 'badge-warning' : v.estado === 'Autorizado' ? 'badge-success' : 'badge-error'}`}>
                        {v.estado}
                      </span>
                    </td>
                    <td data-label="Acción">
                      <div className="action-cell">
                        {v.estado === 'Pendiente' ? (
                          <>
                            <button className="btn-sm btn-success" onClick={() => autorizarVisita(v.id)}><i className="fas fa-check"></i> Autorizar</button>
                            <button className="btn-sm btn-danger-sm" onClick={() => setRechazoId(v.id)}><i className="fas fa-times"></i> Rechazar</button>
                            <button className="btn-sm btn-info" onClick={() => verDetalle(v.id)}><i className="fas fa-eye"></i> Ver</button>
                          </>
                        ) : (
                          <button className="btn-sm btn-info" onClick={() => verDetalle(v.id)}><i className="fas fa-eye"></i> Ver</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Rechazo */}
      <div className={`modal-overlay ${rechazoId !== null ? 'open' : ''}`} id="motivoRechazoOverlay" onClick={() => setRechazoId(null)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3>Motivo de rechazo</h3>
          <p>Indica el motivo por el cual se rechaza esta visita.</p>
          <div className="form-group" style={{ marginBottom: 'var(--space-2)' }}>
            <label htmlFor="motivoRechazoInput">Motivo</label>
            <textarea id="motivoRechazoInput" rows={4} placeholder="Ej: El visitante no presentó identificación válida" value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)}></textarea>
          </div>
          <div className="actions">
            <button className="btn-secondary" onClick={() => setRechazoId(null)}>Cancelar</button>
            <button className="btn-danger btn-reject" id="confirmarRechazoBtn" onClick={() => { if (motivoRechazo.trim()) rechazarVisita(rechazoId!, motivoRechazo); else alert('Por favor ingresa un motivo de rechazo.'); }}>
              Rechazar visita
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <div className="modal-overlay" id="detailModalOverlay" onClick={() => document.getElementById('detailModalOverlay')?.classList.remove('open')}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3 id="detailModalTitle">Detalle del visitante</h3>
          <div id="detailModalBody"></div>
          <div className="modal-actions" id="detailModalActions"></div>
        </div>
      </div>
    </>
  );
}
