/**
 * ============================================================================
 * Archivo: PersonalPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de gestión de personal (empleados). Permite crear, ver, editar
 * y deshabilitar empleados. El rol se asigna automáticamente según el
 * dominio del correo (@admin.com, @guardia.com, etc.).
 *
 * Componentes que utiliza
 * - PageHeader (título y botón "Nuevo empleado")
 * - Drawer (formulario de creación/edición/visión detalle)
 * - Modal (confirmación para deshabilitar)
 * - useData (contexto: personalData, addActivity, addNotification)
 *
 * Flujo
 * 1. Admin hace clic en "Nuevo empleado" → Drawer con formulario
 * 2. Ingresa nombre, correo, teléfono, cédula
 * 3. El dominio del correo determina el rol automáticamente
 * 4. Guarda → se agrega a la tabla y se registra en activityLog
 *
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import Modal from '../../components/Modal';
import { useData } from '../../context/DataContext';
import type { Personal } from '../../types';

export default function PersonalPage() {
  const { personalData, addActivity, addNotification, crearPersonal, editarPersonal, cambiarEstadoPersonal } = useData();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<Personal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Personal | null>(null);

  const openDrawer = (mode: 'create' | 'view' | 'edit', item?: Personal) => {
    setDrawerMode(mode);
    setSelectedItem(item || null);
    setDrawerOpen(true);
  };

  const openDeleteModal = (item: Personal) => {
    setDeleteItem(item);
    setModalOpen(true);
  };

  const handleSave = useCallback(async () => {
      const nombre = (document.getElementById('personalNombre') as HTMLInputElement)?.value?.trim() || '';
      const correo = (document.getElementById('personalCorreo') as HTMLInputElement)?.value?.trim() || '';
      const telefono = (document.getElementById('personalTelefono') as HTMLInputElement)?.value?.trim() || '';
      const cedula = (document.getElementById('personalCedula') as HTMLInputElement)?.value?.trim() || '';

      try {
          if (drawerMode === 'create') {
              await crearPersonal(nombre, correo, telefono, cedula);
              addActivity(`Nuevo empleado registrado: <strong>${nombre}</strong>`, 'fa-user-plus', 'var(--success)');
              addNotification('admin', 'Nuevo empleado', `Se registró a ${nombre} como empleado.`, 'fa-user-plus');
          } else if (drawerMode === 'edit' && selectedItem) {
              await editarPersonal(selectedItem.id_usuario, nombre, correo, telefono, cedula);
              addActivity(`Empleado editado: <strong>${nombre}</strong>`, 'fa-edit', 'var(--accent)');
              addNotification('admin', 'Empleado editado', `Se actualizó la información de ${nombre}.`, 'fa-edit');
          }

          setDrawerOpen(false);
          alert('Datos guardados correctamente.');
      } catch (error: unknown) {
          const err = error as Error;
          alert(`Error: ${err.message}`);
      }
  }, [drawerMode, selectedItem, crearPersonal, editarPersonal, addActivity, addNotification]);

  const handleDelete = useCallback(async () => {
      if (!deleteItem) return;

      const activar = deleteItem.estado !== 'Activo'; // si está inactivo, lo activamos

      try {
          await cambiarEstadoPersonal(deleteItem.id_usuario, activar);

          if (!activar) {
              addActivity(`Empleado deshabilitado: <strong>${deleteItem.nombre}</strong>`, 'fa-user-slash', 'var(--warning)');
              addNotification('admin', 'Empleado deshabilitado', `${deleteItem.nombre} ha sido deshabilitado.`, 'fa-user-slash');
          } else {
              addActivity(`Empleado habilitado: <strong>${deleteItem.nombre}</strong>`, 'fa-user-check', 'var(--success)');
              addNotification('admin', 'Empleado habilitado', `${deleteItem.nombre} ha sido habilitado.`, 'fa-user-check');
          }
      } catch (error: unknown) {
          const err = error as Error;
          alert(`Error: ${err.message}`);
      }

      setModalOpen(false);
      setDeleteItem(null);
  }, [deleteItem, cambiarEstadoPersonal, addActivity, addNotification]);

  const renderDrawerContent = () => {
    if (drawerMode === 'view' && selectedItem) {
      return (
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Nombre</span>
            <span className="detail-value">{selectedItem.nombre}</span>
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
            <span className="detail-label">Cédula</span>
            <span className="detail-value">{selectedItem.cedula}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Dominio</span>
            <span className="detail-value">{selectedItem.dominio}</span>
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

    const data = selectedItem || { nombre: '', correo: '', telefono: '', cedula: '', estado: 'Activo' };
    return (
      <>
        <div className="form-section">
          <h4>Información General</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre completo</label>
              <input id="personalNombre" type="text" defaultValue={data.nombre} placeholder="Nombre completo" />
            </div>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input id="personalCorreo" type="email" defaultValue={data.correo} placeholder="correo@dominio.com" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Teléfono</label>
              <input id="personalTelefono" type="text" defaultValue={data.telefono} placeholder="+506 8888-9999" />
            </div>
            <div className="form-group">
              <label>Documento de identidad</label>
              <input id="personalCedula" type="text" defaultValue={data.cedula} placeholder="1-234-567" />
            </div>
          </div>
        </div>
        <div className="form-section">
          <h4>Estado</h4>
          <div className="form-group">
            <label>Estado</label>
            <select id="personalEstado" defaultValue={data.estado}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <PageHeader title="Personal">
        <button className="btn-primary" onClick={() => openDrawer('create')}>
          <i className="fas fa-plus"></i> Nuevo empleado
        </button>
      </PageHeader>

      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <p><strong>Dominios permitidos:</strong> El rol se asigna automáticamente según el dominio del correo.</p>
        <div style={{ marginTop: 'var(--space-2)' }}>
          <span className="badge badge-domain">@admin.com → Administrador</span>
          <span className="badge badge-domain">@guardia.com → Guarda</span>
        </div>
      </div>

      <table className="table-modern">
        <thead>
          <tr>
            <th>Foto</th><th>Nombre</th><th>Correo</th><th>Dominio</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {personalData.map(p => (
            <tr key={p.id_usuario}>
              <td data-label="Foto"><span className="avatar-placeholder">{p.iniciales}</span></td>
              <td data-label="Nombre">{p.nombre}</td>
              <td data-label="Correo">{p.correo}</td>
              <td data-label="Dominio"><span className="badge badge-domain">{p.dominio}</span></td>
              <td data-label="Estado">
                <span className={`badge ${p.estado === 'Activo' ? 'badge-success' : 'badge-warning'}`}>
                  {p.estado}
                </span>
              </td>
              <td data-label="Acciones" className="action-icons">
                <a onClick={() => openDrawer('view', p)} aria-label="Ver"><i className="fas fa-eye"></i></a>
                <a onClick={() => openDrawer('edit', p)} aria-label="Editar"><i className="fas fa-edit"></i></a>
                {p.estado === 'Activo' ? (
                    <a onClick={() => openDeleteModal(p)} aria-label="Deshabilitar">
                        <i className="fas fa-trash-alt"></i>
                    </a>
                ) : (
                    <a onClick={() => openDeleteModal(p)} aria-label="Habilitar">
                        <i className="fas fa-user-check"></i>
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
        title={drawerMode === 'create' ? 'Nuevo empleado' : drawerMode === 'edit' ? 'Editar empleado' : 'Ver empleado'}
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
          title="Deshabilitar empleado"
          message={`¿Estás seguro de que deseas deshabilitar a ${deleteItem.nombre}? El empleado quedará inactivo en el sistema.`}
          confirmText="Deshabilitar"
          confirmClassName="btn-danger"
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
