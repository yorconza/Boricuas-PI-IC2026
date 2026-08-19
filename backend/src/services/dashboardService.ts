/**
 * ============================================================================
 * Archivo: dashboardService.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Service que consulta sp_Dashboard_ObtenerDatos (4 recordsets en una sola
 * ejecución) y devuelve el resumen del Dashboard del Administrador:
 *
 *   [0] KPIs: reservas_hoy, visitas_registradas, contratos_activos,
 *             areas_ocupadas, ingresos_del_dia.
 *   [1] Próximas reservas (TOP 5).
 *   [2] Alertas (contratos a vencer, pagos pendientes, áreas).
 *   [3] Actividad reciente de Bitácora (TOP 5).
 *
 * El SP valida que el rol sea Administrador; si falla, devuelve dashboard vacío.
 *
 * Se comunica con:
 *   - SQL Server vía confDB.getConnection().
 *   - Controller: dashboardController.ts.
 *   - Frontend: AdminDashboard.tsx → DataContext.
 *
 * ============================================================================
 */
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';

interface KPI {
  reservas_hoy: number;
  visitas_registradas: number;
  contratos_activos: number;
  areas_ocupadas: number;
  ingresos_del_dia: number;
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
  id_bitacora: number;
  descripcion: string;
  tabla_afectada: string;
  fecha_evento: string;
  minutos_transcurridos: number;
  color_indicador: string;
}

interface DashboardData {
  kpis: KPI;
  proximasReservas: Reserva[];
  alertas: Alerta[];
  actividadReciente: Actividad[];
}

export const dashboardService = {
  // id_usuario_actual: id del administrador autenticado (viene del JWT / middleware de auth).
  // El SP valida internamente que el rol sea 'Administrador' (RAISERROR si no).
  //
  // sp_Dashboard_ObtenerDatos devuelve 4 recordsets en una sola ejecución:
  //   [0] KPIs                  → 1 fila (reservas_hoy, visitas_registradas, ...)
  //   [1] Próximas reservas     → TOP 5
  //   [2] Alertas administrativas (contratos a vencer / pagos pendientes / áreas)
  //   [3] Actividad reciente    → TOP 5 de Bitacora
  async obtenerResumen(id_usuario_actual: number): Promise<DashboardData> {
    const pool = await getConnection();

    const kpisVacios: KPI = {
      reservas_hoy: 0,
      visitas_registradas: 0,
      contratos_activos: 0,
      areas_ocupadas: 0,
      ingresos_del_dia: 0
    };

    try {
      const result = await pool.request()
        .input('id_usuario_actual', sql.Int, id_usuario_actual)
        .execute('sp_Dashboard_ObtenerDatos');

      // recordsets: [KPIs, próximas reservas, alertas, actividad reciente]
      const sets = (result.recordsets as unknown as unknown[][]) ?? [];
      const kpis = (sets[0]?.[0] as KPI | undefined) ?? kpisVacios;
      const proximasReservas = (sets[1] ?? []) as Reserva[];
      const alertas = (sets[2] ?? []) as Alerta[];
      const actividadReciente = (sets[3] ?? []) as Actividad[];

      return { kpis, proximasReservas, alertas, actividadReciente };
    } catch (err: unknown) {
      // Si el SP falla (p. ej. no está creado aún o el rol no es administrador),
      // se devuelve el dashboard vacío en lugar de tumbar el endpoint.
      console.error('❌ ERROR sp_Dashboard_ObtenerDatos:', err instanceof Error ? err.message : err);
      return { kpis: kpisVacios, proximasReservas: [], alertas: [], actividadReciente: [] };
    }
  }
};
