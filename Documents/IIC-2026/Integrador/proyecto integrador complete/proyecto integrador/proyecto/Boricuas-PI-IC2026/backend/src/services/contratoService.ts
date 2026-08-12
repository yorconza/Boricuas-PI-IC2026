/**
 * ============================================================================
 * Servicio: contratoService.ts
 * ============================================================================
 * Manejo de contratos:
 * 1. Auto-finalización de contratos por fecha fin.
 * 2. Consulta de datos para reportes con filtros por rango de fechas.
 * ============================================================================
 */
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';

/**
 * Ejecuta sp_Contrato_AutoFinalizar: marca como 'Finalizado' los contratos
 * 'Activo' cuya fecha_fin ya llegó (<= hoy). Devuelve la cantidad finalizada.
 */
export const finalizarContratosVencidos = async (
    pool: sql.ConnectionPool | undefined,
    idUsuarioActual: number | undefined,
): Promise<number> => {
    if (!pool || !idUsuarioActual) return 0;
    try {
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, idUsuarioActual)
            .execute('sp_Contrato_AutoFinalizar');
        return Number(result?.recordset?.[0]?.contratos_finalizados ?? 0);
    } catch (err) {
        console.error('Error al auto-finalizar contratos vencidos:', err);
        return 0;
    }
};

// Definimos una interfaz para el tipo de retorno (evita usar 'any')
export interface ContratoReporte {
  id_contrato: number;
  residente?: string;
  cedula?: string;
  numero_departamento?: string;
  departamento?: string;       // 👈 Requerido por PdfService
  fecha_inicio?: string | Date;
  fecha_fin?: string | Date;
  monto_mensual?: number;
  monto_deposito?: number;
  monto?: number;              // 👈 Requerido por PdfService
  estado?: string;
  [key: string]: unknown;
}

/**
 * Obtiene los contratos filtrados por rango de fechas para el PDF
 */
export const obtenerContratosParaReporte = async (
    fechaInicio?: string,
    fechaFin?: string
): Promise<ContratoReporte[]> => {
    try {
        const pool = await getConnection();
        const result = await pool?.request()
            .input('fecha_inicio', sql.Date, fechaInicio || null)
            .input('fecha_fin', sql.Date, fechaFin || null)
            .execute('sp_ObtenerReporteContratos');

        const rows = (result?.recordset as ContratoReporte[]) ?? [];

        // 2. Mapeamos cada objeto para asegurar que departamento y monto existan
        return rows.map((item) => ({
            ...item,
            departamento: item.departamento ?? item.numero_departamento ?? 'N/A',
            monto: item.monto ?? item.monto_mensual ?? 0,
        }));
    } catch (err) {
        console.error('Error al obtener contratos para el reporte:', err);
        throw new Error('Error al consultar la base de datos para el reporte de contratos', { cause: err });
    }
};