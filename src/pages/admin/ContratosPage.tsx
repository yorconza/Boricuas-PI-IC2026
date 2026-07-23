/**
 * ============================================================================
 * Archivo: ContratosPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de gestión de contratos de residentes. Permite crear, ver y
 * cambiar el estado de los contratos (Activo/Vencido).
 *
 * Componentes que utiliza
 * - PageHeader (título y botón "Nuevo contrato")
 * - Drawer (formulario de creación/edición/visión detalle)
 * - useData (contexto: contratosData, addActivity, addNotification)
 *
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import { useData } from '../../context/DataContext';
import type { Contrato } from '../../types';

export default function ContratosPage() {
  const { contratosData, setContratosData, addActivity, addNotification } = useData();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<Contrato | null>(null);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const filtered = contratosData.filter(c => {
    if (buscar && !c.residente.toLowerCase().includes(buscar.toLowerCase())) return false;
    if (filtroEstado && c.estado !== filtroEstado) return false;
    return true;
  });

  const openDrawer = (mode: 'create' | 'view' | 'edit', item?: Contrato) => {
    setDrawerMode(mode);
    setSelectedItem(item || null);
    setDrawerOpen(true);
  };

  const handleCreateSave = useCallback(() => {
    const residente = (document.getElementById('contResidente') as HTMLInputElement)?.value?.trim() || '';
    const departamento = (document.getElementById('contDepto') as HTMLInputElement)?.value?.trim() || '';
    const fecha_inicio = (document.getElementById('contInicio') as HTMLInputElement)?.value || '';
    const fecha_fin = (document.getElementById('contFin') as HTMLInputElement)?.value || '';
    const estadoSelect = document.getElementById('contEstado') as HTMLSelectElement;
    const estado = estadoSelect?.value || 'Activo';

    const newId = contratosData.length ? Math.max(...contratosData.map(c => c.id)) + 1 : 1;
    const newItem: Contrato = { id: newId, residente, departamento, fecha_inicio, fecha_fin, estado };
    setContratosData(prev => [...prev, newItem]);
    addActivity(`Nuevo contrato creado para <strong>${residente}</strong>`, 'fa-file-signature', 'var(--accent)');
    addNotification('admin', 'Nuevo contrato', `Se creó un contrato para ${residente}.`, 'fa-file-signature');

    setDrawerOpen(false);
    alert('Datos guardados correctamente.');
  }, [contratosData, setContratosData, addActivity, addNotification]);

  const handleEditSave = useCallback(() => {
    if (!selectedItem) return;
    const estadoSelect = document.getElementById('contEstadoEdit') as HTMLSelectElement;
    const estado = estadoSelect?.value || 'Activo';

    setContratosData(prev => prev.map(c =>
      c.id === selectedItem.id ? { ...c, estado } : c
    ));
    addActivity(`Estado de contrato actualizado para <strong>${selectedItem.residente}</strong>`, 'fa-edit', 'var(--accent)');
    addNotification('admin', 'Contrato editado', `Se actualizó el estado del contrato de ${selectedItem.residente} a ${estado}.`, 'fa-edit');

    setDrawerOpen(false);
    alert('Estado actualizado correctamente.');
  }, [selectedItem, setContratosData, addActivity, addNotification]);

  const renderDrawerContent = () => {
    if (drawerMode === 'view' && selectedItem) {
      return (
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Residente</span>
            <span className="detail-value">{selectedItem.residente}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Departamento</span>
            <span className="detail-value">{selectedItem.departamento}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Fecha inicio</span>
            <span className="detail-value">{selectedItem.fecha_inicio}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Fecha fin</span>
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
            <label>Estado del contrato</label>
            <select id="contEstadoEdit" defaultValue={data.estado}>
              <option value="Activo">Activo</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>
        </div>
      );
    }

    // Create mode: show all fields
    const data = selectedItem || { residente: '', departamento: '', fecha_inicio: '', fecha_fin: '', estado: 'Activo' };
    return (
      <>
        <div className="form-section">
          <h4>Información del Contrato</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Residente</label>
              <input id="contResidente" type="text" defaultValue={data.residente} placeholder="Nombre del residente" />
            </div>
            <div className="form-group">
              <label>Departamento</label>
              <input id="contDepto" type="text" defaultValue={data.departamento} placeholder="Ej: 101" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha inicio</label>
              <input id="contInicio" type="date" defaultValue={data.fecha_inicio} />
            </div>
            <div className="form-group">
              <label>Fecha fin</label>
              <input id="contFin" type="date" defaultValue={data.fecha_fin} />
            </div>
          </div>
        </div>
        <div className="form-section">
          <h4>Estado</h4>
          <div className="form-group">
            <label>Estado</label>
            <select id="contEstado" defaultValue={data.estado}>
              <option value="Activo">Activo</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>
        </div>
      </>
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
          <input type="text" placeholder="Residente..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Estado</label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option>Activo</option>
            <option>Vencido</option>
          </select>
        </div>
      </div>

      <table className="table-modern">
        <thead>
          <tr><th>Residente</th><th>Departamento</th><th>Fecha inicio</th><th>Fecha fin</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {filtered.map(c => (
            <tr key={c.id}>
              <td data-label="Residente">{c.residente}</td>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerMode === 'create' ? 'Nuevo contrato' : drawerMode === 'edit' ? 'Editar contrato' : 'Ver contrato'}
        onSave={drawerMode === 'edit' ? handleEditSave : (drawerMode === 'create' ? handleCreateSave : undefined)}
        saveText={drawerMode === 'create' ? 'Crear' : (drawerMode === 'edit' ? 'Guardar' : undefined)}
        size="md"
      >
        {renderDrawerContent()}
      </Drawer>
    </>
  );
}
