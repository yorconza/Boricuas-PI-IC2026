/**
 * ============================================================================
 * Archivo: MisReservasPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla donde el inquilino ve todas sus reservas. Puede ver detalle
 * de cada reserva y cancelarla (con o sin reembolso según la anticipación).
 *
 * Componentes que utiliza
 * - useData (contexto: inquilinoReservasData, setInquilinoReservas)
 * - useToast (notificaciones)
 * - useLocalDate (formato de hora)
 *
 * Flujo
 * 1. Inquilino ve lista de sus reservas ordenadas por fecha
 * 2. Puede ver detalle en un modal
 * 3. Puede cancelar: si faltan más de X horas → reembolso, si no → sin reembolso
 *
 * ============================================================================
 */

import { useData } from '../../context/DataContext';
import { useToast } from '../../components/Toast';
import { formatHoraAMPM } from '../../hooks/useLocalDate';
import { formatearMoneda } from '../../utils/formatters';

export default function MisReservasPage() {
  const { inquilinoReservasData, setInquilinoReservas, addNotification } = useData();
  const { showToast } = useToast();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const verDetalleReserva = (id: number) => {
    const reserva = inquilinoReservasData.find(r => r.id === id);
    if (!reserva) return;
    const modal = document.getElementById('detalleReservaModal');
    const body = document.getElementById('detalleReservaBody');
    const titulo = document.getElementById('detalleReservaTitulo');
    if (!modal || !body || !titulo) return;

    titulo.textContent = 'Detalle de reserva';
    const estadoBadge = reserva.estado === 'Confirmada' ? 'badge-success' : reserva.estado === 'Pendiente' ? 'badge-warning' : reserva.estado === 'Cancelada' ? 'badge-error' : 'badge-info';
    const pagoBadge = reserva.pago_estado === 'Pagado' ? 'badge-success' : reserva.pago_estado === 'Reembolsado' ? 'badge-info' : reserva.pago_estado === 'SinReembolso' ? 'badge-warning' : 'badge-warning';
    body.innerHTML = `
      <div class="detail-row"><span class="detail-label">Área</span><span class="detail-value">${reserva.area}</span></div>
      <div class="detail-row"><span class="detail-label">Fecha</span><span class="detail-value">${reserva.fecha}</span></div>
      <div class="detail-row"><span class="detail-label">Horario</span><span class="detail-value">${formatHoraAMPM(reserva.hora_inicio)} - ${formatHoraAMPM(reserva.hora_fin)}</span></div>
      <div class="detail-row"><span class="detail-label">Personas</span><span class="detail-value">${reserva.personas}</span></div>
      <div class="detail-row"><span class="detail-label">Costo</span><span class="detail-value">${formatearMoneda(reserva.costo)}</span></div>
      <div class="detail-row"><span class="detail-label">Estado</span><span class="detail-value"><span class="badge ${estadoBadge}">${reserva.estado}</span></span></div>
      <div class="detail-row"><span class="detail-label">Pago</span><span class="detail-value"><span class="badge ${pagoBadge}">${reserva.pago_estado}</span></span></div>
    `;
    modal.classList.add('open');
  };

  const closeDetalleReserva = () => {
    document.getElementById('detalleReservaModal')?.classList.remove('open');
  };

  const cancelarReserva = (id: number) => {
    const reserva = inquilinoReservasData.find(r => r.id === id);
    if (!reserva) return;
    if (reserva.estado === 'Cancelada') {
      showToast('Esta reserva ya está cancelada.', 'error');
      return;
    }
    const ahora = new Date();
    const fechaReserva = new Date(reserva.fecha + 'T' + reserva.hora_inicio);
    if (ahora >= fechaReserva) {
      showToast('No se puede cancelar una reserva que ya inició o ya finalizó.', 'error');
      return;
    }
    const diffHoras = (fechaReserva.getTime() - ahora.getTime()) / (1000 * 60 * 60);
    const horasAnticipacion = reserva.horas_anticipacion_cancelacion || 1;
    const tieneReembolso = diffHoras >= horasAnticipacion;

    setInquilinoReservas(prev => prev.map(r =>
      r.id === id
        ? { ...r, estado: 'Cancelada' as const, pago_estado: tieneReembolso ? 'Reembolsado' as const : 'SinReembolso' as const }
        : r
    ));

    const mensaje = tieneReembolso ? 'El monto será reembolsado completamente.' : 'No aplica reembolso por cancelación con poca anticipación.';
    addNotification('inquilino', 'Reserva cancelada', `Cancelaste la reserva de ${reserva.area}. ${mensaje}`);
    showToast(`Reserva de ${reserva.area} cancelada. ${mensaje}`, tieneReembolso ? 'success' : 'error');
  };

  return (
    <>
      <div className="page-header"><h2>Mis Reservas</h2></div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table-modern" id="misReservasTable">
          <thead>
            <tr><th>Área</th><th>Fecha</th><th>Horario</th><th>Personas</th><th>Estado</th><th>Pago</th><th>Acciones</th></tr>
          </thead>
          <tbody id="misReservasBody">
            {inquilinoReservasData.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)' }}>No tienes reservas registradas.</td></tr>
            ) : (
              [...inquilinoReservasData].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(r => {
                const estadoBadge = r.estado === 'Confirmada' ? 'badge-success' : r.estado === 'Pendiente' ? 'badge-warning' : r.estado === 'Reservado' ? 'badge-info' : 'badge-error';
                const pagoBadge = r.pago_estado === 'Pagado' ? 'badge-success' : r.pago_estado === 'Reembolsado' ? 'badge-info' : r.pago_estado === 'SinReembolso' ? 'badge-warning' : 'badge-warning';
                return (
                  <tr key={r.id}>
                    <td data-label="Área">{r.area}</td>
                    <td data-label="Fecha">{r.fecha}</td>
                    <td data-label="Horario">{formatHoraAMPM(r.hora_inicio)} - {formatHoraAMPM(r.hora_fin)}</td>
                    <td data-label="Personas">{r.personas}</td>
                    <td data-label="Estado"><span className={`badge ${estadoBadge}`}>{r.estado}</span></td>
                    <td data-label="Pago"><span className={`badge ${pagoBadge}`}>{r.pago_estado}</span></td>
                    <td data-label="Acciones">
                      <div className="action-cell">
                        <button className="btn-sm btn-info" onClick={() => verDetalleReserva(r.id)}><i className="fas fa-eye"></i> Ver</button>
                        {r.estado !== 'Cancelada' && new Date(r.fecha) >= hoy && (
                          <button className="btn-sm btn-danger-sm" onClick={() => cancelarReserva(r.id)}><i className="fas fa-times"></i> Cancelar</button>
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
      <div className="modal-overlay" id="detalleReservaModal" onClick={closeDetalleReserva}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3 id="detalleReservaTitulo">Detalle de reserva</h3>
          <div id="detalleReservaBody"></div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={closeDetalleReserva}>Cerrar</button>
          </div>
        </div>
      </div>
    </>
  );
}
