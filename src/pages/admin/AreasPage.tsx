import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import Modal from '../../components/Modal';
import { useData } from '../../context/DataContext';
import { 
  getAreas, 
  createArea, 
  updateArea, 
  toggleEstadoArea, 
  type AreaComun 
} from '../../services/areaServices';

// Convierte "13:00" o "13:00:00" a formato legible "01:00 PM" en texto puro
const formatHora = (timeString: string | null | undefined): string => {
  if (!timeString) return '12:00 AM';
  
  // Extrae únicamente los primeros dos valores [HH, mm]
  const cleanTime = String(timeString).split('T').pop()?.split('.')[0] || timeString;
  const parts = cleanTime.split(':');
  if (parts.length < 2) return '12:00 AM';

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].substring(0, 2);

  if (isNaN(hours)) return '12:00 AM';

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

export default function AreasPage() {
  const { addActivity, addNotification } = useData();

  const [areasList, setAreasList] = useState<AreaComun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);

  const [imageOption, setImageOption] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  useEffect(() => {
    let isMounted = true;
    const fetchAreas = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAreas();
        if (isMounted) setAreasList(data);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
        if (isMounted) setError(errorMessage);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAreas();
    return () => { isMounted = false; };
  }, []);

  const reloadAreas = async () => {
    try {
      const data = await getAreas();
      setAreasList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const openDrawer = (mode: 'create' | 'edit', area?: AreaComun) => {
    setDrawerMode(mode);
    setSelectedFile(null);
    setImageOption('url');

    if (mode === 'edit' && area) {
      setSelectedAreaId(area.id_area || null);
      setFormData({
        nombre: area.nombre || '',
        capacidad_max: area.capacidad_max || 10,
        costo_por_hora: area.costo_por_hora || 0,
        // Corta la hora para adaptarla al <select> "HH:mm"
        hora_apertura: area.hora_apertura ? String(area.hora_apertura).substring(0, 5) : '08:00',
        hora_cierre: area.hora_cierre ? String(area.hora_cierre).substring(0, 5) : '22:00',
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

  const handleSave = async () => {
    try {
      if (!formData.nombre || !formData.capacidad_max) {
        alert('Por favor completa el nombre y la capacidad.');
        return;
      }

      let payload: FormData | AreaComun;

      if (imageOption === 'file' && selectedFile) {
        const form = new FormData();
        form.append('nombre', formData.nombre);
        form.append('capacidad_max', String(formData.capacidad_max));
        form.append('costo_por_hora', String(formData.costo_por_hora));
        form.append('hora_apertura', formData.hora_apertura || '08:00');
        form.append('hora_cierre', formData.hora_cierre || '22:00');
        form.append('max_reservas_semana', String(formData.max_reservas_semana || 10));
        form.append('descripcion', formData.descripcion || '');
        form.append('imagen', selectedFile);
        payload = form;
      } else {
        payload = formData; // Envía los datos exactos que seleccionaste
      }

      if (drawerMode === 'create') {
        await createArea(payload);
        addActivity(`Nueva área común creada: <strong>${formData.nombre}</strong>`, 'fa-plus-circle', 'var(--accent)');
        addNotification('admin', 'Nueva área', `Se creó el área "${formData.nombre}".`, 'fa-plus-circle');
      } else if (drawerMode === 'edit' && selectedAreaId !== null) {
        await updateArea(selectedAreaId, payload);
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

  const openDisableModal = (id: number) => {
    setSelectedAreaId(id);
    setDisableModalOpen(true);
  };

  const handleToggleEstado = async (id: number, deshabilitar: boolean) => {
    try {
      await toggleEstadoArea(id, !deshabilitar);
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
            
            const imagenUrl = (area.foto_principal && area.foto_principal.trim() !== '') 
              ? area.foto_principal 
              : 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=80';

            return (
              <div key={area.id_area} className={`area-card ${isDisabled ? 'disabled' : ''}`}>
                <div className="area-img">
                  <img src={imagenUrl} alt={area.nombre} />
                </div>
                <div className="area-body">
                  <h4>{area.nombre}</h4>
                  <p>Capacidad: {area.capacidad_max} personas</p>
                  <p>Horario: {formatHora(area.hora_apertura)} - {formatHora(area.hora_cierre)}</p>
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
            <label>Imagen del área</label>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
              <label style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="imageOption" 
                  checked={imageOption === 'url'} 
                  onChange={() => setImageOption('url')} 
                /> Enlace URL
              </label>
              <label style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="imageOption" 
                  checked={imageOption === 'file'} 
                  onChange={() => setImageOption('file')} 
                /> Subir archivo local (PNG/JPG)
              </label>
            </div>

            {imageOption === 'url' ? (
              <input 
                type="text" 
                placeholder="https://ejemplo.com/imagen.jpg" 
                value={formData.foto_principal || ''}
                onChange={e => setFormData({ ...formData, foto_principal: e.target.value })}
              />
            ) : (
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/webp"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            )}
          </div>
        </div>
      </Drawer>

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