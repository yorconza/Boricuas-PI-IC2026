/**
 * ============================================================================
 * Controller: pagosController.ts
 * ============================================================================
 *
 * Endpoints del módulo de Pagos (montado en /api/pagos):
 *
 *   getPagos              → GET  /api/pagos          (Administrador)
 *   getMetricasPagos      → GET  /api/pagos/metricas (Administrador)
 *   createPago            → POST /api/pagos/manual   (Administrador)
 *   registrarPagoContrato → POST /api/pagos/contrato (Inquilino)
 *
 * Seguridad:
 *   - Todas las rutas pasan por la cadena estándar (JWT → 2FA → sesión +
 *     authorizeRole en la ruta). El id_usuario_actual SIEMPRE se toma del
 *     token (req.user.id_usuario), nunca del cliente.
 *   - El pago de mensualidad (sp_RegistrarPagoContrato) solo lo puede hacer
 *     el inquilino del contrato (el SP valida la pertenencia).
 *
 * Nota sobre el listado (GET /api/pagos):
 *   El spec del módulo pedía consumir `sp_ListarPagos` o la vista
 *   `VW_AdministracionPagos`, pero esa vista NO incluye `id_contrato`, por lo
 *   que no se podría distinguir un pago de "Contrato" de uno "Administrativo"
 *   (columna `categoria` requerida por la vista unificada). En lugar de
 *   modificar la BD (regla del proyecto: no tocar SPs/vistas), se consulta
 *   directamente la tabla `Pago` con los MISMOS filtros que aplica el SP
 *   (busqueda, estado, solo_hoy, fecha_inicio, fecha_fin) más la categoría
 *   calculada (Reserva / Contrato / Administrativo) y paginación OFFSET-FETCH
 *   (mismo formato de respuesta que /api/bitacora).
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

/** Límites de paginación seguros (mismos que el módulo de Bitácora). */
const LIMITE_MAXIMO = 200;
const LIMITE_DEFECTO = 50;

/**
 * Normaliza el método de pago enviado por el frontend (inquilino) a los
 * valores permitidos por el CHECK de la tabla Pago
 * ('Efectivo' | 'Tarjeta' | 'Transferencia' | 'Otro').
 * Acepta los códigos cortos de la UI ('tarjeta' | 'efectivo' | 'sinpe') y las
 * etiquetas legibles ('Sinpe Móvil', 'Tarjeta de crédito/débito', ...).
 */
export const normalizarTipoPago = (tipo: unknown): string => {
    const mapa: Record<string, string> = {
        tarjeta: 'Tarjeta',
        'tarjeta de crédito/débito': 'Tarjeta',
        'tarjeta de credito/debito': 'Tarjeta',
        efectivo: 'Efectivo',
        sinpe: 'Transferencia',
        'sinpe móvil': 'Transferencia',
        'sinpe movil': 'Transferencia',
        transferencia: 'Transferencia',
        otro: 'Otro',
    };
    const valor = String(tipo ?? '').trim().toLowerCase();
    return mapa[valor] ?? 'Otro';
};

/** Filtros comunes del listado de pagos (fragmentos SQL parametrizados). */
const construirWherePagos = (): string => `
    WHERE 1 = 1
      AND (@busqueda IS NULL
           OR LOWER(ISNULL(p.residente, '')) LIKE '%' + LOWER(@busqueda) + '%'
           OR LOWER(ISNULL(p.concepto, '')) LIKE '%' + LOWER(@busqueda) + '%')
      AND (@estado IS NULL OR p.estado_pago = @estado)
      AND (@solo_hoy = 0 OR CAST(p.fecha_pago AS DATE) = CAST(SYSDATETIME() AS DATE))
      AND (@fecha_inicio IS NULL OR p.fecha_pago >= @fecha_inicio)
      AND (@fecha_fin IS NULL OR p.fecha_pago < DATEADD(DAY, 1, @fecha_fin))`;

/** Selección equivalente a VW_AdministracionPagos + id_contrato + categoria. */
const SELECT_PAGOS = `
    SELECT p.id_pago,
           ISNULL(p.residente, 'Sin Cédula') AS residente,
           ISNULL(p.concepto, 'Pago Administrativo') AS concepto,
           p.monto,
           p.fecha_pago,
           p.tipo_pago AS metodo_pago,
           p.estado_pago AS estado,
           p.id_reserva,
           p.id_contrato,
           CASE
               WHEN p.id_reserva IS NOT NULL THEN 'Reserva'
               WHEN p.id_contrato IS NOT NULL THEN 'Contrato'
               ELSE 'Administrativo'
           END AS categoria
    FROM Pago p`;

/**
 * 1. GET /api/pagos
 * Lista TODOS los pagos (reservas + contratos + administrativos) con filtros,
 * ordenados por fecha DESC (más reciente primero) y paginados.
 *
 * Query params:
 *   busqueda      → residente o concepto (LIKE)
 *   estado        → 'Pagado' | ... (filtro por estado_pago)
 *   solo_hoy      → 'true' | '1' para filtrar solo pagos de hoy
 *   fecha_inicio  → YYYY-MM-DD (inclusive)
 *   fecha_fin     → YYYY-MM-DD (inclusive; se expande a fin de día en SQL)
 *   pageNumber    → página (≥ 1, def. 1)
 *   pageSize      → filas por página (1–200, def. 50)
 *
 * Respuesta: { pagina, limite, totalRegistros, totalPaginas, datos }
 */
export const getPagos = async (req: Request, res: Response) => {
    try {
        const { busqueda, estado, solo_hoy, fecha_inicio, fecha_fin, pageNumber, pageSize } = req.query;

        // Paginación segura (mismo patrón que Bitácora/Visitas).
        const pagina = Math.max(1, Math.floor(Number(pageNumber)) || 1);
        const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Math.floor(Number(pageSize)) || LIMITE_DEFECTO));
        const offset = (pagina - 1) * limite;

        const pool = await obtenerPool(req);
        const where = construirWherePagos();

        const params = (request: sql.Request) => request
            .input('busqueda', sql.VarChar(150), busqueda ? String(busqueda) : null)
            .input('estado', sql.VarChar(20), estado ? String(estado) : null)
            .input('solo_hoy', sql.Bit, solo_hoy === 'true' || solo_hoy === '1' ? 1 : 0)
            .input('fecha_inicio', sql.Date, fecha_inicio ? String(fecha_inicio) : null)
            .input('fecha_fin', sql.Date, fecha_fin ? String(fecha_fin) : null);

        // Total de registros con los mismos filtros (para la paginación).
        const conteo = await params(pool.request())
            .query(`SELECT COUNT(*) AS total FROM Pago p ${where}`);

        const totalRegistros = Number(conteo?.recordset?.[0]?.total ?? 0);
        const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limite));

        const resultado = await params(pool.request())
            .input('offset', sql.Int, offset)
            .input('limite', sql.Int, limite)
            .query(`${SELECT_PAGOS} ${where}
                    ORDER BY p.fecha_pago DESC
                    OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY`);

        return res.status(200).json({
            pagina,
            limite,
            totalRegistros,
            totalPaginas,
            datos: resultado?.recordset ?? [],
        });
    } catch (error: unknown) {
        console.error('Error en getPagos:', error);
        const err = error as Error;
        return res.status(500).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 2. GET /api/pagos/metricas
 * Tarjetas resumen del panel de administración (sp_ObtenerMetricasPagos):
 *   { total_recaudado, pendientes, pagados_hoy }
 * El SP no usa el parámetro, pero se le pasa el id del JWT por consistencia.
 */
export const getMetricasPagos = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const pool = await obtenerPool(req);
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .execute('sp_ObtenerMetricasPagos');

        return res.status(200).json(result?.recordset?.[0] || {
            total_recaudado: 0,
            pendientes: 0,
            pagados_hoy: 0,
        });
    } catch (error: unknown) {
        console.error('Error en getMetricasPagos:', error);
        const err = error as Error;
        return res.status(500).json({ message: err.message || 'Error interno del servidor' });
    }
};

/**
 * 3. POST /api/pagos/manual  (Administrador)
 * Registra un pago ADMINISTRATIVO (sin reserva ni contrato) con
 * sp_RegistrarPago. Body: { residente, concepto, monto, tipo_pago, estado_pago? }
 */
export const createPago = async (req: Request, res: Response) => {
    try {
        const { residente, concepto, monto, tipo_pago, metodo, estado_pago } = req.body ?? {};

        // Aceptamos tipo_pago o metodo dependiendo de cómo lo envíe el frontend.
        const metodoPagoFinal = tipo_pago || metodo;
        const montoNum = Number(monto);

        if (monto === undefined || monto === null || !Number.isFinite(montoNum) || montoNum <= 0) {
            return res.status(400).json({ message: 'El campo monto es obligatorio y debe ser mayor a cero.' });
        }

        if (!metodoPagoFinal || String(metodoPagoFinal).trim() === '') {
            return res.status(400).json({ message: 'El tipo/método de pago es obligatorio.' });
        }

        if (!residente || !concepto) {
            return res.status(400).json({
                message: 'Debe proporcionar el residente y el concepto para el pago administrativo.',
            });
        }

        const pool = await obtenerPool(req);
        const result = await pool.request()
            .input('residente', sql.VarChar(150), String(residente))
            .input('concepto', sql.VarChar(150), String(concepto))
            .input('monto', sql.Decimal(10, 2), montoNum)
            .input('tipo_pago', sql.VarChar(50), String(metodoPagoFinal))
            .input('estado_pago', sql.VarChar(20), estado_pago ? String(estado_pago) : 'Pagado')
            .input('id_reserva', sql.Int, null)
            .execute('sp_RegistrarPago');

        const nuevoIdPago = result?.recordset?.[0]?.id_pago;

        return res.status(201).json({
            message: 'Pago registrado exitosamente',
            id_pago: nuevoIdPago ?? null,
        });
    } catch (error: unknown) {
        console.error('Error en createPago:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error al registrar el pago' });
    }
};

/**
 * 4. POST /api/pagos/contrato  (Inquilino)
 * Registra el pago de la mensualidad de un contrato con sp_RegistrarPagoContrato.
 * Body: { id_contrato, monto, tipo_pago, concepto? }
 *   - id_usuario_actual se toma del JWT (el SP valida que el inquilino sea el
 *     dueño del contrato y que el contrato esté 'Activo').
 *   - El monto debe coincidir con monto_mensual (tolerancia 0.01) — lo valida
 *     el SP; si no coincide, su RAISERROR llega como 400.
 * Después del éxito se notifica a TODOS los administradores (best-effort): si
 * la notificación falla, el pago ya quedó registrado y no se revierte.
 */
export const registrarPagoContrato = async (req: Request, res: Response) => {
    try {
        const idActual = obtenerIdActual(req, res);
        if (idActual === null) return;

        const { id_contrato, monto, tipo_pago, concepto } = req.body ?? {};

        const idContratoNum = Number(id_contrato);
        const montoNum = Number(monto);

        if (!Number.isFinite(idContratoNum) || idContratoNum <= 0) {
            return res.status(400).json({ message: 'id_contrato es obligatorio' });
        }
        if (!Number.isFinite(montoNum) || montoNum <= 0) {
            return res.status(400).json({ message: 'El monto es obligatorio y debe ser mayor a cero.' });
        }
        if (!tipo_pago || String(tipo_pago).trim() === '') {
            return res.status(400).json({ message: 'El método de pago es obligatorio.' });
        }

        const pool = await obtenerPool(req);
        await pool.request()
            .input('id_usuario_actual', sql.Int, idActual)
            .input('id_contrato', sql.Int, idContratoNum)
            .input('monto', sql.Decimal(10, 2), montoNum)
            .input('tipo_pago', sql.VarChar(20), normalizarTipoPago(tipo_pago))
            .input('concepto', sql.VarChar(150), concepto ? String(concepto) : 'Mensualidad')
            .execute('sp_RegistrarPagoContrato');

        // Notificación a los administradores (fuera del flujo crítico: si falla,
        // el pago ya está registrado — solo se registra el error en consola).
        await notificarPagoContrato(pool, idContratoNum, montoNum).catch((error) => {
            console.error('Error al notificar el pago de contrato a los administradores:', error);
        });

        return res.status(201).json({
            message: 'Pago de mensualidad registrado exitosamente',
            id_contrato: idContratoNum,
        });
    } catch (error: unknown) {
        console.error('Error en registrarPagoContrato:', error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || 'Error al registrar el pago de la mensualidad' });
    }
};

/**
 * Crea la notificación 'PAGO_CONTRATO' para TODOS los administradores activos
 * (sp_CrearNotificacion). El mensaje incluye el nombre del inquilino, el
 * departamento del contrato y el monto pagado. Best-effort: nunca revierte el
 * pago ya registrado.
 */
const notificarPagoContrato = async (
    pool: sql.ConnectionPool,
    idContrato: number,
    monto: number,
): Promise<void> => {
    // 1. Datos del contrato para el mensaje (residente + departamento).
    const contrato = await pool.request()
        .input('id_contrato', sql.Int, idContrato)
        .query(`
            SELECT c.id_contrato,
                   ISNULL(u.nombre_completo, 'Inquilino') AS residente,
                   ISNULL(d.numero, '') AS departamento
            FROM Contrato c
            JOIN Usuario u ON u.id_usuario = c.id_usuario
            LEFT JOIN Departamento d ON d.id_departamento = c.id_departamento
            WHERE c.id_contrato = @id_contrato`);

    const fila = contrato?.recordset?.[0] as
        { residente?: string; departamento?: string } | undefined;

    const residente = fila?.residente ?? 'Inquilino';
    const departamento = fila?.departamento ?? '';
    // Importante: NO usar el símbolo '₡' (U+20A1) en el mensaje: la columna
    // @mensaje del SP es VARCHAR y ese carácter no existe en su página de
    // códigos, así que SQL Server lo guardaría como '?'. Se escribe 'colones'.
    const montoTexto = monto.toLocaleString('en-US');
    const mensaje = `El inquilino ${residente} realizó el pago de la mensualidad del contrato ${departamento} por ${montoTexto} colones.`;

    // 2. Destinatarios: usuarios con rol 'Administrador' y activos.
    const admins = await pool.request()
        .query(`
            SELECT u.id_usuario
            FROM Usuario u
            JOIN Rol r ON r.id_rol = u.id_rol
            WHERE r.nombre_rol = 'Administrador' AND u.activo = 1`);

    const destinatarios: number[] = (admins?.recordset ?? [])
        .map((f) => Number(f.id_usuario))
        .filter((id) => Number.isFinite(id));

    // 3. Insertar una notificación por cada administrador.
    for (const idAdmin of destinatarios) {
        await pool.request()
            .input('id_usuario', sql.Int, idAdmin)
            .input('tipo', sql.VarChar(30), 'PAGO_CONTRATO')
            .input('mensaje', sql.VarChar(500), mensaje)
            .input('id_referencia', sql.Int, idContrato)
            .execute('sp_CrearNotificacion');
    }
};
