/**
 * ============================================================================
 * Controller: contratoInquilinoController.ts
 * ============================================================================
 *
 * Endpoints del módulo "Mis Contratos" (montado en /api/contratos):
 *
 *   getMisContratos  → GET /api/contratos/mis-contratos  (Inquilino)
 *   getPagosContrato → GET /api/contratos/:id/pagos      (Inquilino)
 *
 * Seguridad:
 *   - id_usuario SIEMPRE se toma del JWT (req.user.id_usuario).
 *   - Un inquilino solo ve SUS contratos y SOLO los pagos de SUS contratos
 *     (se valida la pertenencia antes de devolver el historial).
 *
 * Nota sobre sp_Contrato_Listar:
 *   Se confirmó en la BD que sp_Contrato_Listar SOLO permite el rol
 *   Administrador: para un inquilino lanza RAISERROR 'No autorizado para ver
 *   contratos.' (número 50000). Por eso aquí NO se intenta el SP (sería un
 *   error esperado y una consulta de más): se usa directamente una consulta
 *   filtrada por id_usuario del JWT, con los mismos campos que devuelve el SP
 *   (id_contrato, id_usuario, residente, id_departamento, departamento,
 *   fecha_inicio, fecha_fin, monto_mensual, monto_deposito, estado).
 *
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import sql from 'mssql';
import { getConnection } from '../config/confDB.js';

/** Reutiliza la pool (conexión) donde el middleware ejecutó SET CONTEXT_INFO. */
const obtenerPool = async (req: Request) => req.pool ?? await getConnection();

/** Extrae el id del usuario autenticado desde el JWT (req.user). */
const obtenerIdActual = (req: Request, res: Response): number | null => {
    const idActual = req.user?.id_usuario;
    if (!idActual) {
        res.status(400).json({ message: 'id_usuario_actual es obligatorio' });
        return null;
    }
    return idActual;
};

/** Consulta directa equivalente a sp_Contrato_Listar (sin filtros de fecha). */
const QUERY_MIS_CONTRATOS = `
    SELECT c.id_contrato,
           c.id_usuario,
           ISNULL(u.nombre_completo, 'Sin asignar') AS residente,
           c.id_departamento,
           ISNULL(d.numero, '') AS departamento,
           c.fecha_inicio,
           c.fecha_fin,
           c.monto_mensual,
           c.monto_deposito,
           c.estado
    FROM Contrato c
    JOIN Usuario u ON u.id_usuario = c.id_usuario
    LEFT JOIN Departamento d ON d.id_departamento = c.id_departamento
    WHERE c.id_usuario = @id_usuario
    ORDER BY c.fecha_inicio DESC`;

/**
 * 1. GET /api/contratos/mis-contratos
 * Lista TODOS los contratos del inquilino autenticado (Activo y Finalizado;
 * la UI decide si mostrar el botón "Pagar" según el estado).
 */
export const getMisContratos = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const pool = await obtenerPool(req);

        // sp_Contrato_Listar solo permite Administrador (RAISERROR 'No
        // autorizado para ver contratos.' para inquilinos), así que se consulta
        // directamente la tabla filtrada por el id del JWT. La ruta ya está
        // protegida con authorizeRole('Inquilino'), así que nunca se expone un
        // contrato ajeno.
        const result = await pool.request()
            .input('id_usuario', sql.Int, idActual)
            .query(QUERY_MIS_CONTRATOS);

        return res.status(200).json(result?.recordset ?? []);
    } catch (error: unknown) {
        console.error('Error en getMisContratos:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 2. GET /api/contratos/:id/pagos
 * Historial de pagos de UN contrato del inquilino autenticado.
 * Primero valida que el contrato le pertenezca (403 si no), luego devuelve
 * los pagos (solo lectura de la tabla Pago, filtrados por id_contrato).
 */
export const getPagosContrato = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const idContrato = Number(req.params.id);
        if (!Number.isFinite(idContrato) || idContrato <= 0) {
            return res.status(400).json({ message: 'id_contrato inválido' });
        }

        const pool = await obtenerPool(req);

        // 1. Validar pertenencia del contrato.
        const pertenece = await pool.request()
            .input('id_contrato', sql.Int, idContrato)
            .input('id_usuario', sql.Int, idActual)
            .query('SELECT 1 AS existe FROM Contrato WHERE id_contrato = @id_contrato AND id_usuario = @id_usuario');

        if ((pertenece?.recordset?.length ?? 0) === 0) {
            return res.status(404).json({ message: 'Contrato no encontrado para este usuario.' });
        }

        // 2. Historial de pagos del contrato (estado siempre 'Pagado' en la BD).
        const result = await pool.request()
            .input('id_contrato', sql.Int, idContrato)
            .query(`
                SELECT p.id_pago,
                       ISNULL(p.residente, 'Sin Cédula') AS residente,
                       ISNULL(p.concepto, 'Mensualidad') AS concepto,
                       p.monto,
                       p.fecha_pago,
                       p.tipo_pago AS metodo_pago,
                       p.estado_pago AS estado
                FROM Pago p
                WHERE p.id_contrato = @id_contrato
                ORDER BY p.fecha_pago DESC`);

        return res.status(200).json(result?.recordset ?? []);
    } catch (error: unknown) {
        console.error('Error en getPagosContrato:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error interno del servidor' });
    }
};
