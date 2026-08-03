/**
 * ============================================================================
 * Archivo: MisVisitantesPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla donde el inquilino ve todos sus visitantes registrados. Puede
 * ver detalle de cada visitante y cancelar visitas pendientes.
 *
 * Componentes que utiliza
 * - useData (contexto: inquilinoVisitantesData, setInquilinoVisitantes)
 * - useToast (notificaciones)
 * - useLocalDate (formato de hora)
 *
 * ============================================================================
 */

import { useData } from '../../context/DataContext';
import { useToast } from '../../components/Toast';
import { useAlert } from '../../components/Alert';
import { formatHoraAMPM } from '../../hooks/useLocalDate';

export default function MisVisitantesPage() {
  const { inquilinoVisitantesData, setInquilinoVisitantes, addNotification } = useData();
  const { showToast } = useToast();
  const { confirmar } = useAlert();

  const verDetalleVisitante = (id: number) => {
    const visitante = inquilinoVisitantesData.find(v => v.id === id);
    if (!visitante) return;
    const modal = document.getElementById('detalleVisitanteModal');
    const body = document.getElementById('detalleVisitanteBody');
    const titulo = document.getElementById('detalleVisitanteTitulo');
    if (!modal || !body || !titulo) return;

    titulo.textContent = `Detalle de ${visitante.nombre}`;
    const estadoBadge = visitante.estado === 'Pendiente' ? 'badge-warning' : visitante.estado === 'Autorizado' ? 'badge-success' : 'badge-error';

    let estadoLine = '';
    if (visitante.estado === 'Autorizado') {
      estadoLine = `<div style="margin-top:var(--space-3);padding-top:var(--space-2);border-top:1px solid var(--border-color);color:var(--text-muted);font-size:0.8rem;">✅ Autorizado el ${new Date().toLocaleDateString('es-ES')}</div>`;
    } else if (visitante.estado === 'Pendiente') {
      estadoLine = `<div style="margin-top:var(--space-3);padding-top:var(--space-2);border-top:1px solid var(--border-color);color:var(--warning);font-size:0.8rem;">⏳ Pendiente de autorización por el guardia.</div>`;
    } else if (visitante.estado === 'Rechazado') {
      estadoLine = `<div style="margin-top:var(--space-3);padding-top:var(--space-2);border-top:1px solid var(--border-color);color:var(--error);font-size:0.8rem;">❌ Visita rechazada.</div>`;
    } else if (visitante.estado === 'Cancelada') {
      estadoLine = `<div style="margin-top:var(--space-3);padding-top:var(--space-2);border-top:1px solid var(--border-color);color:var(--text-muted);font-size:0.8rem;">🚫 Visita cancelada por el residente.</div>`;
    }

    body.innerHTML = `
      <div class="detail-row"><span class="detail-label">Nombre</span><span class="detail-value">${visitante.nombre}</span></div>
      <div class="detail-row"><span class="detail-label">Cédula</span><span class="detail-value">${visitante.documento}</span></div>
      <div class="detail-row"><span class="detail-label">Placa</span><span class="detail-value">${visitante.placa || '—'}</span></div>
      <div class="detail-row"><span class="detail-label">Hora esperada</span><span class="detail-value">${visitante.hora_esperada && visitante.hora_esperada !== '--:--' ? formatHoraAMPM(visitante.hora_esperada) : '--:--'}</span></div>
      <div class="detail-row"><span class="detail-label">Estado</span><span class="detail-value"><span class="badge ${estadoBadge}">${visitante.estado}</span></span></div>
      ${visitante.estado === 'Rechazado' ? `<div class="detail-row"><span class="detail-label">Motivo de rechazo</span><span class="detail-value">${visitante.motivo_rechazo || '—'}</span></div>` : ''}
      ${estadoLine}
    `;
    modal.classList.add('open');
  };

  const closeDetalleVisitante = () => {
    document.getElementById('detalleVisitanteModal')?.classList.remove('open');
  };

  const cancelarVisitante = async (id: number) => {
    const visitante = inquilinoVisitantesData.find(v => v.id === id);
    if (!visitante) return;
    if (visitante.estado !== 'Pendiente') {
      showToast('Este visitante ya no está pendiente.', 'error');
      return;
    }
    const confirmado = await confirmar(
      `¿Cancelar la visita de ${visitante.nombre}?`,
      { titulo: 'Cancelar visita', confirmarTexto: 'Sí, cancelar' }
    );
    if (!confirmado) return;
    setInquilinoVisitantes(prev => prev.map(v => v.id === id ? { ...v, estado: 'Cancelada' as const } : v));
    showToast('Visita cancelada correctamente.', 'success');
    addNotification('inquilino', 'Visita cancelada', `Cancelaste la visita de ${visitante.nombre}.`);
  };

  return (
    <>
      <div className="page-header"><h2>Mis Visitantes</h2></div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table-modern" id="misVisitantesTable">
          <thead>
            <tr><th>Visitante</th><th>Cédula</th><th>Hora esperada</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody id="misVisitantesBody">
            {inquilinoVisitantesData.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)' }}>No tienes visitantes registrados.</td></tr>
            ) : (
              inquilinoVisitantesData.map(v => {
                const estadoBadge = v.estado === 'Pendiente' ? 'badge-warning' : v.estado === 'Autorizado' ? 'badge-success' : v.estado === 'Cancelada' ? 'badge' : 'badge-error';
                return (
                  <tr key={v.id}>
                    <td data-label="Visitante">{v.nombre}</td>
                    <td data-label="Cédula">{v.documento}</td>
                    <td data-label="Hora esperada">{v.hora_esperada && v.hora_esperada !== '--:--' ? formatHoraAMPM(v.hora_esperada) : '--:--'}</td>
                    <td data-label="Estado"><span className={`badge ${estadoBadge}`}>{v.estado}</span></td>
                    <td data-label="Acciones">
                      <div className="action-cell">
                        <button className="btn-sm btn-info" onClick={() => verDetalleVisitante(v.id)}><i className="fas fa-eye"></i> Ver</button>
                        {v.estado === 'Pendiente' && (
                          <button className="btn-sm btn-danger-sm" onClick={() => cancelarVisitante(v.id)}><i className="fas fa-times"></i> Cancelar</button>
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

      {/* Detail Modal */}
      <div className="modal-overlay" id="detalleVisitanteModal" onClick={closeDetalleVisitante}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3 id="detalleVisitanteTitulo">Detalle del visitante</h3>
          <div id="detalleVisitanteBody"></div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={closeDetalleVisitante}>Cerrar</button>
          </div>
        </div>
      </div>
    </>
  );
}
