/**
 * ============================================================================
 * Archivo: NuevaReservaPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla para crear una nueva reserva de área común. El inquilino
 * selecciona área, fecha, horario y cantidad de personas. Incluye un
 * modal de pago simulado para confirmar la reserva.
 *
 * Componentes que utiliza
 * - useData (contexto: areasDisponiblesData, inquilinoReservasData, recargarReservasInquilino)
 * - inquilinoService (crearReserva → POST /inquilino/reservas)
 * - useToast (notificaciones)
 * - useLocalDate (formato de hora y fecha)
 *
 * Flujo
 * 1. Selecciona área, fecha, hora inicio y fin
 * 2. Las horas ocupadas se ocultan automáticamente
 * 3. Ingresa cantidad de personas
 * 4. Ve el costo estimado calculado automáticamente
 * 5. Hace clic en "Reservar" → modal de pago simulado
 * 6. Confirma pago → POST /inquilino/reservas al backend; si responde OK,
 *    se recarga la lista real de reservas desde el backend (ya no se
 *    empuja un objeto falso al estado local).
 *
 * ============================================================================
 */

import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/Toast';
import { formatHoraAMPM, getLocalDateString } from '../../hooks/useLocalDate';
import { formatearMoneda } from '../../utils/formatters';
import { inquilinoService } from '../../services/inquilinoService';

interface NuevaReservaPageProps {
  preselectedAreaId?: number | null;
}

export default function NuevaReservaPage({ preselectedAreaId }: NuevaReservaPageProps) {
  const { areasDisponiblesData, inquilinoReservasData, recargarReservasInquilino, addNotification } = useData();
  const { showToast } = useToast();

  const defaultArea = preselectedAreaId
    ? areasDisponiblesData.find(a => a.id === preselectedAreaId) || areasDisponiblesData.find(a => a.disponible)
    : areasDisponiblesData.find(a => a.disponible);
  const [areaId, setAreaId] = useState(defaultArea?.id || '');
  const [fecha, setFecha] = useState(() => getLocalDateString());
  const todayStr = getLocalDateString();
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [personas, setPersonas] = useState(1);
  const [enviando, setEnviando] = useState(false);

  const area = areasDisponiblesData.find(a => a.id === Number(areaId));

  const getHorasDisponibles = () => {
    if (!area) return [];
    const horas: string[] = [];
    let inicio = area.horario_inicio;
    // Si la fecha es hoy, solo mostrar horas a partir de la hora actual
    if (fecha === todayStr) {
      const ahora = new Date();
      const horaActual = ahora.getHours();
      const minutoActual = ahora.getMinutes();
      inicio = Math.max(area.horario_inicio, minutoActual > 0 ? horaActual + 1 : horaActual);
    }
    for (let h = inicio; h < area.horario_fin; h++) {
      horas.push(String(h).padStart(2, '0') + ':00');
    }
    const ocupadas = inquilinoReservasData
      .filter(r => r.area === area.nombre && r.fecha === fecha && r.estado !== 'Cancelada')
      .flatMap(r => {
        const inicio = parseInt(r.hora_inicio.split(':')[0]);
        const fin = parseInt(r.hora_fin.split(':')[0]);
        const o: string[] = [];
        for (let h = inicio; h <= fin; h++) o.push(String(h).padStart(2, '0') + ':00');
        return o;
      });
    return horas.filter(h => !ocupadas.includes(h));
  };

  const getHorasFin = () => {
    if (!area || !horaInicio) return [];
    const inicioNum = parseInt(horaInicio.split(':')[0]);
    const horas: string[] = [];
    for (let h = area.horario_inicio; h < area.horario_fin; h++) {
      if (h > inicioNum) horas.push(String(h).padStart(2, '0') + ':00');
    }
    const ocupadas = inquilinoReservasData
      .filter(r => r.area === area.nombre && r.fecha === fecha && r.estado !== 'Cancelada')
      .flatMap(r => {
        const inicio = parseInt(r.hora_inicio.split(':')[0]);
        const fin = parseInt(r.hora_fin.split(':')[0]);
        const o: string[] = [];
        for (let h = inicio; h <= fin; h++) o.push(String(h).padStart(2, '0') + ':00');
        return o;
      });
    return horas.filter(h => !ocupadas.includes(h));
  };

  const calcularCosto = () => {
    if (!area || !horaInicio || !horaFin) return area ? `${formatearMoneda(area.costo_por_hora)} / hora` : formatearMoneda(0);
    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    const minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (minutos <= 0) return `${formatearMoneda(area.costo_por_hora)} / hora`;
    const horas = minutos / 60;
    return formatearMoneda(horas * area.costo_por_hora);
  };

  const handleSubmit = () => {
    if (!area || !fecha || !horaInicio || !horaFin) {
      showToast('Completa todos los campos requeridos.', 'error');
      return;
    }
    if (horaInicio >= horaFin) {
      showToast('La hora de fin debe ser posterior a la de inicio.', 'error');
      return;
    }

    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    const minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
    const horas = minutos / 60;
    const costo = horas * area.costo_por_hora;

    // Open payment modal
    const pagoMonto = document.getElementById('pagoMonto');
    const confirmarPagoModal = document.getElementById('confirmarPagoModal');
    if (pagoMonto && confirmarPagoModal) {
      pagoMonto.textContent = formatearMoneda(costo);
      confirmarPagoModal.classList.add('open');
    }
  };

  // NOTA (cambio): antes armaba un objeto de reserva falso y lo empujaba
  // directo al estado local (nunca se persistía en la BD). Ahora llama a
  // POST /inquilino/reservas vía inquilinoService.crearReserva y, si el
  // backend confirma, recarga la lista real con recargarReservasInquilino().
  const confirmarPago = async () => {
    if (!area) return;
    const metodoPago = ((document.getElementById('metodoPago') as HTMLSelectElement)?.value || 'tarjeta') as 'tarjeta' | 'efectivo' | 'sinpe';
    const metodoTexto = metodoPago === 'tarjeta' ? 'Tarjeta' : metodoPago === 'efectivo' ? 'Efectivo' : 'Sinpe Móvil';

    setEnviando(true);
    try {
      await inquilinoService.crearReserva({
        id_area: area.id,
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        cantidad_personas: personas,
        metodo_pago: metodoPago,
      });

      await recargarReservasInquilino();
      document.getElementById('confirmarPagoModal')?.classList.remove('open');
      showToast(`Reserva de ${area.nombre} confirmada. Pago con ${metodoTexto} registrado.`, 'success');
      addNotification('inquilino', 'Reserva confirmada', `Tu reserva de ${area.nombre} ha sido confirmada.`);
      setHoraInicio('');
      setHoraFin('');
      setPersonas(1);
      setFecha(getLocalDateString());
    } catch (error: unknown) {
      const err = error as Error;
      showToast(err.message || 'No se pudo confirmar la reserva.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const closeConfirmarPago = () => {
    document.getElementById('confirmarPagoModal')?.classList.remove('open');
  };

  return (
    <>
      <div className="page-header">
        <h2>Nueva Reserva</h2>
        <button className="btn-secondary" onClick={() => window.location.hash = 'reservar-area'}>
          <i className="fas fa-arrow-left"></i> Volver
        </button>
      </div>

      <div className="card">
        <form id="nuevaReservaForm" onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reservaArea">Área</label>
              <select id="reservaArea" value={areaId} onChange={e => { setAreaId(e.target.value); setHoraInicio(''); setHoraFin(''); }}>
                <option value="">Seleccionar...</option>
                {areasDisponiblesData.filter(a => a.disponible).map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="reservaFecha">Fecha</label>
              <input type="date" id="reservaFecha" min={todayStr} value={fecha} onChange={e => { setFecha(e.target.value); setHoraInicio(''); setHoraFin(''); }} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reservaHoraInicio">Hora inicio</label>
              <select id="reservaHoraInicio" value={horaInicio} onChange={e => { setHoraInicio(e.target.value); setHoraFin(''); }}>
                <option value="">Seleccionar...</option>
                {getHorasDisponibles().map(h => (
                  <option key={h} value={h}>{formatHoraAMPM(h)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="reservaHoraFin">Hora fin</label>
              <select id="reservaHoraFin" value={horaFin} onChange={e => setHoraFin(e.target.value)}>
                <option value="">Seleccionar...</option>
                {getHorasFin().map(h => (
                  <option key={h} value={h}>{formatHoraAMPM(h)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="reservaPersonas">Cantidad de personas</label>
            <input type="number" id="reservaPersonas" min={1} value={personas} onChange={e => setPersonas(parseInt(e.target.value) || 1)} />
          </div>
          <div className="form-group">
            <label>Costo estimado</label>
            <div className="costo-estimado" id="costoEstimado">{calcularCosto()}</div>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
            Reservar
          </button>
        </form>
      </div>

      {/* Payment Modal */}
      <div className="modal-overlay" id="confirmarPagoModal" onClick={closeConfirmarPago}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3>Confirmar pago</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
            Para confirmar tu reserva, debes realizar el pago del monto estimado.
          </p>
          <div className="detail-row">
            <span className="detail-label">Monto a pagar</span>
            <span className="detail-value" id="pagoMonto">{formatearMoneda(0)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Método de pago</span>
            <span className="detail-value">
              <select id="metodoPago" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-1) var(--space-2)', color: 'var(--text-primary)', fontSize: '0.85rem', width: '100%' }}>
                <option value="tarjeta">Tarjeta de crédito/débito</option>
                <option value="efectivo">Efectivo</option>
                <option value="sinpe">Sinpe Móvil</option>
              </select>
            </span>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={closeConfirmarPago}>Cancelar</button>
            <button className="btn-primary" id="confirmarPagoBtn" onClick={confirmarPago} disabled={enviando}>
              {enviando ? 'Procesando...' : 'Pagar y confirmar'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}