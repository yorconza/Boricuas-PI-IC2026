/**
 * ============================================================================
 * Archivo: GuardiaDashboard.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla principal del panel de Guardia. Muestra KPIs de visitas:
 * pendientes, autorizadas hoy y rechazadas hoy. También lista las
 * próximas visitas pendientes.
 *
 * NOTA (cambio): Ya NO usa datos simulados. Los contadores y la lista de
 * próximas visitas se cargan desde la API real del backend
 * (guardService → /api/guard/dashboard/*), con el token JWT del guardia.
 *
 * ============================================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { guardService, type ResumenVisitasHoy, type VisitaProxima } from '../../services/guardService';

export default function GuardiaDashboard() {
  const [resumen, setResumen] = useState<ResumenVisitasHoy | null>(null);
  const [proximas, setProximas] = useState<VisitaProxima[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Se ejecutan en paralelo: resumen de tarjetas + próximas visitas
      const [resumenData, proximasData] = await Promise.all([
        guardService.getResumenVisitasHoy(),
        guardService.getProximasVisitas(),
      ]);
      setResumen(resumenData);
      setProximas(Array.isArray(proximasData) ? proximasData : []);
    } catch (err) {
      console.error('Error al cargar el dashboard del guardia:', err);
      setError('No se pudieron cargar los datos. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const badgeClass = (estado: string) =>
    estado === 'Autorizado' ? 'badge-success' : estado === 'Rechazado' ? 'badge-error' : 'badge-warning';

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ marginBottom: 0 }}>Dashboard</h2>
        <button
          className="btn-secondary"
          onClick={cargarDatos}
          style={{ padding: 'var(--space-1) var(--space-3)', fontSize: '0.8rem' }}
          title="Actualizar datos"
        >
          <i className="fas fa-sync-alt"></i> Actualizar
        </button>
      </div>

      {error && (
        <div className="alert" style={{ background: 'rgba(255,82,82,.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon"><i className="fas fa-hourglass-half"></i></div>
          <div className="kpi-label">Visitas Pendientes</div>
          <div className="kpi-value" id="pendientesCount">{loading ? '—' : (resumen?.pendientes ?? 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><i className="fas fa-check-circle"></i></div>
          <div className="kpi-label">Autorizadas Hoy</div>
          <div className="kpi-value" id="autorizadasHoyCount">{loading ? '—' : (resumen?.autorizadas_hoy ?? 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><i className="fas fa-times-circle"></i></div>
          <div className="kpi-label">Rechazadas Hoy</div>
          <div className="kpi-value" id="rechazadasHoyCount">{loading ? '—' : (resumen?.rechazadas_hoy ?? 0)}</div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Próximas visitas</h3>
            <a href="#visitas" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500 }}>Ver todas</a>
          </div>
          <div id="ultimasVisitasContainer">
            {loading ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-2)' }}>Cargando visitas…</p>
            ) : proximas.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-2)' }}>No hay visitas pendientes</p>
            ) : (
              proximas.slice(0, 6).map((v, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{v.nombre_completo}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 'var(--space-2)' }}>{v.departamento || ''}</span>
                  </div>
                  <div>
                    <span className={`badge ${badgeClass(v.estado)}`}>{v.estado}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 'var(--space-2)' }}>{v.hora_estimada || '--:--'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
