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
  area: string;
  residente: string;
}

interface Alerta {
  mensaje: string;
  prioridad: 'Alta' | 'Media';
}

interface Actividad {
  descripcion: string;
  fecha_evento: string;
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
  // Todos los SPs de este módulo lo requieren para validar rol y setear CONTEXT_INFO.
  async obtenerResumen(id_usuario_actual: number): Promise<DashboardData> {
    const pool = await getConnection();

    let kpis: KPI = {
      reservas_hoy: 0,
      visitas_registradas: 0,
      contratos_activos: 0,
      areas_ocupadas: 0,
      ingresos_del_dia: 0
    };
    let proximasReservas: Reserva[] = [];
    let alertas: Alerta[] = [];
    let actividadReciente: Actividad[] = [];

    // 1. KPIs
    try {
      const kpisResult = await pool.request()
        .input('id_usuario_actual', sql.Int, id_usuario_actual)
        .execute<KPI>('sp_Dashboard_ObtenerMetricas');
      if (kpisResult.recordset[0]) kpis = kpisResult.recordset[0];
    } catch (err: unknown) {
      console.error('❌ ERROR KPIS:', err instanceof Error ? err.message : err);
    }

    // 2. Próximas reservas
    try {
      const reservasResult = await pool.request()
        .input('id_usuario_actual', sql.Int, id_usuario_actual)
        .execute<Reserva>('sp_Dashboard_ListarProximasReservas');
      proximasReservas = reservasResult.recordset || [];
    } catch (err: unknown) {
      console.error('❌ ERROR RESERVAS:', err instanceof Error ? err.message : err);
    }

    // 3. Alertas administrativas
    try {
      const alertasResult = await pool.request()
        .input('id_usuario_actual', sql.Int, id_usuario_actual)
        .execute<Alerta>('sp_Dashboard_ListarAlertas');
      alertas = alertasResult.recordset || [];
    } catch (err: unknown) {
      console.error('❌ ERROR ALERTAS:', err instanceof Error ? err.message : err);
    }

    // 4. Actividad reciente
    try {
      const actividadResult = await pool.request()
        .input('id_usuario_actual', sql.Int, id_usuario_actual)
        .execute<Actividad>('sp_Dashboard_ListarActividadReciente');
      actividadReciente = actividadResult.recordset || [];
    } catch (err: unknown) {
      console.error('❌ ERROR ACTIVIDAD:', err instanceof Error ? err.message : err);
    }

    return { kpis, proximasReservas, alertas, actividadReciente };
  }
};