/**
 * ============================================================================
 * Archivo: AreasPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de administración de áreas comunes. Permite crear, editar,
 * habilitar y deshabilitar áreas como Salón Social, Piscina, Gimnasio, etc.
 *
 * Componentes que utiliza
 * - PageHeader (título y botón "Agregar área")
 * - Drawer (formulario de creación/edición)
 * - Modal (confirmación para deshabilitar)
 * - useData (contexto: areasData, addActivity, addNotification)
 * - useLocalDate (formato de hora)
 *
 * Flujo
 * 1. Admin hace clic en "Agregar área" → se abre Drawer con formulario
 * 2. Completa datos (nombre, capacidad, horario, costo, estado, imagen)
 * 3. Guarda → se agrega a la lista y se registra en activityLog
 * 4. Para deshabilitar: clic en "Deshabilitar" → Modal de confirmación
 *
 * ============================================================================
 */

import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import Modal from '../../components/Modal';
import { useData } from '../../context/DataContext';
import { formatHora } from '../../hooks/useLocalDate';
import { useAlert } from '../../components/Alert';

export default function AreasPage() {
  const { areasData, setAreasData, addActivity, addNotification } = useData();
  const { showAlert } = useAlert();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disableAreaId, setDisableAreaId] = useState<number | null>(null);

  // NOTA (limpieza): el modo 'edit' lee los valores del DOM por nombre del área,
  // por eso el parámetro _id no se usaba (código muerto) y se eliminó.
  const openDrawer = (mode: 'create' | 'edit') => {
    setDrawerMode(mode);
    setDrawerOpen(true);
  };

  const handleSave = () => {
    const titleEl = document.getElementById('drawerTitle');
    const title = titleEl?.textContent || '';
    const nombre = (document.querySelector('#drawerBody input[placeholder*="Nombre"]') as HTMLInputElement)?.value || '';
    const capacidad = (document.querySelector('#drawerBody input[placeholder*="Capacidad"]') as HTMLInputElement)?.value || '';
    const horaInicioSelect = document.querySelector('#drawerBody select:first-of-type') as HTMLSelectElement;
    const horaFinSelect = document.querySelector('#drawerBody select:nth-of-type(2)') as HTMLSelectElement;
    const costo = (document.querySelector('#drawerBody input[placeholder*="Costo"]') as HTMLInputElement)?.value || '';
    const estadoSelect = document.querySelector('#drawerBody select:last-of-type') as HTMLSelectElement;
    const imagen = (document.querySelector('#drawerBody input[placeholder*="URL"]') as HTMLInputElement)?.value || '';

    const hora_inicio = horaInicioSelect?.value || '08:00';
    const hora_fin = horaFinSelect?.value || '22:00';
    const estado = estadoSelect?.value || 'Disponible';

    const isEdit = title.includes('Editar');

    if (isEdit) {
      const existing = areasData.find(a => a.nombre === nombre);
      if (existing) {
        const oldEstado = existing.estado;
        setAreasData(prev => prev.map(a =>
          a.id === existing.id ? {
            ...a,
            nombre: nombre || a.nombre,
            capacidad: capacidad || a.capacidad,
            hora_inicio,
            hora_fin,
            costo: costo || a.costo,
            estado,
            imagen: imagen || a.imagen
          } : a
        ));
        if (oldEstado !== estado) {
          if (estado === 'Disponible' && oldEstado === 'Deshabilitada') {
            addActivity(`Área común "${nombre}" habilitada`, 'fa-play', 'var(--success)');
            addNotification('admin', 'Área habilitada', `El área "${nombre}" fue habilitada.`, 'fa-play');
          } else if (estado === 'Deshabilitada') {
            addActivity(`Área común "${nombre}" deshabilitada`, 'fa-pause', 'var(--warning)');
            addNotification('admin', 'Área deshabilitada', `El área "${nombre}" fue deshabilitada.`, 'fa-pause');
          }
        } else {
          addActivity(`Área común "${nombre}" editada`, 'fa-edit', 'var(--accent)');
          addNotification('admin', 'Área editada', `El área "${nombre}" fue actualizada.`, 'fa-edit');
        }
      }
    } else {
      const newId = areasData.length ? Math.max(...areasData.map(a => a.id)) + 1 : 1;
      const newArea = {
        id: newId,
        nombre: nombre || 'Nueva área',
        capacidad: capacidad || '10',
        hora_inicio,
        hora_fin,
        costo: costo || 'Gratis',
        imagen: imagen || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=80',
        estado
      };
      setAreasData(prev => [...prev, newArea]);
      addActivity(`Nueva área común creada: <strong>${newArea.nombre}</strong>`, 'fa-plus-circle', 'var(--accent)');
      addNotification('admin', 'Nueva área', `Se creó el área "${newArea.nombre}".`, 'fa-plus-circle');
    }

    setDrawerOpen(false);
    showAlert('Área guardada correctamente.', { titulo: 'Éxito', tipo: 'success' });
  };

  const openDisableModal = (id: number) => {
    setDisableAreaId(id);
    setDisableModalOpen(true);
  };

  const handleDisable = () => {
    if (disableAreaId !== null) {
      const area = areasData.find(a => a.id === disableAreaId);
      if (area) {
        setAreasData(prev => prev.map(a => a.id === disableAreaId ? { ...a, estado: 'Deshabilitada' } : a));
        addActivity(`Área común "${area.nombre}" deshabilitada`, 'fa-pause', 'var(--warning)');
        addNotification('admin', 'Área deshabilitada', `El área "${area.nombre}" fue deshabilitada.`, 'fa-pause');
      }
    }
    setDisableModalOpen(false);
    setDisableAreaId(null);
  };

  return (
    <>
      <PageHeader title="Áreas comunes">
        <button className="btn-primary" onClick={() => openDrawer('create')}>
          <i className="fas fa-plus"></i> Agregar área
        </button>
      </PageHeader>

      <div className="area-grid" id="areaGrid">
        {areasData.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No hay áreas registradas.</p>
        ) : (
          areasData.map(area => {
            const isDisabled = area.estado === 'Deshabilitada';
            const badgeClass = isDisabled ? 'badge-disabled' : 'badge-success';
            const badgeText = isDisabled ? 'Deshabilitada' : 'Disponible';
            return (
              <div key={area.id} className={`area-card ${isDisabled ? 'disabled' : ''}`}>
                <div className="area-img"><img src={area.imagen} alt={area.nombre} /></div>
                <div className="area-body">
                  <h4>{area.nombre}</h4>
                  <p>Capacidad: {area.capacidad} personas</p>
                  <p>Horario: {formatHora(area.hora_inicio)} - {formatHora(area.hora_fin)}</p>
                  <p>Costo: {area.costo}</p>
                  <p><span className={`badge ${badgeClass}`}>{badgeText}</span></p>
                  <div className="area-actions">
                    <a onClick={() => openDrawer('edit')}><i className="fas fa-edit"></i> Editar</a>
                    {!isDisabled && (
                      <a className="btn-danger" onClick={() => openDisableModal(area.id)}>
                        <i className="fas fa-pause"></i> Deshabilitar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={drawerMode === 'create' ? 'Nueva Área' : 'Editar Área'} onSave={handleSave}>
        <div className="form-section">
          <h4>Información del área</h4>
          <div className="form-group"><label>Nombre</label><input type="text" placeholder="Nombre del área" /></div>
          <div className="form-group"><label>Capacidad</label><input type="text" placeholder="Capacidad (personas)" /></div>
          <div className="form-row">
            <div className="form-group">
              <label>Hora inicio</label>
              <select>
                {Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`).map(h => (
                  <option key={h} value={h}>{formatHora(h)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Hora fin</label>
              <select>
                {Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`).map(h => (
                  <option key={h} value={h}>{formatHora(h)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group"><label>Costo</label><input type="text" placeholder="Costo (ej: ₡20/h)" /></div>
          <div className="form-group">
            <label>Estado</label>
            <select>
              <option value="Disponible">Disponible</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Deshabilitada">Deshabilitada</option>
            </select>
          </div>
          <div className="form-group"><label>URL de imagen</label><input type="text" placeholder="URL de la imagen" /></div>
        </div>
      </Drawer>

      <Modal
        isOpen={disableModalOpen}
        onClose={() => setDisableModalOpen(false)}
        title="Deshabilitar área"
        message={disableAreaId !== null ? `¿Estás seguro de que deseas deshabilitar el área "${areasData.find(a => a.id === disableAreaId)?.nombre}"?` : ''}
        confirmText="Deshabilitar"
        onConfirm={handleDisable}
      />
    </>
  );
}
