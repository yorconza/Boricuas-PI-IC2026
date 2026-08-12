/**
 * ============================================================================
 * Archivo: PagosPage.tsx
 * ============================================================================
 * Pantalla de pagos integrada con la API usando fetch nativo.
 * Incluye la función de validación de cédula costarricense internamente.
 * ============================================================================
 */

import { useState, useCallback, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import { useData } from '../../context/DataContext';

const API_PAGOS_URL = 'http://localhost:4000/api/pagos';



// ----------------------------------------------------------------------------
// FUNCIÓN DE VALIDACIÓN DE CÉDULA COSTARRICENSE
// ----------------------------------------------------------------------------
const validarCedulaCR = (cedula: string): boolean => {
  if (!cedula) return false;
  
  // Elimina guiones y espacios en blanco
  const cedulaLimpia = cedula.replace(/-/g, '').trim();

  // Revisa que contenga solo números y tenga entre 9 y 12 dígitos
  const regexCedula = /^[1-9]\d{8,11}$/;
  
  return regexCedula.test(cedulaLimpia);
};

// ----------------------------------------------------------------------------
// INTERFACES TYPESCRIPT
// ----------------------------------------------------------------------------
export interface PagoApi {
  id_pago: number;
  residente: string; // Contiene la cédula grabada
  concepto: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  estado: string;
  id_reserva?: number | null;
  area_comun?: string | null;
}

export interface MetricasPagos {
  total_recaudado: number;
  pendientes: number;
  pagados_hoy: number;
}

// ----------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------------------------------
export default function PagosPage() {
  const { addActivity, addNotification } = useData();

  // Estados de la API
  const [pagos, setPagos] = useState<PagoApi[]>([]);
  const [metricas, setMetricas] = useState<MetricasPagos>({
    total_recaudado: 0,
    pendientes: 0,
    pagados_hoy: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados del Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'create'>('view');
  const [selectedItem, setSelectedItem] = useState<PagoApi | null>(null);

  // Estados del Formulario (formResidente almacena la Cédula)
  const [formResidente, setFormResidente] = useState('');
  const [formConcepto, setFormConcepto] = useState('');
  const [formMonto, setFormMonto] = useState('');
  const [formMetodo, setFormMetodo] = useState('Transferencia');
  const [submitting, setSubmitting] = useState(false);

  // Cargar los datos desde el Backend
  const cargarDatosServidor = useCallback(async () => {
    try {
      setError(null);

      const [resPagos, resMetricas] = await Promise.all([
        fetch(API_PAGOS_URL),
        fetch(`${API_PAGOS_URL}/metricas?id_usuario_actual=1`),
      ]);

      if (!resPagos.ok || !resMetricas.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const dataPagos: PagoApi[] = await resPagos.json();
      const dataMetricas: MetricasPagos = await resMetricas.json();

      setPagos(dataPagos);
      setMetricas(dataMetricas);
    } catch (err: unknown) {
      console.error('Error al obtener datos de pagos:', err);
      const mensajeError =
        err instanceof Error ? err.message : 'Error al conectar con el servidor backend.';
      setError(mensajeError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const inicializar = async () => {
      await cargarDatosServidor();
    };

    if (mounted) {
      inicializar();
    }

    return () => {
      mounted = false;
    };
  }, [cargarDatosServidor]);

  const openView = (item: PagoApi) => {
    setSelectedItem(item);
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const openCreate = () => {
    setSelectedItem(null);
    setFormResidente('');
    setFormConcepto('');
    setFormMonto('');
    setFormMetodo('Transferencia');
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  // Guardar pago realizando la validación de cédula interna
  const handleSave = useCallback(async () => {
    if (drawerMode === 'create') {
      const cedula = formResidente.trim();
      const concepto = formConcepto.trim();
      const montoNum = parseFloat(formMonto);

      // 1. Validar cédula costarricense
      if (!validarCedulaCR(cedula)) {
        alert('Por favor ingrese una cédula costarricense válida (ejemplo: 112340567 o 1-1234-0567).');
        return;
      }

      // 2. Validar campos requeridos
      if (!concepto || isNaN(montoNum) || montoNum <= 0) {
        alert('Por favor complete todos los campos requeridos con valores válidos.');
        return;
      }

      try {
        setSubmitting(true);
        const payload = {
          residente: cedula, // La cédula viaja en la variable residente que ya espera el Backend
          concepto,
          monto: montoNum,
          metodo: formMetodo,
          estado_pago: 'Pagado',
        };

        const res = await fetch(API_PAGOS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = (await res.json()) as { message?: string };
          throw new Error(errData?.message || 'Error al guardar el pago');
        }

        const formatoMonto = `₡${montoNum.toLocaleString()}`;
        addActivity(
          `Pago registrado de la cédula <strong>${cedula}</strong> por ${formatoMonto}`,
          'fa-credit-card',
          'var(--success)'
        );
        addNotification(
          'admin',
          'Nuevo pago',
          `Cédula ${cedula} realizó un pago de ${formatoMonto}.`,
          'fa-credit-card'
        );

        setDrawerOpen(false);
        alert('Pago registrado correctamente.');

        // Recargar la tabla y métricas tras guardar
        setLoading(true);
        cargarDatosServidor();
      } catch (err: unknown) {
        console.error('Error al guardar el pago:', err);
        const mensajeError =
          err instanceof Error ? err.message : 'Error al registrar el pago en la base de datos.';
        alert(mensajeError);
      } finally {
        setSubmitting(false);
      }
    } else {
      setDrawerOpen(false);
    }
  }, [
    drawerMode,
    formResidente,
    formConcepto,
    formMonto,
    formMetodo,
    addActivity,
    addNotification,
    cargarDatosServidor,
  ]);

  const renderDrawerContent = () => {
    if (drawerMode === 'view' && selectedItem) {
      const p = selectedItem;
      return (
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Cédula</span>
            <span className="detail-value">{p.residente}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Concepto</span>
            <span className="detail-value">{p.concepto}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Monto</span>
            <span
              className="detail-value"
              style={{ fontWeight: 600, color: 'var(--success)' }}
            >
              ₡{Number(p.monto).toLocaleString()}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Fecha</span>
            <span className="detail-value">
              {p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Método</span>
            <span className="detail-value">{p.metodo_pago}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Estado</span>
            <span className="detail-value">
              <span
                className={`badge ${
                  p.estado === 'Pagado' || p.estado === 'Completado'
                    ? 'badge-success'
                    : 'badge-warning'
                }`}
              >
                {p.estado}
              </span>
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="form-section">
        <h4>Información del pago</h4>
        <div className="form-group">
          <label>Cédula del residente *</label>
          <input
            type="text"
            placeholder="Ej: 1-1234-0567"
            value={formResidente}
            onChange={(e) => setFormResidente(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Concepto *</label>
          <input
            type="text"
            placeholder="Concepto del pago"
            value={formConcepto}
            onChange={(e) => setFormConcepto(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Monto *</label>
          <input
            type="number"
            placeholder="0.00"
            value={formMonto}
            onChange={(e) => setFormMonto(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Método</label>
          <select
            value={formMetodo}
            onChange={(e) => setFormMetodo(e.target.value)}
          >
            <option value="Transferencia">Transferencia</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Pagos">
        <button className="btn-primary" onClick={openCreate}>
          <i className="fas fa-plus"></i> Registrar pago
        </button>
      </PageHeader>

      <div className="payment-summary">
        <div className="stat-card">
          <div className="stat-label">Total recaudado</div>
          <div className="stat-value">₡{metricas.total_recaudado.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pendientes</div>
          <div className="stat-value" style={{ color: 'var(--warning, #e67e22)' }}>
            ₡{metricas.pendientes.toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pagados hoy</div>
          <div className="stat-value" style={{ color: 'var(--success, #2ecc71)' }}>
            ₡{metricas.pagados_hoy.toLocaleString()}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
          <p>Cargando información de pagos...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
          <p>{error}</p>
          <button
            className="btn-primary"
            onClick={() => {
              setLoading(true);
              cargarDatosServidor();
            }}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <table className="table-modern">
          <thead>
            <tr>
              <th>Cédula</th>
              <th>Concepto</th>
              <th>Monto</th>
              <th>Fecha</th>
              <th>Método</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagos.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                  No hay pagos registrados.
                </td>
              </tr>
            ) : (
              pagos.map((p) => (
                <tr key={p.id_pago}>
                  <td data-label="Cédula">{p.residente}</td>
                  <td data-label="Concepto">{p.concepto}</td>
                  <td data-label="Monto">₡{Number(p.monto).toLocaleString()}</td>
                  <td data-label="Fecha">
                    {p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString() : 'N/A'}
                  </td>
                  <td data-label="Método">{p.metodo_pago}</td>
                  <td data-label="Estado">
                    <span
                      className={`badge ${
                        p.estado === 'Pagado' || p.estado === 'Completado'
                          ? 'badge-success'
                          : 'badge-warning'
                      }`}
                    >
                      {p.estado}
                    </span>
                  </td>
                  <td data-label="Acciones" className="action-icons">
                    <a
                      onClick={() => openView(p)}
                      aria-label="Ver"
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="fas fa-eye"></i>
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerMode === 'create' ? 'Registrar pago' : 'Detalle de pago'}
        onSave={drawerMode === 'view' ? undefined : handleSave}
        saveText={submitting ? 'Guardando...' : 'Registrar'}
        size="md"
      >
        {renderDrawerContent()}
      </Drawer>
    </>
  );
}