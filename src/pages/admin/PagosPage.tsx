/**
 * ============================================================================
 * Archivo: PagosPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de pagos. Muestra resumen financiero (total recaudado, pendientes,
 * pagados hoy) y el listado de pagos realizados con detalle.
 *
 * Componentes que utiliza
 * - PageHeader (título y botón "Registrar pago")
 * - Drawer (detalle del pago / formulario de registro)
 * - useData (contexto: pagosData, addActivity, addNotification)
 *
 * ============================================================================
 */

/**
 * ============================================================================
 * Archivo: AdminDashboard.tsx
 * ============================================================================
 */

import { useEffect, useState } from 'react';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

// Interfaces estrictas — alineadas a lo que devuelven realmente los SPs
// (sp_Dashboard_ObtenerMetricas / sp_Dashboard_ObtenerDatos)
interface KPI {
  reservas_hoy: number;
  visitas_registradas: number;
  contratos_activos: number;
  areas_ocupadas: number;
  ingresos_del_dia: number; // antes: ingresos_dia (no coincidía con el SP, siempre daba ₡0)
}

interface Reserva {
  id_reserva: number;
  hora: string;
  area_comun: string;
  residente: string;
  estado: string;
}

interface Alerta {
  tipo_alerta: string;
  mensaje: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  fecha_evento: string;
}

interface Actividad {
  descripcion: string;
  fecha_evento: string;    // antes: fecha (el SP no devuelve esta columna)
  color_indicador: string; // antes: id_bitacora / tabla_afectada / minutos_transcurridos (no existen en el SP)
}

interface DashboardData {
  kpis: KPI;
  proximasReservas: Reserva[];
  alertas: Alerta[];
  actividadReciente: Actividad[];
}

const COLOR_INDICADOR: Record<string, string> = {
  verde: '#22c55e',
  amarillo: '#eab308',
  azul: '#3b82f6',
};

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async (): Promise<void> => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // Nota: Asegúrate de ajustar la URL si tu Backend corre en otro puerto (ej: http://localhost:4000/api/dashboard)
        const response = await fetch('http://localhost:4000/api/dashboard', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('El servidor no respondió con JSON válido (revisa si el backend está encendido).');
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || `Error ${response.status}: No se pudieron obtener los datos.`);
        }

        setData(result as DashboardData);
      } catch (err: unknown) {
        console.error('Error cargando Dashboard:', err);
        const errorMessage = err instanceof Error
          ? err.message
          : 'No se pudieron cargar los datos del servidor.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    // ⚠️ TODO: este efecto solo corre al montar el componente. Si tu router mantiene
    // AdminDashboard montado al navegar a otras páginas (en vez de desmontarlo/remontarlo),
    // los KPIs no se van a refrescar después de crear/editar contratos, reservas, etc.
    // Opciones: (a) hacer que el componente se desmonte al salir del Dashboard,
    // (b) exponer un refetch y llamarlo desde onNavigate al volver a 'dashboard',
    // o (c) usar una librería de data-fetching (React Query/SWR) con invalidación.
  }, []);

  if (loading) {
    return <p style={{ color: 'var(--text-muted)', padding: 'var(--space-4)' }}>Cargando dashboard...</p>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <p style={{ color: 'var(--danger-color)', marginBottom: 'var(--space-2)' }}>
          {error || 'Sin datos disponibles'}
        </p>
        <button className="btn" onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );
  }

  const {
    kpis = { reservas_hoy: 0, visitas_registradas: 0, contratos_activos: 0, areas_ocupadas: 0, ingresos_del_dia: 0 },
    proximasReservas = [],
    alertas = [],
    actividadReciente = []
  } = data;

  return (
    <>
      <h2 style={{ marginBottom: 'var(--space-4)' }}>Dashboard</h2>

      {/* KPI GRID */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => onNavigate('reservas')} tabIndex={0} role="button">
          <div className="kpi-icon"><i className="fas fa-calendar-day"></i></div>
          <div className="kpi-label">Reservas hoy</div>
          <div className="kpi-value" id="kpiReservasHoy">{kpis.reservas_hoy}</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('visitas')} tabIndex={0} role="button">
          <div className="kpi-icon"><i className="fas fa-user-check"></i></div>
          <div className="kpi-label">Visitas registradas</div>
          <div className="kpi-value">{kpis.visitas_registradas}</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('contratos')} tabIndex={0} role="button">
          <div className="kpi-icon"><i className="fas fa-file-contract"></i></div>
          <div className="kpi-label">Contratos activos</div>
          <div className="kpi-value">{kpis.contratos_activos}</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('areas')} tabIndex={0} role="button">
          <div className="kpi-icon"><i className="fas fa-people-arrows"></i></div>
          <div className="kpi-label">Áreas ocupadas</div>
          <div className="kpi-value">{kpis.areas_ocupadas}</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('pagos')} tabIndex={0} role="button">
          <div className="kpi-icon"><i className="fas fa-coins"></i></div>
          <div className="kpi-label">Ingresos del día</div>
          <div className="kpi-value">₡{(kpis.ingresos_del_dia || 0).toLocaleString('es-CR')}</div>
        </div>
      </div>

      {/* SECCIONES SECUNDARIAS */}
      <div className="dashboard-grid">
        {/* PRÓXIMAS RESERVAS */}
        <div className="card">
          <div className="card-header">
            <h3>Próximas reservas</h3>
            <a href="#reservas" onClick={e => { e.preventDefault(); onNavigate('reservas'); }}>Ver todas</a>
          </div>
          {proximasReservas.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: 'var(--space-2) 0' }}>No hay reservas programadas.</p>
          ) : (
            proximasReservas.map(reserva => (
              <div key={reserva.id_reserva} className="next-reservation-item">
                <span className="reservation-time">{reserva.hora}</span>
                <span className="reservation-info">
                  <strong>{reserva.area_comun}</strong> · {reserva.residente}
                </span>
              </div>
            ))
          )}
        </div>

        {/* ALERTAS ADMINISTRATIVAS */}
        <div className="card">
          <div className="card-header"><h3>Alertas administrativas</h3></div>
          <div id="alertasContainer">
            {alertas.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: 'var(--space-2) 0' }}>No hay alertas.</p>
            ) : (
              alertas.map((alerta, index) => (
                <div key={index} className="alert-item">
                  <span className="alert-text">{alerta.mensaje}</span>
                  <span className="alert-badge">
                    <span className={`badge ${
                      alerta.prioridad === 'Alta'
                        ? 'badge-priority-high'
                        : alerta.prioridad === 'Media'
                        ? 'badge-priority-medium'
                        : 'badge-priority-low'
                    }`}>
                      {alerta.prioridad}
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ACTIVIDAD RECIENTE */}
        <div className="card">
          <div className="card-header">
            <h3>Actividad reciente</h3>
            <a href="#actividad" onClick={e => { e.preventDefault(); onNavigate('actividad'); }}>Ver todas</a>
          </div>
          <div id="actividadContainer">
            {actividadReciente.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: 'var(--space-2) 0' }}>No hay actividad reciente.</p>
            ) : (
              actividadReciente.map((item, index) => (
                <div key={index} className="activity-item">
                  <span
                    className="activity-dot"
                    style={{ background: COLOR_INDICADOR[item.color_indicador] || 'var(--primary-color, #007bff)' }}
                  ></span>
                  <span className="activity-text">{item.descripcion}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
