/**
 * ============================================================================
 * Archivo: ResidentesPage.tsx (Conectado a SQL Server via DataContext)
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import Modal from '../../components/Modal';
import { useData } from '../../context/DataContext';
import type { Residente } from '../../types';

export default function ResidentesPage() {
  const { 
    residentesData, 
    crearResidente, 
    editarResidente, 
    cambiarEstadoResidente, 
    addActivity, 
    addNotification 
  } = useData();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<Residente | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Residente | null>(null);
  const [buscar, setBuscar] = useState('');
  const [filtroContrato, setFiltroContrato] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Estados para controlar el formulario (sin usar document.getElementById)
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cedula, setCedula] = useState('');
  const [estadoSelect, setEstadoSelect] = useState('Activo');

  const filtered = residentesData.filter(r => {
    if (buscar && !r.nombre.toLowerCase().includes(buscar.toLowerCase()) && !r.departamento.toLowerCase().includes(buscar.toLowerCase())) return false;
    if (filtroContrato && r.contrato_estado !== filtroContrato) return false;
    if (filtroEstado && r.estado !== filtroEstado) return false;
    return true;
  });

  const openDrawer = (mode: 'create' | 'view' | 'edit', item?: Residente) => {
    setDrawerMode(mode);
    setSelectedItem(item || null);

    if (item) {
      setNombre(item.nombre || '');
      setCorreo(item.correo || '');
      setTelefono(item.telefono || '');
      setCedula(''); // Si la interfaz Residente incluye cédula se asigna aquí
      setEstadoSelect(item.estado || 'Activo');
    } else {
      setNombre('');
      setCorreo('');
      setTelefono('');
      setCedula('');
      setEstadoSelect('Activo');
    }

    setDrawerOpen(true);
  };

  const openDeleteModal = (item: Residente) => {
    setDeleteItem(item);
    setModalOpen(true);
  };

  // Guardar (POST o PUT a SQL Server)
  const handleSave = useCallback(async () => {
    try {
      if (drawerMode === 'create') {
        if (!nombre.trim() || !correo.trim()) {
          alert('Por favor ingrese al menos el nombre y correo');
          return;
        }

        // Llamada a la API de SQL Server
        await crearResidente(nombre, correo, telefono, cedula || '12345678');
        addActivity(`Nuevo residente registrado: <strong>${nombre}</strong>`, 'fa-user-plus', 'var(--success)');
        addNotification('admin', 'Nuevo residente', `Se registró a ${nombre} como residente.`, 'fa-user-plus');
        alert('Residente insertado con éxito en la Base de Datos.');
      } else if (drawerMode === 'edit' && selectedItem) {
        // Llamada a la API de edición
        await editarResidente(selectedItem.id, nombre, correo, telefono, cedula || '12345678');
        
        // Si cambió el estado
        const estaActivo = estadoSelect === 'Activo';
        if ((selectedItem.estado === 'Activo') !== estaActivo) {
          await cambiarEstadoResidente(selectedItem.id, estaActivo);
        }

        addActivity(`Residente editado: <strong>${nombre}</strong>`, 'fa-edit', 'var(--accent)');
        addNotification('admin', 'Residente editado', `Se actualizó la información de ${nombre}.`, 'fa-edit');
        alert('Residente actualizado con éxito.');
      }

      setDrawerOpen(false);
    } catch (err: any) {
      console.error('Error al guardar en la BD:', err);
      alert(`Error al guardar en SQL Server: ${err.message}`);
    }
  }, [drawerMode, selectedItem, nombre, correo, telefono, cedula, estadoSelect, crearResidente, editarResidente, cambiarEstadoResidente, addActivity, addNotification]);

  // Cambiar estado (Deshabilitar / Reactivar en SQL Server)
  const handleDelete = useCallback(async () => {
    if (!deleteItem) return;
    try {
      const activar = deleteItem.estado !== 'Activo';
      await cambiarEstadoResidente(deleteItem.id, activar);

      if (!activar) {
        addActivity(`Residente deshabilitado: <strong>${deleteItem.nombre}</strong>`, 'fa-user-slash', 'var(--warning)');
        addNotification('admin', 'Residente deshabilitado', `${deleteItem.nombre} ha sido deshabilitado.`, 'fa-user-slash');
      } else {
        addActivity(`Residente habilitado: <strong>${deleteItem.nombre}</strong>`, 'fa-user-check', 'var(--success)');
        addNotification('admin', 'Residente habilitado', `${deleteItem.nombre} ha sido habilitado.`, 'fa-user-check');
      }

      setModalOpen(false);
      setDeleteItem(null);
    } catch (err: any) {
      console.error('Error cambiando estado:', err);
      alert(`Error al cambiar el estado: ${err.message}`);
    }
  }, [deleteItem, cambiarEstadoResidente, addActivity, addNotification]);

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

    return (
      <>
        <div className="form-section">
          <h4>Información General</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre completo</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div className="form-group">
              <label>Cédula</label>
              <input type="text" value={cedula} onChange={e => setCedula(e.target.value)} placeholder="Cédula" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Correo</label>
              <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="correo@email.com" />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+506 8888-9999" />
            </div>
          </div>
        </div>
        {drawerMode === 'edit' && (
          <div className="form-section">
            <h4>Estado</h4>
            <div className="form-group">
              <label>Estado del residente</label>
              <select value={estadoSelect} onChange={e => setEstadoSelect(e.target.value)}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        )}
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
            <option>Sin Contrato</option>
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
        onSave={drawerMode !== 'view' ? handleSave : undefined}
        saveText={drawerMode === 'create' ? 'Crear' : 'Guardar'}
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