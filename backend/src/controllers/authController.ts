/**
 * ============================================================================
 * Controlador: authController.ts
 * ============================================================================
 * register        → POST /api/auth/register (público)
 * login           → POST /api/auth/login    (público) — emite JWT temporal
 * send2FACode     → POST /api/auth/2fa/send    (protegido)
 * verify2FACode   → POST /api/auth/2fa/verify  (protegido)
 * logout          → POST /api/auth/logout   (protegido)
 * getMe           → GET  /api/auth/me       (protegido)
 * solicitarRecuperacion  → POST /api/auth/recuperar-solicitar   (público)
 * restablecerContrasena  → POST /api/auth/recuperar-restablecer (público)
 *
 * Recuperación de contraseña (público, sin JWT ni 2FA):
 *   1. /recuperar-solicitar busca el correo en `correo` Y `correo_contacto`
 *      (dualidad: Inquilino → correo real; Admin/Guarda → correo_contacto).
 *      Si existe un usuario activo, genera un token único (1 hora), lo guarda
 *      en TokenRecuperacion y envía el enlace al correo DONDE se encontró la
 *      coincidencia. La respuesta es SIEMPRE genérica (anti-enumeración).
 *   2. /recuperar-restablecer valida el token (no usado, no expirado — la
 *      expiración se compara EN SQL Server con SYSDATETIME, igual que el 2FA),
 *      hashea la nueva contraseña con bcrypt (10 rondas) y la actualiza.
 *
 * Reutiliza del módulo 2FA: mailService (Gmail SMTP), bcrypt, el patrón de
 * transacción y el rate limit en memoria (Map por correo+IP).
 *
 * Flujo 2FA:
 *   1. login valida credenciales y devuelve un JWT TEMPORAL con el flag
 *      '2faVerified': false (además de correo/correo_contacto para decidir
 *      el destino del código según el rol).
 *   2. El frontend llama a POST /api/auth/2fa/send → se genera un código de
 *      6 dígitos, se inserta con sp_GenerarCodigo2FA (expira en 5 min) y se
 *      envía por correo real (Gmail SMTP con App Password, ver mailService.ts).
 *      Destino: Inquilino → correo principal; Administrador/Guarda → correo_contacto.
 *   3. POST /api/auth/2fa/verify valida con sp_VerificarCodigo2FA. Si es
 *      válido, emite el JWT DEFINITIVO con '2faVerified': true (el frontend
 *      reemplaza el token temporal). Se permiten 3 intentos por código; el
 *      contador se reinicia al reenviar.
 *
 *   REGLA DE REENVÍO: mientras exista un código vigente (no usado y sin
 *   expirar) y al usuario le queden intentos, /2fa/send NO genera otro
 *   código (responde "ya_enviado" con el tiempo restante). Solo se reenvía
 *   tras agotar los 3 intentos y presionar el botón "Reenviar código" (o si
 *   el código expiró / el envío inicial falló).
 *
 * Conexión a BD:
 *   En las rutas protegidas, el middleware validateSessionAndSetContext ya
 *   obtiene la conexión y ejecuta SET CONTEXT_INFO sobre ella. Por eso estos
 *   controladores reutilizan `req.pool` (la MISMA conexión) y solo recurren a
 *   getConnection() como respaldo en rutas públicas (register/login).
 * ============================================================================
 */
import { type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import dotenv from 'dotenv';
import { randomInt, randomBytes } from 'node:crypto';
import { getConnection } from '../config/confDB.js';
import { enviarCodigo2FA, enviarCorreoRecuperacion } from '../services/mailService.js';

// Carga las variables de entorno ANTES de leer JWT_SECRET (independiente del orden de imports)
dotenv.config();

// ---- Configuración del módulo ----
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = '8h';    // Expiración del JWT
const SALT_ROUNDS = 10;         // Rondas de bcrypt para el hash de la contraseña
// URL del frontend para construir el enlace de recuperación (misma que usa server.ts en CORS)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Dominios de correo públicos permitidos (sp_RegistrarInquilino)
const DOMINIOS_PUBLICOS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'];

/** Fila devuelta por sp_LoginUsuario */
interface LoginUserRow {
    id_usuario: number;
    nombre_completo: string;
    correo: string;
    correo_contacto: string | null;
    cedula: string | null;
    id_rol: number;
    nombre_rol: string;
    contrasena_hash: string | Buffer;
}

/**
 * POST /api/auth/register
 * Registra un inquilino (público).
 * Body esperado: { nombreCompleto, correo, contrasena, cedula, telefono? }
 */
export const register = async (req: Request, res: Response) => {
    try {
        const {
            nombreCompleto,
            nombre_completo,   // alias para compatibilidad con formularios antiguos
            correo,
            contrasena,
            telefono,
            cedula,
        } = req.body;

        const nombre = (nombreCompleto ?? nombre_completo ?? '').trim();

        // 1. Validar campos obligatorios. La cédula es obligatoria: el admin la
        //    usa para asignarle el contrato al inquilino (sp_Contrato_Insertar la
        //    busca por cédula) y sin ella el inquilino no puede recibir contrato.
        if (!nombre || !correo || !contrasena || !cedula) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        // 2. Validar dominio público del correo
        const dominio = String(correo).split('@')[1]?.toLowerCase();
        if (!dominio || !DOMINIOS_PUBLICOS.includes(dominio)) {
            return res.status(400).json({
                message: 'Solo se permiten correos con dominio público (gmail.com, hotmail.com, outlook.com, yahoo.com)',
            });
        }

        // 2b. Misma política de contraseña que la recuperación (REGEX_CONTRASENA):
        // mín 8 con mayúscula, minúscula, número y símbolo (@$!%*?&).
        if (typeof contrasena !== 'string' || !REGEX_CONTRASENA.test(contrasena)) {
            return res.status(400).json({
                message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo (@$!%*?&).',
            });
        }

        // 3. Hashear la contraseña con bcrypt (10 rondas)
        const hash = await bcrypt.hash(contrasena, SALT_ROUNDS);

        // 4. Llamar al SP de registro de inquilinos
        const pool = await getConnection();
        // NOTA: sp_RegistrarInquilino tiene valor por defecto (NULL) para
        // @foto_perfil, por lo que NO se envía ese parámetro.
        const result = await pool.request()
            .input('nombre_completo', sql.VarChar(150), nombre)
            .input('correo', sql.VarChar(150), String(correo).toLowerCase())
            .input('contrasena_hash', sql.VarChar(256), hash)
            .input('telefono', sql.VarChar(20), telefono ?? null)
            .input('cedula', sql.VarChar(30), cedula ?? null)
            .execute('sp_RegistrarInquilino');

        const nuevoId = result?.recordset?.[0]?.id_usuario;

        return res.status(201).json({
            message: 'Inquilino registrado exitosamente',
            id_usuario: nuevoId ?? null,
        });
    } catch (error: unknown) {
        console.error('Error al registrar inquilino:', error);
        const err = error as Error;
        // Los errores lanzados con RAISERROR dentro de un SP traen la propiedad
        // procName; solo esos mensajes se exponen (son validaciones del negocio,
        // ej: "el correo ya está registrado"). Cualquier otro error es interno.
        const esErrorDeSP = typeof (error as { procName?: unknown }).procName === 'string';
        return res.status(400).json({
            message: esErrorDeSP
                ? err.message
                : 'No se pudo completar el registro. Inténtelo nuevamente.',
        });
    }
};

/**
 * POST /api/auth/login
 * Inicio de sesión (público).
 * Body esperado: { correo, contrasena }
 * Respuesta:     { token, 2faRequired: true, usuario }
 * El token es TEMPORAL (2faVerified: false): solo sirve para los endpoints
 * de 2FA. El token definitivo se emite en /api/auth/2fa/verify.
 */
export const login = async (req: Request, res: Response) => {
    try {
        const { correo, contrasena } = req.body;

        // 1. Validar campos obligatorios
        if (!correo || !contrasena) {
            return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
        }

        if (!JWT_SECRET) {
            console.error('JWT_SECRET no definido en .env');
            return res.status(500).json({ message: 'Error de configuración del servidor' });
        }

        const pool = await getConnection();

        // 2. Obtener el usuario y su hash desde la BD
        const result = await pool.request()
            .input('correo', sql.VarChar(150), String(correo).toLowerCase())
            .execute('sp_LoginUsuario');

        const row = result.recordset?.[0] as LoginUserRow | undefined;
        if (!row) {
            // No revelamos si el correo existe o no (misma respuesta para ambos casos)
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // 3. Comparar la contraseña con bcrypt.
        //    El hash puede venir como VARCHAR o como VARBINARY (Buffer): se normaliza a string.
        const hashAlmacenado = typeof row.contrasena_hash === 'string'
            ? row.contrasena_hash
            : Buffer.from(row.contrasena_hash).toString('utf-8');

        const esCorrecta = await bcrypt.compare(contrasena, hashAlmacenado);
        if (!esCorrecta) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // 4. Crear una sesión activa en la tabla Sesion.
        //    sp_CrearSesion NO devuelve recordset: expone @id_sesion INT OUTPUT,
        //    por eso se declara con .output() y se lee desde result.output.
        const sessionRequest = pool.request()
            .input('id_usuario', sql.Int, Number(row.id_usuario))
            .output('id_sesion', sql.Int);

        const sesionResult = await sessionRequest.execute('sp_CrearSesion');

        const id_sesion = sesionResult.output?.id_sesion;
        if (!id_sesion) {
            return res.status(500).json({ message: 'No se pudo crear la sesión' });
        }

        // 5. Generar el JWT TEMPORAL con 2faVerified = false.
        //    Se incluyen correo y correo_contacto para que /2fa/send decida el
        //    destino del código sin consultar la BD. El token definitivo (con
        //    2faVerified = true) solo se emite tras verificar el código.
        const payload: Record<string, unknown> = {
            id_usuario: Number(row.id_usuario),
            id_rol: Number(row.id_rol),
            nombre_rol: String(row.nombre_rol),
            // Nombre completo del usuario: lo usa el correo 2FA en el saludo
            // ("Hola, <nombre>") y getMe. Antes el saludo mostraba el rol.
            nombre_completo: String(row.nombre_completo),
            id_sesion: Number(id_sesion),
            correo: String(row.correo),
            '2faVerified': false,
        };
        if (row.correo_contacto) {
            payload['correo_contacto'] = row.correo_contacto;
        }
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // 6. Responder token temporal + datos del usuario.
        //    El frontend redirige a la verificación 2FA.
        return res.status(200).json({
            token,
            '2faRequired': true,
            usuario: {
                id: Number(row.id_usuario),
                nombre: row.nombre_completo,
                correo: row.correo,
                cedula: row.cedula,
                rol: row.nombre_rol,
            },
        });
    } catch (error: unknown) {
        console.error('Error en login:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ----------------------------------------------------------------------------
// 2FA (Two-Factor Authentication)
// ----------------------------------------------------------------------------
// El código de 6 dígitos expira a los 5 minutos. Se permiten hasta
// INTENTOS_MAXIMOS intentos fallidos por código; el contador se reinicia al
// reenviar (POST /api/auth/2fa/send).
const CODIGO_EXPIRA_MIN = 5;      // Minutos de validez del código
const INTENTOS_MAXIMOS = 3;       // Intentos fallidos permitidos por código

/** Estado del contador de intentos fallidos (en memoria, por usuario). */
interface EstadoIntentos2FA {
    intentos: number;
    expira: number; // epoch ms — el contador se descarta tras 5 min
}

const intentosFallidos2FA = new Map<number, EstadoIntentos2FA>();

/** Registra un intento fallido y devuelve el total acumulado. */
const registrarIntentoFallido = (idUsuario: number): number => {
    const ahora = Date.now();
    const estado = intentosFallidos2FA.get(idUsuario);
    const intentos = estado && estado.expira > ahora ? estado.intentos + 1 : 1;
    intentosFallidos2FA.set(idUsuario, { intentos, expira: ahora + CODIGO_EXPIRA_MIN * 60 * 1000 });
    return intentos;
};

/** Reinicia el contador de intentos (al reenviar un código nuevo). */
const reiniciarIntentos = (idUsuario: number): void => {
    intentosFallidos2FA.delete(idUsuario);
};

/** Genera un código aleatorio de 6 dígitos (100000–999999) con crypto seguro. */
const generarCodigo6 = (): string => String(randomInt(100000, 1000000));

/**
 * POST /api/auth/2fa/send (protegido)
 * Genera un código de 6 dígitos, invalida los anteriores sin usar, lo inserta
 * con sp_GenerarCodigo2FA (expira en 5 minutos) y lo envía por correo.
 * Destino según el rol: Inquilino → correo principal; Admin/Guarda → correo_contacto.
 */
export const send2FACode = async (req: Request, res: Response) => {
    // Transacción del código 2FA: se declara fuera del try para poder hacer
    // rollback en el catch si algo falla antes del commit.
    let transaction: sql.Transaction | null = null;
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        // 1. Determinar la dirección destino según el rol:
        //    Inquilino    → correo (dominio público real: gmail/hotmail/...)
        //    Admin/Guarda → correo_contacto (campo dedicado con un correo real)
        //    NO hay fallback al correo principal del staff: su correo usa dominios
        //    internos (admin.com / guardia.com) que no reciben correo real.
        const esInquilino = user.nombre_rol === 'Inquilino';
        const destino = esInquilino ? user.correo : user.correo_contacto;
        if (!destino) {
            return res.status(400).json({
                message: esInquilino
                    ? 'No hay un correo configurado para enviar el código.'
                    : 'Este usuario no tiene un correo de contacto configurado. Configúralo (correo_contacto) para recibir el código 2FA.',
            });
        }

        // 2. Reutiliza la conexión de validateSessionAndSetContext (misma sesión/CONTEXT_INFO)
        const pool = req.pool ?? await getConnection();

        // 3. REGLA DE REENVÍO + inserción del código, TODO dentro de UNA SOLA
        //    transacción. El chequeo "¿hay un código vigente?" y el INSERT deben
        //    ser atómicos: si dos peticiones llegan a la vez (p. ej. React
        //    StrictMode dispara el auto-envío 2 veces), la primera inserta su
        //    código y la segunda, al quedar bloqueada por la transacción, ve ese
        //    código y responde ya_enviado — NUNCA se generan dos códigos ni se
        //    envían dos correos.
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const estado = intentosFallidos2FA.get(user.id_usuario);
        const bloqueado = !!estado && estado.expira > Date.now() && estado.intentos >= INTENTOS_MAXIMOS;

        // ¿Hay un código vigente (no usado y sin expirar)? Se consulta dentro de
        // la transacción para que el resultado sea consistente entre peticiones.
        const vigente = await transaction.request()
            .input('id_usuario', sql.Int, user.id_usuario)
            .query(`SELECT TOP 1 DATEDIFF(SECOND, SYSDATETIME(), fecha_expira) AS segundos_restantes
                    FROM Codigo2FA
                    WHERE id_usuario = @id_usuario AND usado = 0 AND fecha_expira > SYSDATETIME()
                    ORDER BY id_codigo DESC`);
        const codigoVigente = vigente.recordset?.[0];

        // Intentos consumidos: se informan para que el frontend sincronice su
        // contador local (importante al recargar /2fa con intentos ya usados).
        const intentosPrevios = estado && estado.expira > Date.now() ? estado.intentos : 0;
        const intentosRestantes = Math.max(0, INTENTOS_MAXIMOS - intentosPrevios);

        // Si la petición es el AUTO-envío de la página (carga/recarga de /2fa) y
        // el usuario está bloqueado, se responde 429 para que el frontend muestre
        // el bloqueo y obligue a presionar el botón (no se salta la regla recargando).
        if (bloqueado && req.body?.auto === true) {
            await transaction.rollback();
            transaction = null;
            return res.status(429).json({
                message: 'Demasiados intentos fallidos. Solicita un nuevo código.',
                bloqueado: true,
                intentos_restantes: 0,
                ...(codigoVigente ? { expira_en: Math.max(1, Number(codigoVigente.segundos_restantes)) } : {}),
            });
        }

        // Código vigente + intentos disponibles → no se envía otro correo; se
        // informa que ya hay un código activo con el tiempo restante real.
        if (!bloqueado && codigoVigente) {
            await transaction.rollback();
            transaction = null;
            return res.status(200).json({
                message: 'Ya tienes un código vigente en tu correo',
                ya_enviado: true,
                expira_en: Math.max(1, Number(codigoVigente.segundos_restantes)),
                intentos_restantes: intentosRestantes,
            });
        }

        // 4. Generar el código y su fecha de expiración (5 minutos)
        const codigo = generarCodigo6();
        const fechaExpira = new Date(Date.now() + CODIGO_EXPIRA_MIN * 60 * 1000);

        // 5. Invalidar códigos anteriores sin usar (evita acumulación en Codigo2FA)
        await transaction.request()
            .input('id_usuario', sql.Int, user.id_usuario)
            .query('UPDATE Codigo2FA SET usado = 1 WHERE id_usuario = @id_usuario AND usado = 0');

        // 6. Insertar el nuevo código (sp_GenerarCodigo2FA)
        await transaction.request()
            .input('id_usuario_actual', sql.Int, user.id_usuario)
            .input('codigo', sql.Char(6), codigo)
            .input('fecha_expira', sql.DateTime2, fechaExpira)
            .execute('sp_GenerarCodigo2FA');

        // 6b. FIX (zona horaria): el driver mssql envía el Date JS como UTC y
        //     SQL Server lo guarda con su reloj local, por lo que fecha_expira
        //     podía quedar desplazado horas. Se recalcula la expiración EN SQL
        //     Server (DATEADD sobre SYSDATETIME) para que sean SIEMPRE 5 min
        //     exactos según el reloj de la BD. El código recién insertado es el
        //     único con usado = 0 (paso 5 invalidó los anteriores).
        await transaction.request()
            .input('id_usuario', sql.Int, user.id_usuario)
            .query('UPDATE Codigo2FA SET fecha_expira = DATEADD(MINUTE, 5, SYSDATETIME()) WHERE id_usuario = @id_usuario AND usado = 0');

        // Confirmar ANTES de enviar el correo: el envío no debe mantener la
        // conexión ocupada y, si falla, el código queda registrado y se invalida
        // en el paso 7 (nunca se expone un código activo que no llegó al correo).
        await transaction.commit();
        transaction = null;

        // 7. Enviar el correo por Gmail SMTP (ver mailService.ts). Si el envío
        //    falla, se invalida el código recién insertado y se responde 502: el
        //    usuario NO debe quedar con un código activo que nunca recibió.
        try {
            await enviarCodigo2FA({ destino, nombre: user.nombre_completo ?? 'usuario', codigo });
        } catch (mailError) {
            console.error('No se pudo enviar el correo 2FA:', mailError);
            await pool.request()
                .input('id_usuario', sql.Int, user.id_usuario)
                .query('UPDATE Codigo2FA SET usado = 1 WHERE id_usuario = @id_usuario AND usado = 0')
                .catch(() => { /* si falla la invalidación, el código expirará solo en 5 min */ });
            return res.status(502).json({
                message: 'No se pudo enviar el correo con el código. Inténtelo nuevamente.',
            });
        }

        // 8. Reiniciar el contador de intentos (nuevo código = nuevos intentos).
        //    Se hace SOLO tras el envío exitoso del correo.
        reiniciarIntentos(user.id_usuario);

        return res.status(200).json({ message: 'Código enviado', expira_en: CODIGO_EXPIRA_MIN * 60 });
    } catch (error: unknown) {
        // Si la transacción quedó abierta (error antes de commit/rollback), se
        // revierte para liberar la conexión y no dejar escritos parciales.
        if (transaction) {
            try { await transaction.rollback(); } catch { /* ya cerrada */ }
        }
        console.error('Error al generar el código 2FA:', error);
        return res.status(500).json({ message: 'Error al generar el código de verificación' });
    }
};

/**
 * POST /api/auth/2fa/verify (protegido)
 * Valida el código con sp_VerificarCodigo2FA. Si es válido, emite un NUEVO JWT
 * con 2faVerified = true (el frontend lo reemplaza por el temporal).
 * Si falla, cuenta el intento: al llegar a 3 se bloquea hasta reenviar.
 */
export const verify2FACode = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const { codigo } = req.body ?? {};
        if (typeof codigo !== 'string' || !/^\d{6}$/.test(codigo)) {
            return res.status(400).json({ message: 'El código debe tener 6 dígitos' });
        }

        // 1. Si ya se agotaron los intentos → obligar a reenviar (el reenvío reinicia)
        const estado = intentosFallidos2FA.get(user.id_usuario);
        if (estado && estado.expira > Date.now() && estado.intentos >= INTENTOS_MAXIMOS) {
            return res.status(429).json({
                message: 'Demasiados intentos fallidos. Solicita un nuevo código.',
                bloqueado: true,
                intentos_restantes: 0,
            });
        }

        const pool = req.pool ?? await getConnection();

        // 2. Validar el código con el SP (valida que exista, no usado y no expirado)
        const result = await pool.request()
            .input('id_usuario_actual', sql.Int, user.id_usuario)
            .input('codigo', sql.Char(6), codigo)
            .output('valido', sql.Bit)
            .execute('sp_VerificarCodigo2FA');

        const valido = result.output?.valido ?? result.recordset?.[0]?.valido;

        if (Number(valido) !== 1) {
            const intentos = registrarIntentoFallido(user.id_usuario);
            const restantes = Math.max(0, INTENTOS_MAXIMOS - intentos);

            if (intentos >= INTENTOS_MAXIMOS) {
                return res.status(429).json({
                    message: 'Código inválido. Agotaste los 3 intentos: solicita un nuevo código.',
                    bloqueado: true,
                    intentos_restantes: 0,
                });
            }
            return res.status(400).json({
                message: 'Código inválido o expirado',
                intentos_restantes: restantes,
            });
        }

        // 3. Marcar el código como usado (evita reutilización dentro de su
        //    ventana de validez aunque el SP no lo marque internamente)
        await pool.request()
            .input('id_usuario', sql.Int, user.id_usuario)
            .input('codigo', sql.Char(6), codigo)
            .query('UPDATE Codigo2FA SET usado = 1 WHERE id_usuario = @id_usuario AND codigo = @codigo AND usado = 0');

        // 4. Código válido → emitir el JWT FINAL con 2faVerified = true
        const payload: Record<string, unknown> = {
            id_usuario: user.id_usuario,
            id_rol: user.id_rol,
            nombre_rol: user.nombre_rol,
            nombre_completo: user.nombre_completo,
            id_sesion: user.id_sesion,
            correo: user.correo,
            '2faVerified': true,
        };
        if (user.correo_contacto) {
            payload['correo_contacto'] = user.correo_contacto;
        }
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        reiniciarIntentos(user.id_usuario);

        return res.status(200).json({ token, message: 'Verificación exitosa' });
    } catch (error: unknown) {
        console.error('Error al verificar el código 2FA:', error);
        return res.status(500).json({ message: 'Error al verificar el código de verificación' });
    }
};

/**
 * POST /api/auth/logout (protegido)
 * Cierra la sesión manualmente (estado CerradaManual).
 * El id_sesion e id_usuario se extraen del JWT (req.user).
 */
export const logout = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        // Reutiliza la conexión establecida por validateSessionAndSetContext
        const pool = req.pool ?? await getConnection();

        await pool.request()
            .input('id_sesion', sql.Int, user.id_sesion)
            .input('id_usuario', sql.Int, user.id_usuario)
            .execute('sp_CerrarSesion');

        return res.status(200).json({ message: 'Sesión cerrada exitosamente' });
    } catch (error: unknown) {
        console.error('Error al cerrar sesión:', error);
        return res.status(500).json({ message: 'Error al cerrar sesión' });
    }
};

/**
 * GET /api/auth/me (protegido)
 * Devuelve los datos del usuario autenticado (leído del JWT), incluido el
 * flag 2faVerified. Útil para restaurar la sesión del frontend tras recargar
 * la página: si 2faVerified es false, el frontend redirige a /2fa.
 */
export const getMe = async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: 'No autenticado' });
    }
    return res.status(200).json({ user });
};

// ----------------------------------------------------------------------------
// Recuperación de contraseña (público — sin JWT ni 2FA)
// ----------------------------------------------------------------------------
const TOKEN_EXPIRA_MIN = 10;   // Validez del token de recuperación (10 min)
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Política de contraseña: mín 8, mayúscula, minúscula, número y símbolo
const REGEX_CONTRASENA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const LIMITE_SOLICITUDES = 3;         // Máx. solicitudes de recuperación
const VENTANA_SOLICITUDES_MIN = 60;   // ... en una ventana de 1 hora

/**
 * Rate limit en memoria (mismo patrón que intentosFallidos2FA): máx. 3
 * solicitudes por hora por correo+IP. Devuelve false si ya se superó el límite.
 */
const solicitudesRecuperacion = new Map<string, number[]>();
const permitirSolicitudRecuperacion = (clave: string): boolean => {
    const ahora = Date.now();
    const ventana = ahora - VENTANA_SOLICITUDES_MIN * 60 * 1000;

    // Poda de claves frías: si el Map crece mucho (muchos correos+IP distintos),
    // se eliminan las entradas cuyas marcas ya caducaron (evita fuga de memoria).
    if (solicitudesRecuperacion.size > 1000) {
        for (const [k, marcas] of solicitudesRecuperacion) {
            const ultima = marcas[marcas.length - 1];
            if (ultima !== undefined && ultima <= ventana) solicitudesRecuperacion.delete(k);
        }
    }

    const previas = (solicitudesRecuperacion.get(clave) ?? []).filter(t => t > ventana);
    if (previas.length >= LIMITE_SOLICITUDES) {
        solicitudesRecuperacion.set(clave, previas);
        return false;
    }
    previas.push(ahora);
    solicitudesRecuperacion.set(clave, previas);
    return true;
};

/**
 * POST /api/auth/recuperar-solicitar (público)
 * Body: { correo }
 * Busca el correo en `correo` Y `correo_contacto` (solo usuarios activos).
 * Si existe: genera token único (10 min), lo guarda en TokenRecuperacion e
 * invalida los anteriores sin usar, y envía el enlace al correo DONDE coincidió.
 * La respuesta es SIEMPRE la misma (genérica) para no revelar si el correo existe.
 */
export const solicitarRecuperacion = async (req: Request, res: Response) => {
    try {
        const { correo } = req.body ?? {};

        // 1. Validar formato del correo
        if (typeof correo !== 'string' || !REGEX_CORREO.test(correo.trim())) {
            return res.status(400).json({ message: 'Ingresa un correo válido' });
        }
        const correoNormalizado = correo.trim().toLowerCase();

        // 2. Rate limit por correo+IP (anti-spam del envío de correos)
        const ip = req.ip ?? 'desconocida';
        if (!permitirSolicitudRecuperacion(`${correoNormalizado}|${ip}`)) {
            return res.status(429).json({ message: 'Demasiadas solicitudes. Inténtalo más tarde.' });
        }

        const pool = await getConnection();

        // 3. Buscar en correo Y correo_contacto (dualidad Inquilino/staff).
        //    correo_destino = el campo donde coincidió (allí se envía el correo).
        const resultado = await pool.request()
            .input('correo', sql.VarChar(150), correoNormalizado)
            .query(`SELECT TOP 1 id_usuario, nombre_completo,
                           CASE
                               WHEN LOWER(correo) = @correo THEN correo
                               WHEN LOWER(correo_contacto) = @correo THEN correo_contacto
                           END AS correo_destino
                    FROM Usuario
                    WHERE (LOWER(correo) = @correo OR LOWER(correo_contacto) = @correo)
                      AND activo = 1`);

        const fila = resultado.recordset?.[0] as {
            id_usuario?: number;
            nombre_completo?: string;
            correo_destino?: string | null;
        } | undefined;

        // Respuesta SIEMPRE genérica (aunque el correo no exista: anti-enumeración)
        const respuestaGenerica = { mensaje: 'Si el correo existe, recibirás instrucciones.' };
        if (!fila?.id_usuario || !fila.correo_destino) {
            return res.status(200).json(respuestaGenerica);
        }

        // 4. Token único e impredecible (crypto seguro, 64 chars hex)
        const token = randomBytes(32).toString('hex');

        // 5. Transacción: invalidar tokens previos sin usar + insertar el nuevo.
        //    fecha_expira se calcula EN SQL Server (DATEADD sobre SYSDATETIME)
        //    para evitar el desfase de zona horaria del driver mssql (fix 2FA).
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await transaction.request()
                .input('id_usuario', sql.Int, fila.id_usuario)
                .query('UPDATE TokenRecuperacion SET usado = 1 WHERE id_usuario = @id_usuario AND usado = 0');

            await transaction.request()
                .input('id_usuario', sql.Int, fila.id_usuario)
                .input('token', sql.VarChar(255), token)
                .input('expira_min', sql.Int, TOKEN_EXPIRA_MIN)
                .query(`INSERT INTO TokenRecuperacion (id_usuario, token, fecha_solicitud, fecha_expira, usado)
                        VALUES (@id_usuario, @token, SYSDATETIME(), DATEADD(MINUTE, @expira_min, SYSDATETIME()), 0)`);
            await transaction.commit();
        } catch (error) {
            await transaction.rollback().catch(() => { /* ya cerrada */ });
            throw error;
        }

        // 6. Enviar el correo al destino real. Si falla, se invalida el token
        //    (el usuario nunca lo recibió) pero la respuesta sigue siendo genérica.
        try {
            await enviarCorreoRecuperacion({
                destino: fila.correo_destino,
                nombre: fila.nombre_completo ?? 'usuario',
                enlace: `${FRONTEND_URL}/recuperar?token=${token}`,
            });
        } catch (mailError) {
            console.error('No se pudo enviar el correo de recuperación:', mailError);
            await pool.request()
                .input('token', sql.VarChar(255), token)
                .query('UPDATE TokenRecuperacion SET usado = 1 WHERE token = @token AND usado = 0')
                .catch(() => { /* si falla, el token expira solo en 1 hora */ });
        }

        return res.status(200).json(respuestaGenerica);
    } catch (error: unknown) {
        console.error('Error al solicitar recuperación:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

/**
 * POST /api/auth/recuperar-restablecer (público)
 * Body: { token, nuevaContrasena }
 * Valida el token (existe, no usado y no expirado — la expiración se compara
 * EN SQL con SYSDATETIME), hashea la nueva contraseña con bcrypt (10 rondas)
 * y actualiza `contrasena_hash`. Marca el token como usado (uso único).
 */
export const restablecerContrasena = async (req: Request, res: Response) => {
    try {
        const { token, nuevaContrasena } = req.body ?? {};

        // 1. Validaciones de entrada
        if (typeof token !== 'string' || !token.trim()) {
            return res.status(400).json({ message: 'El enlace de recuperación no es válido.' });
        }
        if (typeof nuevaContrasena !== 'string' || !REGEX_CONTRASENA.test(nuevaContrasena)) {
            return res.status(400).json({
                message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo (@$!%*?&).',
            });
        }

        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 2. Buscar el token con bloqueo de fila (UPDLOCK): evita que dos
            //    peticiones simultáneas usen el mismo token (uso único garantizado).
            //    La expiración se compara en SQL Server (mismo reloj que el insert).
            const resultado = await transaction.request()
                .input('token', sql.VarChar(255), token.trim())
                .query(`SELECT TOP 1 id_usuario
                        FROM TokenRecuperacion WITH (UPDLOCK, ROWLOCK)
                        WHERE token = @token AND usado = 0 AND fecha_expira > SYSDATETIME()`);

            const fila = resultado.recordset?.[0] as { id_usuario?: number } | undefined;
            if (!fila?.id_usuario) {
                await transaction.rollback();
                return res.status(400).json({ message: 'El enlace es inválido o ha expirado. Solicita uno nuevo.' });
            }

            // 3. Hashear la nueva contraseña con bcrypt (10 rondas, igual que login/register)
            const hash = await bcrypt.hash(nuevaContrasena, SALT_ROUNDS);

            // 4. Actualizar contraseña + marcar token usado, todo atómico.
            //    UPDATE directo (flujo público sin sesión: no aplica sp_CambiarContrasena).
            await transaction.request()
                .input('id_usuario', sql.Int, fila.id_usuario)
                .input('nueva_contrasena_hash', sql.VarChar(256), hash)
                .query('UPDATE Usuario SET contrasena_hash = @nueva_contrasena_hash WHERE id_usuario = @id_usuario');

            await transaction.request()
                .input('token', sql.VarChar(255), token.trim())
                .query('UPDATE TokenRecuperacion SET usado = 1 WHERE token = @token AND usado = 0');

            await transaction.commit();

            return res.status(200).json({ mensaje: 'Contraseña actualizada correctamente. Inicia sesión nuevamente.' });
        } catch (error) {
            await transaction.rollback().catch(() => { /* ya cerrada */ });
            throw error;
        }
    } catch (error: unknown) {
        console.error('Error al restablecer la contraseña:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};
