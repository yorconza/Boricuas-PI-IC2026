const API_URL = 'http://localhost:4000/api/pagos';

export interface Pago {
  id_pago?: number;
  residente: string;
  concepto: string;
  monto: number;
  fecha_pago?: string;
  metodo_pago?: string;
  metodo?: string;
  estado?: string;
  id_reserva?: number | null;
}

export interface MetricasPagos {
  total_recaudado: number;
  pendientes: number;
  pagados_hoy: number;
}

export interface NuevoPagoPayload {
  residente?: string;
  concepto?: string;
  monto: number;
  metodo: string;
  estado_pago?: string;
  id_reserva?: number | null;
}

export const pagosService = {
  // 1. Obtener el resumen general / métricas de pagos
  obtenerResumenPagos: async (idUsuarioActual: number = 1): Promise<MetricasPagos> => {
    try {
      const response = await fetch(`${API_URL}/metricas?id_usuario_actual=${idUsuarioActual}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al obtener el resumen de pagos');
      }

      return await response.json() as MetricasPagos;
    } catch (error: unknown) {
      console.error('Error en obtenerResumenPagos:', error);
      throw error;
    }
  },

  // 2. Listar todos los pagos (para la tabla principal)
  listarPagos: async (): Promise<Pago[]> => {
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al listar los pagos');
      }

      return await response.json() as Pago[];
    } catch (error: unknown) {
      console.error('Error en listarPagos:', error);
      throw error;
    }
  },

  // 3. Registrar un nuevo pago
  registrarPago: async (datosPago: NuevoPagoPayload): Promise<{ message?: string; id_pago?: number }> => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosPago),
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(errorData?.message || 'Error al registrar el pago');
      }

      return await response.json() as { message?: string; id_pago?: number };
    } catch (error: unknown) {
      console.error('Error en registrarPago:', error);
      throw error;
    }
  },
};