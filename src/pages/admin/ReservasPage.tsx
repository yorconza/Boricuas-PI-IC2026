/**
 * ============================================================================
 * Archivo: ReservasPage.tsx
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import { useData } from '../../context/DataContext';
import { useAlert } from '../../components/Alert';
import type { Reserva } from '../../types';

export default function ReservasPage() {
  const { 
    reservasData, 
    crearReserva, 
    editarReserva, 
    cancelarReserva, 
    addActivity, 
    addNotification 
  } = useData();
  const { showAlert, confirmar } = useAlert();

  const [activeTab, setActiveTab] = useState<'hoy' | 'historial'>('hoy');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<Reserva | null>(null);

  // Filtros de búsqueda
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroHora, setFiltroHora] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [buscarResidente, setBuscarResidente] = useState('');

  // Estados del Formulario
  const [idArea, setIdArea] = useState<number>(0);
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [cantidadPersonas, setCantidadPersonas] = useState<number>(1);
  const [cargando, setCargando] = useState(false);

  // Fecha actual en ISO
  const hoyFechaStr = new Date().toISOString().split('T')[0];

  // Filtrado de la lista en memoria según la pestaña activa
  const reservasFiltradas = (reservasData || []).filter(r => {
    if (activeTab === 'hoy' && r.fecha !== hoyFechaStr) {
      return false;
    }
    if (filtroArea && r.id_area !== Number(filtroArea)) return false;
    if (filtroHora && !r.hora_inicio?.startsWith(filtroHora)) return false;
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

  const openDrawer = (mode: 'create' | 'view' | 'edit', item?: Reserva) => {
    setDrawerMode(mode);
    setSelectedItem(item || null);

    if (mode === 'edit' && item) {
      // NOTA (cambio para compilar con `tsc -b`): `id_area` y `cantidad_personas`
      // son opcionales en la interfaz `Reserva` (forma API vs forma UI/mock),
      // por eso se garantiza un valor numérico con `??` antes de setear el estado.
      setIdArea(item.id_area ?? 0);
      setFecha(item.fecha);
      setHoraInicio(item.hora_inicio);
      setHoraFin(item.hora_fin);
      setCantidadPersonas(item.cantidad_personas ?? 1);
    } else if (mode === 'create') {
      setIdArea(0);
      setFecha(hoyFechaStr);
      setHoraInicio('');
      setHoraFin('');
      setCantidadPersonas(1);
    }

    setDrawerOpen(true);
  };

  const handleCreateSave = useCallback(async () => {
    if (!idArea || !fecha || !horaInicio || !horaFin) {
      showAlert('Por favor complete todos los campos obligatorios.');
      return;
    }

    try {
      setCargando(true);
      await crearReserva({
        id_area: Number(idArea),
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        cantidad_personas: Number(cantidadPersonas)
      });

      addActivity('Nueva reserva creada', 'fa-calendar-plus', 'var(--accent)');
      addNotification('admin', 'Reserva creada', 'Se ha agendado una nueva reserva.', 'fa-calendar-plus');

      setDrawerOpen(false);
      showAlert('Reserva creada exitosamente.');
    } catch (err: unknown) {
      const error = err as Error;
      showAlert(`Error al crear la reserva: ${error.message}`);
    } finally {
      setCargando(false);
    }
  }, [idArea, fecha, horaInicio, horaFin, cantidadPersonas, crearReserva, addActivity, addNotification, showAlert]);

  const handleEditSave = useCallback(async () => {
    if (!selectedItem) return;

    try {
      setCargando(true);
      // NOTA (cambio para compilar con `tsc -b`): `id_reserva` es opcional en la
      // interfaz `Reserva`. Los datos mock/transformados traen `id`, por eso se
      // prefiere `id` y se cae a `id_reserva` como respaldo para la forma API.
      await editarReserva(selectedItem.id ?? selectedItem.id_reserva!, {
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        cantidad_personas: Number(cantidadPersonas)
      });

      addActivity(`Reserva #${selectedItem.id_reserva} actualizada`, 'fa-edit', 'var(--accent)');
      addNotification('admin', 'Reserva modificada', `Se actualizó la reserva #${selectedItem.id_reserva}.`, 'fa-edit');

      setDrawerOpen(false);
      showAlert('Reserva actualizada correctamente.');
    } catch (err: unknown) {
      const error = err as Error;
      showAlert(`Error al actualizar reserva: ${error.message}`);
    } finally {
      setCargando(false);
    }
  }, [selectedItem, fecha, horaInicio, horaFin, cantidadPersonas, editarReserva, addActivity, addNotification, showAlert]);

  const handleCancelar = async (idReserva: number, areaNombre: string) => {
    const confirmado = await confirmar(
      `¿Desea cancelar la reserva para ${areaNombre}?`,
      { titulo: 'Cancelar reserva', confirmarTexto: 'Sí, cancelar' }
    );
    if (!confirmado) return;

    try {
      await cancelarReserva(idReserva);
      addActivity(`Reserva #${idReserva} cancelada`, 'fa-ban', 'var(--error)');
      showAlert('Reserva cancelada correctamente.');
    } catch (err: unknown) {
      const error = err as Error;
      showAlert(`Error al cancelar: ${error.message}`);
    }
  };

  const renderDrawerContent = () => {
    if (drawerMode === 'view' && selectedItem) {
      return (
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Residente</span>
            <span className="detail-value">{selectedItem.residente}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Área</span>
            <span className="detail-value">{selectedItem.area}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Fecha</span>
            <span className="detail-value">{selectedItem.fecha}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Horario</span>
            <span className="detail-value">{selectedItem.hora_inicio} - {selectedItem.hora_fin}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Personas</span>
            <span className="detail-value">{selectedItem.cantidad_personas}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Estado</span>
            <span className="detail-value">
              <span className={`badge ${selectedItem.estado === 'Reservado' ? 'badge-success' : 'badge-warning'}`}>
                {selectedItem.estado}
              </span>
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="form-section">
        <h4>{drawerMode === 'create' ? 'Nueva Reserva' : 'Editar Reserva'}</h4>

        {drawerMode === 'create' && (
          <div className="form-group">
            <label>ID Área Comun *</label>
            <input 
              type="number" 
              value={idArea || ''} 
              onChange={e => setIdArea(Number(e.target.value))} 
              placeholder="Ej: 1" 
            />
          </div>
        )}

        <div className="form-group">
          <label>Fecha *</label>
          <input 
            type="date" 
            value={fecha} 
            onChange={e => setFecha(e.target.value)} 
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Hora Inicio *</label>
            <input 
              type="time" 
              value={horaInicio} 
              onChange={e => setHoraInicio(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Hora Fin *</label>
            <input 
              type="time" 
              value={horaFin} 
              onChange={e => setHoraFin(e.target.value)} 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Cantidad de Personas *</label>
          <input 
            type="number" 
            min={1} 
            value={cantidadPersonas} 
            onChange={e => setCantidadPersonas(Number(e.target.value))} 
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Reservas">
        <button className="btn-primary" onClick={() => openDrawer('create')}>
          <i className="fas fa-plus"></i> Nueva reserva
        </button>
      </PageHeader>

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
            {reservasFiltradas.map(r => (
              <tr key={r.id_reserva}>
                <td data-label="Residente">{r.residente}</td>
                <td data-label="Área">{r.area}</td>
                <td data-label="Fecha">{r.fecha}</td>
                <td data-label="Horario">{r.hora_inicio} - {r.hora_fin}</td>
                <td data-label="Personas">{r.cantidad_personas}</td>
                <td data-label="Estado">
                  <span className={`badge ${r.estado === 'Reservado' ? 'badge-success' : 'badge-warning'}`}>
                    {r.estado}
                  </span>
                </td>
                <td data-label="Acciones" className="action-icons">
                  <a onClick={() => openDrawer('view', r)} aria-label="Ver"><i className="fas fa-eye"></i></a>
                  {r.estado === 'Reservado' && (
                    <>
                      <a onClick={() => openDrawer('edit', r)} aria-label="Editar"><i className="fas fa-edit"></i></a>
                      {/* NOTA: `id_reserva` es opcional en la interfaz; los datos
                          mock/transformados traen `id`, se cae a `id_reserva` como respaldo. */}
                      <a onClick={() => handleCancelar(r.id ?? r.id_reserva!, r.area)} aria-label="Cancelar" style={{ color: 'var(--error)' }}>
                        <i className="fas fa-ban"></i>
                      </a>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerMode === 'create' ? 'Nueva reserva' : drawerMode === 'edit' ? 'Editar reserva' : 'Ver reserva'}
        onSave={drawerMode === 'edit' ? handleEditSave : (drawerMode === 'create' ? handleCreateSave : undefined)}
        saveText={cargando ? 'Guardando...' : drawerMode === 'create' ? 'Crear' : 'Guardar'}
        size="md"
      >
        {renderDrawerContent()}
      </Drawer>
    </>
  );
}