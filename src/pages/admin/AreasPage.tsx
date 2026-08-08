import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import Modal from '../../components/Modal';
import { useData } from '../../context/DataContext';
import { formatHora } from '../../hooks/useLocalDate';
import { 
  getAreas, 
  createArea, 
  updateArea, 
  toggleEstadoArea, 
  type AreaComun 
} from '../../services/areaServices';

export default function AreasPage() {
  const { addActivity, addNotification } = useData();

  // Estados de datos remotos
  const [areasList, setAreasList] = useState<AreaComun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modales y Drawers
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);

  // Estado del Formulario
  const [formData, setFormData] = useState<AreaComun>({
    nombre: '',
    capacidad_max: 10,
    costo_por_hora: 0,
    hora_apertura: '08:00',
    hora_cierre: '22:00',
    max_reservas_semana: 10,
    descripcion: '',
    foto_principal: '',
  });

  // 1. Cargar áreas desde el Backend de forma segura
  useEffect(() => {
    let isMounted = true;

    const fetchAreas = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAreas();
        if (isMounted) {
          setAreasList(data);
        }
      } catch (err: unknown) {
        console.error('Error al cargar áreas:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
        if (isMounted) {
          setError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAreas();

    return () => {
      isMounted = false;
    };
  }, []);

  // Función auxiliar para refrescar la lista tras mutaciones (POST, PUT, PATCH)
  const reloadAreas = async () => {
    try {
      const data = await getAreas();
      setAreasList(data);
    } catch (err: unknown) {
      console.error('Error al refrescar las áreas:', err);
    }
  };

  // 2. Abrir Drawer para Crear o Editar
  const openDrawer = (mode: 'create' | 'edit', area?: AreaComun) => {
    setDrawerMode(mode);
    if (mode === 'edit' && area) {
      setSelectedAreaId(area.id_area || null);
      setFormData({
        nombre: area.nombre || '',
        capacidad_max: area.capacidad_max || 10,
        costo_por_hora: area.costo_por_hora || 0,
        hora_apertura: area.hora_apertura ? area.hora_apertura.substring(0, 5) : '08:00',
        hora_cierre: area.hora_cierre ? area.hora_cierre.substring(0, 5) : '22:00',
        max_reservas_semana: area.max_reservas_semana || 10,
        descripcion: area.descripcion || '',
        foto_principal: area.foto_principal || '',
      });
    } else {
      setSelectedAreaId(null);
      setFormData({
        nombre: '',
        capacidad_max: 10,
        costo_por_hora: 0,
        hora_apertura: '08:00',
        hora_cierre: '22:00',
        max_reservas_semana: 10,
        descripcion: '',
        foto_principal: '',
      });
    }
    setDrawerOpen(true);
  };

  // 3. Guardar cambios (POST o PUT a la API)
  const handleSave = async () => {
    try {
      if (!formData.nombre || !formData.capacidad_max) {
        alert('Por favor completa el nombre y la capacidad.');
        return;
      }

      if (drawerMode === 'create') {
        await createArea(formData);
        addActivity(`Nueva área común creada: <strong>${formData.nombre}</strong>`, 'fa-plus-circle', 'var(--accent)');
        addNotification('admin', 'Nueva área', `Se creó el área "${formData.nombre}".`, 'fa-plus-circle');
      } else if (drawerMode === 'edit' && selectedAreaId !== null) {
        await updateArea(selectedAreaId, formData);
        addActivity(`Área común "${formData.nombre}" editada`, 'fa-edit', 'var(--accent)');
        addNotification('admin', 'Área editada', `El área "${formData.nombre}" fue actualizada.`, 'fa-edit');
      }

      setDrawerOpen(false);
      await reloadAreas();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar en la base de datos.';
      alert(errorMessage);
    }
  };

  // 4. Abrir Confirmación para Deshabilitar
  const openDisableModal = (id: number) => {
    setSelectedAreaId(id);
    setDisableModalOpen(true);
  };

  // 5. Deshabilitar o Activar (PATCH a la API)
  const handleToggleEstado = async (id: number, deshabilitar: boolean) => {
    const area = areasList.find(a => a.id_area === id);
    try {
      await toggleEstadoArea(id, !deshabilitar);
      
      if (deshabilitar) {
        addActivity(`Área común "${area?.nombre}" deshabilitada`, 'fa-pause', 'var(--warning)');
        addNotification('admin', 'Área deshabilitada', `El área "${area?.nombre}" fue deshabilitada.`, 'fa-pause');
      } else {
        addActivity(`Área común "${area?.nombre}" habilitada`, 'fa-play', 'var(--success)');
        addNotification('admin', 'Área habilitada', `El área "${area?.nombre}" fue habilitada.`, 'fa-play');
      }

      setDisableModalOpen(false);
      setSelectedAreaId(null);
      await reloadAreas();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el estado.';
      alert(errorMessage);
    }
  };

  return (
    <>
      <PageHeader title="Áreas comunes">
        <button className="btn-primary" onClick={() => openDrawer('create')}>
          <i className="fas fa-plus"></i> Agregar área
        </button>
      </PageHeader>

      <div className="area-grid" id="areaGrid">
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando áreas desde la base de datos...</p>
        ) : error ? (
          <p style={{ color: 'var(--danger, red)' }}>{error}</p>
        ) : areasList.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No hay áreas registradas.</p>
        ) : (
          areasList.map(area => {
            const isDisabled = area.estado === 'Inactiva';
            const badgeClass = isDisabled ? 'badge-disabled' : 'badge-success';
            const badgeText = area.estado || 'Disponible';
            const imagenUrl = area.foto_principal || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=80';

            return (
              <div key={area.id_area} className={`area-card ${isDisabled ? 'disabled' : ''}`}>
                <div className="area-img">
                  <img src={imagenUrl} alt={area.nombre} />
                </div>
                <div className="area-body">
                  <h4>{area.nombre}</h4>
                  <p>Capacidad: {area.capacidad_max} personas</p>
                  <p>Horario: {formatHora(area.hora_apertura || '08:00')} - {formatHora(area.hora_cierre || '22:00')}</p>
                  <p>Costo: {Number(area.costo_por_hora) === 0 ? 'Gratis' : `₡${area.costo_por_hora}/h`}</p>
                  <p><span className={`badge ${badgeClass}`}>{badgeText}</span></p>
                  <div className="area-actions">
                    <a onClick={() => openDrawer('edit', area)}>
                      <i className="fas fa-edit"></i> Editar
                    </a>
                    {isDisabled ? (
                      <a className="btn-success" onClick={() => handleToggleEstado(area.id_area!, false)}>
                        <i className="fas fa-play"></i> Habilitar
                      </a>
                    ) : (
                      <a className="btn-danger" onClick={() => openDisableModal(area.id_area!)}>
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

      {/* Formulario en Drawer */}
      <Drawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        title={drawerMode === 'create' ? 'Nueva Área' : 'Editar Área'} 
        onSave={handleSave}
      >
        <div className="form-section">
          <h4>Información del área</h4>
          
          <div className="form-group">
            <label>Nombre</label>
            <input 
              type="text" 
              placeholder="Nombre del área" 
              value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Capacidad</label>
            <input 
              type="number" 
              placeholder="Capacidad (personas)" 
              value={formData.capacidad_max}
              onChange={e => setFormData({ ...formData, capacidad_max: Number(e.target.value) })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Hora inicio</label>
              <select 
                value={formData.hora_apertura} 
                onChange={e => setFormData({ ...formData, hora_apertura: e.target.value })}
              >
                {Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`).map(h => (
                  <option key={h} value={h}>{formatHora(h)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Hora fin</label>
              <select 
                value={formData.hora_cierre} 
                onChange={e => setFormData({ ...formData, hora_cierre: e.target.value })}
              >
                {Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`).map(h => (
                  <option key={h} value={h}>{formatHora(h)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Costo por hora</label>
            <input 
              type="number" 
              placeholder="Costo por hora" 
              value={formData.costo_por_hora}
              onChange={e => setFormData({ ...formData, costo_por_hora: Number(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label>URL de imagen</label>
            <input 
              type="text" 
              placeholder="URL de la imagen" 
              value={formData.foto_principal || ''}
              onChange={e => setFormData({ ...formData, foto_principal: e.target.value })}
            />
          </div>
        </div>
      </Drawer>

      {/* Modal de Confirmación */}
      <Modal
        isOpen={disableModalOpen}
        onClose={() => setDisableModalOpen(false)}
        title="Deshabilitar área"
        message={selectedAreaId !== null ? `¿Estás seguro de que deseas deshabilitar el área "${areasList.find(a => a.id_area === selectedAreaId)?.nombre}"?` : ''}
        confirmText="Deshabilitar"
        onConfirm={() => handleToggleEstado(selectedAreaId!, true)}
      />
    </>
  );
}