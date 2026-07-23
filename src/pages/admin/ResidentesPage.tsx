/**
 * ============================================================================
 * Archivo: ResidentesPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de gestión de residentes. Permite crear, ver, editar estado
 * y deshabilitar residentes. Incluye filtros por nombre, departamento,
 * estado de contrato y estado del residente.
 *
 * Componentes que utiliza
 * - PageHeader (título y botón "Nuevo residente")
 * - Drawer (formulario de creación/edición/visión detalle)
 * - Modal (confirmación para deshabilitar)
 * - useData (contexto: residentesData, addActivity, addNotification)
 *
 * Flujo
 * 1. Admin hace clic en "Nuevo residente" → Drawer con formulario
 * 2. Ingresa nombre, departamento, correo, teléfono, estado
 * 3. Guarda → se agrega a la tabla y se registra en activityLog
 *
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import Modal from '../../components/Modal';
import { useData } from '../../context/DataContext';
import type { Residente } from '../../types';

export default function ResidentesPage() {
  const { residentesData, setResidentesData, addActivity, addNotification } = useData();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<Residente | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Residente | null>(null);
  const [buscar, setBuscar] = useState('');
  const [filtroContrato, setFiltroContrato] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const filtered = residentesData.filter(r => {
    if (buscar && !r.nombre.toLowerCase().includes(buscar.toLowerCase()) && !r.departamento.toLowerCase().includes(buscar.toLowerCase())) return false;
    if (filtroContrato && r.contrato_estado !== filtroContrato) return false;
    if (filtroEstado && r.estado !== filtroEstado) return false;
    return true;
  });

  // Simplified save: in edit mode, only update estado
  const handleSimpleEditSave = useCallback(() => {
    if (!selectedItem) return;
    const estadoSelect = document.getElementById('resEstadoEdit') as HTMLSelectElement;
    const estado = estadoSelect?.value || 'Activo';
    setResidentesData(prev => prev.map(r =>
      r.id === selectedItem.id ? { ...r, estado } : r
    ));
    addActivity(`Estado de <strong>${selectedItem.nombre}</strong> actualizado a ${estado}`, 'fa-edit', 'var(--accent)');
    addNotification('admin', 'Residente editado', `Se actualizó el estado de ${selectedItem.nombre} a ${estado}.`, 'fa-edit');
    setDrawerOpen(false);
    alert('Estado actualizado correctamente.');
  }, [selectedItem, setResidentesData, addActivity, addNotification]);

  const openDrawer = (mode: 'create' | 'view' | 'edit', item?: Residente) => {
    setDrawerMode(mode);
    setSelectedItem(item || null);
    setDrawerOpen(true);
  };

  const openDeleteModal = (item: Residente) => {
    setDeleteItem(item);
    setModalOpen(true);
  };

  const handleSave = useCallback(() => {
    const nombre = (document.getElementById('resNombre') as HTMLInputElement)?.value?.trim() || '';
    const departamento = (document.getElementById('resDepto') as HTMLInputElement)?.value?.trim() || '';
    const correo = (document.getElementById('resCorreo') as HTMLInputElement)?.value?.trim() || '';
    const telefono = (document.getElementById('resTelefono') as HTMLInputElement)?.value?.trim() || '';
    const contratoSelect = document.getElementById('resContrato') as HTMLSelectElement;
    const estadoSelect = document.getElementById('resEstado') as HTMLSelectElement;
    const contrato_estado = contratoSelect?.value || 'Activo';
    const estado = estadoSelect?.value || 'Activo';

    if (drawerMode === 'create') {
      const newId = residentesData.length ? Math.max(...residentesData.map(r => r.id)) + 1 : 1;
      const newItem: Residente = { id: newId, nombre, departamento, correo, telefono, contrato_estado, estado };
      setResidentesData(prev => [...prev, newItem]);
      addActivity(`Nuevo residente registrado: <strong>${nombre}</strong>`, 'fa-user-plus', 'var(--success)');
      addNotification('admin', 'Nuevo residente', `Se registró a ${nombre} como residente.`, 'fa-user-plus');
    } else if (drawerMode === 'edit' && selectedItem) {
      setResidentesData(prev => prev.map(r =>
        r.id === selectedItem.id ? { ...r, nombre, departamento, correo, telefono, contrato_estado, estado } : r
      ));
      addActivity(`Residente editado: <strong>${nombre}</strong>`, 'fa-edit', 'var(--accent)');
      addNotification('admin', 'Residente editado', `Se actualizó la información de ${nombre}.`, 'fa-edit');
    }

    setDrawerOpen(false);
    alert('Datos guardados correctamente.');
  }, [drawerMode, selectedItem, residentesData, setResidentesData, addActivity, addNotification]);

  const handleDelete = useCallback(() => {
    if (!deleteItem) return;
    const newEstado = deleteItem.estado === 'Activo' ? 'Inactivo' : 'Activo';
    setResidentesData(prev => prev.map(r =>
      r.id === deleteItem.id ? { ...r, estado: newEstado } : r
    ));
    if (newEstado === 'Inactivo') {
      addActivity(`Residente deshabilitado: <strong>${deleteItem.nombre}</strong>`, 'fa-user-slash', 'var(--warning)');
      addNotification('admin', 'Residente deshabilitado', `${deleteItem.nombre} ha sido deshabilitado.`, 'fa-user-slash');
    } else {
      addActivity(`Residente habilitado: <strong>${deleteItem.nombre}</strong>`, 'fa-user-check', 'var(--success)');
      addNotification('admin', 'Residente habilitado', `${deleteItem.nombre} ha sido habilitado.`, 'fa-user-check');
    }
    setModalOpen(false);
    setDeleteItem(null);
  }, [deleteItem, setResidentesData, addActivity, addNotification]);

  // The drawer's onSave will use handleSave for create, handleSimpleEditSave for edit
  const drawerOnSave = drawerMode === 'edit' ? handleSimpleEditSave : (drawerMode === 'create' ? handleSave : undefined);

  const renderDrawerContent = () => {
    if (drawerMode === 'view' && selectedItem) {
      return (
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Nombre</span>
            <span className="detail-value">{selectedItem.nombre}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Departamento</span>
            <span className="detail-value">{selectedItem.departamento}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Correo</span>
            <span className="detail-value">{selectedItem.correo}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Teléfono</span>
            <span className="detail-value">{selectedItem.telefono}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Contrato</span>
            <span className="detail-value">
              <span className={`badge ${selectedItem.contrato_estado === 'Activo' ? 'badge-success' : 'badge-warning'}`}>
                {selectedItem.contrato_estado}
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Estado</span>
            <span className="detail-value">
              <span className={`badge ${selectedItem.estado === 'Activo' ? 'badge-success' : 'badge-warning'}`}>
                {selectedItem.estado}
              </span>
            </span>
          </div>
        </div>
      );
    }

    // Edit mode: only show estado selector
    if (drawerMode === 'edit') {
      const data = selectedItem || { estado: 'Activo' };
      return (
        <div className="form-section">
          <h4>Cambiar Estado</h4>
          <div className="form-group">
            <label>Estado del residente</label>
            <select id="resEstadoEdit" defaultValue={data.estado}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      );
    }

    // Create mode: show all fields
    const data = selectedItem || { nombre: '', departamento: '', correo: '', telefono: '', contrato_estado: 'Activo', estado: 'Activo' };
    return (
      <>
        <div className="form-section">
          <h4>Información General</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre completo</label>
              <input id="resNombre" type="text" defaultValue={data.nombre} placeholder="Nombre completo" />
            </div>
            <div className="form-group">
              <label>Departamento</label>
              <input id="resDepto" type="text" defaultValue={data.departamento} placeholder="Ej: 3B" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Correo</label>
              <input id="resCorreo" type="email" defaultValue={data.correo} placeholder="correo@email.com" />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input id="resTelefono" type="text" defaultValue={data.telefono} placeholder="+506 8888-9999" />
            </div>
          </div>
        </div>
        <div className="form-section">
          <h4>Estado</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Contrato</label>
              <select id="resContrato" defaultValue={data.contrato_estado}>
                <option value="Activo">Activo</option>
                <option value="Vencido">Vencido</option>
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select id="resEstado" defaultValue={data.estado}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <PageHeader title="Residentes">
        <button className="btn-primary" onClick={() => openDrawer('create')}>
          <i className="fas fa-plus"></i> Nuevo residente
        </button>
      </PageHeader>

      <div className="filters-bar">
        <div className="filter-group">
          <label htmlFor="buscarResidente">Buscar</label>
          <input type="text" id="buscarResidente" placeholder="Nombre, departamento..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>
        <div className="filter-group">
          <label htmlFor="filtroContrato">Contrato</label>
          <select id="filtroContrato" value={filtroContrato} onChange={e => setFiltroContrato(e.target.value)}>
            <option value="">Todos</option>
            <option>Activo</option>
            <option>Vencido</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filtroEstadoRes">Estado</label>
          <select id="filtroEstadoRes" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option>Activo</option>
            <option>Inactivo</option>
          </select>
        </div>
      </div>

      <table className="table-modern">
        <thead>
          <tr><th>Nombre</th><th>Departamento</th><th>Correo</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td data-label="Nombre">{r.nombre}</td>
              <td data-label="Departamento">{r.departamento}</td>
              <td data-label="Correo">{r.correo}</td>
              <td data-label="Estado">
                <span className={`badge ${r.estado === 'Activo' ? 'badge-success' : 'badge-warning'}`}>
                  {r.estado}
                </span>
              </td>
              <td data-label="Acciones" className="action-icons">
                <a onClick={() => openDrawer('view', r)} aria-label="Ver"><i className="fas fa-eye"></i></a>
                <a onClick={() => openDrawer('edit', r)} aria-label="Editar"><i className="fas fa-edit"></i></a>
                {r.estado === 'Activo' && (
                  <a onClick={() => openDeleteModal(r)} aria-label="Deshabilitar">
                    <i className="fas fa-trash-alt"></i>
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerMode === 'create' ? 'Nuevo residente' : drawerMode === 'edit' ? 'Editar residente' : 'Ver residente'}
        onSave={drawerOnSave}
        saveText={drawerMode === 'create' ? 'Crear' : (drawerMode === 'edit' ? 'Guardar' : undefined)}
        size="md"
      >
        {renderDrawerContent()}
      </Drawer>

      {deleteItem && (
        <Modal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setDeleteItem(null); }}
          title="Deshabilitar residente"
          message={`¿Estás seguro de que deseas deshabilitar a ${deleteItem.nombre}? El residente quedará inactivo en el sistema.`}
          confirmText="Deshabilitar"
          confirmClassName="btn-danger"
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
