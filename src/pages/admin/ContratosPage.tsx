/**
 * ============================================================================
 * Archivo: ContratosPage.tsx
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import { useData } from '../../context/DataContext';
import type { Contrato } from '../../types';

export default function ContratosPage() {
  const { 
    contratosData, 
    crearContrato, 
    editarContrato, 
    finalizarContrato, 
    addActivity, 
    addNotification 
  } = useData();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<Contrato | null>(null);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Estados del Formulario
  const [idUsuario, setIdUsuario] = useState<number>(0);
  const [idDepartamento, setIdDepartamento] = useState<number>(0);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [montoMensual, setMontoMensual] = useState<number>(0);
  const [montoDeposito, setMontoDeposito] = useState<number>(0);
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando] = useState(false);

  // Auxiliar para obtener propiedades opcionales o con distintos nombres de la interfaz
  const getItemProp = useCallback((item: Contrato | null, key: string): any => {
    if (!item) return undefined;
    return (item as Record<string, any>)[key];
  }, []);

  // Filtrado de la lista
  const filtered = contratosData.filter(c => {
    const nombreResidente = getItemProp(c, 'nombre_residente') || getItemProp(c, 'residenteNombre') || getItemProp(c, 'residente') || '';
    if (buscar && !nombreResidente.toLowerCase().includes(buscar.toLowerCase())) return false;
    if (filtroEstado && c.estado !== filtroEstado) return false;
    return true;
  });

  const openDrawer = (mode: 'create' | 'view' | 'edit', item?: Contrato) => {
    setDrawerMode(mode);
    setSelectedItem(item || null);

    if (mode === 'edit' && item) {
      setIdDepartamento(item.id_departamento || 0);
      setFechaInicio(item.fecha_inicio || '');
      setFechaFin(item.fecha_fin || '');
      setMontoMensual(getItemProp(item, 'monto_mensual') || getItemProp(item, 'monto') || 0);
      setMontoDeposito(getItemProp(item, 'monto_deposito') || 0);
      setObservaciones(getItemProp(item, 'observaciones') || '');
    } else if (mode === 'create') {
      setIdUsuario(0);
      setIdDepartamento(0);
      setFechaInicio('');
      setFechaFin('');
      setMontoMensual(0);
      setMontoDeposito(0);
      setObservaciones('');
    }

    setDrawerOpen(true);
  };

  // Crear nuevo contrato en BD
  const handleCreateSave = useCallback(async () => {
    if (!idUsuario || !idDepartamento || !fechaInicio || !fechaFin) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }

    try {
      setCargando(true);
      await crearContrato({
        id_usuario: Number(idUsuario),
        id_departamento: Number(idDepartamento),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        monto_mensual: Number(montoMensual),
        monto_deposito: Number(montoDeposito),
        observaciones
      });

      addActivity(`Nuevo contrato registrado`, 'fa-file-signature', 'var(--accent)');
      addNotification('admin', 'Nuevo contrato', `Se registró exitosamente un contrato.`, 'fa-file-signature');

      setDrawerOpen(false);
      alert('Contrato creado correctamente.');
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Error al crear contrato: ${error.message}`);
    } finally {
      setCargando(false);
    }
  }, [idUsuario, idDepartamento, fechaInicio, fechaFin, montoMensual, montoDeposito, observaciones, crearContrato, addActivity, addNotification]);

  // Editar contrato existente en BD
  const handleEditSave = useCallback(async () => {
    if (!selectedItem) return;

    const contractId = getItemProp(selectedItem, 'id_contrato') || getItemProp(selectedItem, 'id');

    try {
      setCargando(true);
      await editarContrato(contractId, {
        id_departamento: Number(idDepartamento),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        monto_mensual: Number(montoMensual),
        monto_deposito: Number(montoDeposito),
        observaciones
      });

      addActivity(`Contrato #${contractId} actualizado`, 'fa-edit', 'var(--accent)');
      addNotification('admin', 'Contrato editado', `Se actualizó la información del contrato.`, 'fa-edit');

      setDrawerOpen(false);
      alert('Contrato actualizado correctamente.');
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Error al actualizar: ${error.message}`);
    } finally {
      setCargando(false);
    }
  }, [selectedItem, idDepartamento, fechaInicio, fechaFin, montoMensual, montoDeposito, observaciones, editarContrato, addActivity, addNotification, getItemProp]);

  // Finalizar contrato en BD
  const handleFinalizar = async (id: number, nombre: string) => {
    if (!confirm(`¿Está seguro de finalizar el contrato de ${nombre}?`)) return;

    try {
      await finalizarContrato(id);
      addActivity(`Contrato de <strong>${nombre}</strong> finalizado`, 'fa-file-contract', 'var(--error)');
      alert('Contrato finalizado exitosamente.');
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Error: ${error.message}`);
    }
  };

  const renderDrawerContent = () => {
    if (drawerMode === 'view' && selectedItem) {
      const residenteNombre = getItemProp(selectedItem, 'nombre_residente') || getItemProp(selectedItem, 'residenteNombre') || getItemProp(selectedItem, 'residente') || '';
      const obs = getItemProp(selectedItem, 'observaciones');

      return (
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Residente</span>
            <span className="detail-value">{residenteNombre}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Departamento</span>
            <span className="detail-value">{selectedItem.departamento}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Fecha Inicio</span>
            <span className="detail-value">{selectedItem.fecha_inicio}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Fecha Fin</span>
            <span className="detail-value">{selectedItem.fecha_fin}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Estado</span>
            <span className="detail-value">
              <span className={`badge ${selectedItem.estado === 'Activo' ? 'badge-success' : 'badge-warning'}`}>
                {selectedItem.estado}
              </span>
            </span>
          </div>
          {obs && (
            <div className="detail-row">
              <span className="detail-label">Observaciones</span>
              <span className="detail-value">{obs}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="form-section">
        <h4>{drawerMode === 'create' ? 'Información del Nuevo Contrato' : 'Editar Contrato'}</h4>
        
        {drawerMode === 'create' && (
          <div className="form-group">
            <label>ID Usuario / Residente *</label>
            <input 
              type="number" 
              value={idUsuario || ''} 
              onChange={e => setIdUsuario(Number(e.target.value))} 
              placeholder="Ej: 1" 
            />
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>ID Departamento *</label>
            <input 
              type="number" 
              value={idDepartamento || ''} 
              onChange={e => setIdDepartamento(Number(e.target.value))} 
              placeholder="Ej: 1" 
            />
          </div>
          <div className="form-group">
            <label>Monto Mensual *</label>
            <input 
              type="number" 
              value={montoMensual || ''} 
              onChange={e => setMontoMensual(Number(e.target.value))} 
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Fecha Inicio *</label>
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={e => setFechaInicio(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Fecha Fin *</label>
            <input 
              type="date" 
              value={fechaFin} 
              onChange={e => setFechaFin(e.target.value)} 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Monto Depósito</label>
          <input 
            type="number" 
            value={montoDeposito || ''} 
            onChange={e => setMontoDeposito(Number(e.target.value))} 
          />
        </div>

        <div className="form-group">
          <label>Observaciones</label>
          <textarea 
            value={observaciones} 
            onChange={e => setObservaciones(e.target.value)} 
            rows={3} 
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Contratos">
        <button className="btn-primary" onClick={() => openDrawer('create')}>
          <i className="fas fa-plus"></i> Nuevo contrato
        </button>
      </PageHeader>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Buscar</label>
          <input 
            type="text" 
            placeholder="Residente..." 
            value={buscar} 
            onChange={e => setBuscar(e.target.value)} 
          />
        </div>
        <div className="filter-group">
          <label>Estado</label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Vencido">Vencido</option>
          </select>
        </div>
      </div>

      <table className="table-modern">
        <thead>
          <tr>
            <th>Residente</th>
            <th>Departamento</th>
            <th>Fecha inicio</th>
            <th>Fecha fin</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(c => {
            const contractId = getItemProp(c, 'id_contrato') || getItemProp(c, 'id');
            const residenteNombre = getItemProp(c, 'nombre_residente') || getItemProp(c, 'residenteNombre') || getItemProp(c, 'residente') || '';

            return (
              <tr key={contractId}>
                <td data-label="Residente">{residenteNombre}</td>
                <td data-label="Departamento">{c.departamento}</td>
                <td data-label="Fecha inicio">{c.fecha_inicio}</td>
                <td data-label="Fecha fin">{c.fecha_fin}</td>
                <td data-label="Estado">
                  <span className={`badge ${c.estado === 'Activo' ? 'badge-success' : 'badge-warning'}`}>
                    {c.estado}
                  </span>
                </td>
                <td data-label="Acciones" className="action-icons">
                  <a onClick={() => openDrawer('view', c)} aria-label="Ver"><i className="fas fa-eye"></i></a>
                  <a onClick={() => openDrawer('edit', c)} aria-label="Editar"><i className="fas fa-edit"></i></a>
                  {c.estado === 'Activo' && (
                    <a onClick={() => handleFinalizar(contractId, residenteNombre)} aria-label="Finalizar" style={{ color: 'var(--error)' }}>
                      <i className="fas fa-ban"></i>
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerMode === 'create' ? 'Nuevo contrato' : drawerMode === 'edit' ? 'Editar contrato' : 'Ver contrato'}
        onSave={drawerMode === 'edit' ? handleEditSave : (drawerMode === 'create' ? handleCreateSave : undefined)}
        saveText={cargando ? 'Guardando...' : drawerMode === 'create' ? 'Crear' : 'Guardar'}
        size="md"
      >
        {renderDrawerContent()}
      </Drawer>
    </>
  );
}