/**
 * ============================================================================
 * Servicio: mailService.ts
 * ============================================================================
 * Envío de correos reales usando Gmail SMTP (nodemailer). Se eligió Gmail
 * SMTP (con App Password) para el proyecto universitario:
 *   - NO requiere comprar/verificar ningún dominio.
 *   - Entrega a CUALQUIER correo real (Gmail, Hotmail/Outlook, Yahoo, etc.).
 *   - Gratis (límite ~500 envíos/día en cuentas personales).
 *
 * Funciones que expone:
 *   - enviarCodigo2FA           → código 6 dígitos (flujo 2FA)
 *   - enviarCorreoRecuperacion  → enlace con token (recuperación de contraseña)
 *
 * Configuración (backend/.env):
 * ============================================================================
 */
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const MAIL_USER = process.env.MAIL_USER ?? '';
// La App Password de Google se muestra como "abcd efgh ijkl mnop" (con espacios);
// SMTP las rechaza con espacios en algunos clientes, así que se normalizan.
const MAIL_APP_PASSWORD = (process.env.MAIL_APP_PASSWORD ?? '').replace(/\s+/g, '');

if (!MAIL_USER || !MAIL_APP_PASSWORD) {
    console.warn('⚠️  MAIL_USER / MAIL_APP_PASSWORD no están definidos en backend/.env — no se podrán enviar correos (2FA ni recuperación).');
}

// Transporte Gmail SMTP (puerto 465 = SSL). Se crea solo si hay credenciales.
const transporter = MAIL_USER && MAIL_APP_PASSWORD
    ? nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true, // SSL implícito
          auth: {
              user: MAIL_USER,
              pass: MAIL_APP_PASSWORD,
          },
      })
    : null;

export interface EnviarCodigo2FAParams {
    /** Dirección destino (correo principal del inquilino o correo_contacto del staff) */
    destino: string;
    /** Nombre mostrado en el saludo del correo */
    nombre: string;
    /** Código de 6 dígitos (NUNCA se registra en logs ni respuestas HTTP) */
    codigo: string;
}

export interface EnviarRecuperacionParams {
    /** Dirección destino (correo donde se encontró la coincidencia: correo o correo_contacto) */
    destino: string;
    /** Nombre mostrado en el saludo del correo */
    nombre: string;
    /** Enlace completo con el token: `${FRONTEND_URL}/recuperar?token=...` */
    enlace: string;
}

/**
 * Devuelve el transporte Gmail SMTP o lanza si no está configurado.
 * Centraliza el chequeo para no repetir la validación en cada envío.
 */
const obtenerTransporter = () => {
    if (!transporter) {
        throw new Error('Gmail SMTP no configurado (MAIL_USER / MAIL_APP_PASSWORD en backend/.env)');
    }
    return transporter;
};

/**
 * Envía el correo con el código de verificación 2FA (válido por 5 minutos).
 * Lanza un Error si Gmail SMTP no está configurado o si el envío falla.
 * Resuelve cuando Gmail acepta el mensaje (llega a CUALQUIER correo real).
 */
export const enviarCodigo2FA = async ({ destino, nombre, codigo }: EnviarCodigo2FAParams): Promise<void> => {
    await obtenerTransporter().sendMail({
        from: `Condominio <${MAIL_USER}>`,
        to: destino,
        subject: '🔐 Tu código de verificación — Condominio',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="margin: 0 0 8px; color: #0f172a;">Verificación en dos pasos</h2>
                <p style="color: #475569; margin: 0 0 16px;">Hola, <strong>${escapeHtml(nombre)}</strong>:</p>
                <p style="color: #475569; margin: 0 0 16px;">
                    Usa el siguiente código para completar tu inicio de sesión. Expira en
                    <strong>5 minutos</strong>.
                </p>
                <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; color: #0f172a; background: #f1f5f9; border-radius: 8px; padding: 16px 0; margin-bottom: 16px;">
                    ${codigo}
                </div>
                <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                    Si no intentaste iniciar sesión, ignora este correo.
                    Nunca compartas este código con nadie.
                </p>
            </div>
        `,
    });
};

/**
 * Envía el correo de recuperación de contraseña con un enlace (token único,
 * válido 10 minutos). Reutiliza el MISMO transporte Gmail SMTP del 2FA.
 */
export const enviarCorreoRecuperacion = async ({ destino, nombre, enlace }: EnviarRecuperacionParams): Promise<void> => {
    await obtenerTransporter().sendMail({
        from: `Condominio <${MAIL_USER}>`,
        to: destino,
        subject: '🔑 Recuperación de contraseña — Condominio',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="margin: 0 0 8px; color: #0f172a;">Recupera tu contraseña</h2>
                <p style="color: #475569; margin: 0 0 16px;">Hola, <strong>${escapeHtml(nombre)}</strong>:</p>
                <p style="color: #475569; margin: 0 0 16px;">
                    Recibimos una solicitud para restablecer tu contraseña. El enlace
                    es válido por <strong>10 minutos</strong> y solo puede usarse una vez.
                </p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${escapeHtml(enlace)}" style="display: inline-block; background: #0a84ff; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 8px;">
                        Restablecer contraseña
                    </a>
                </div>
                <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                    Si no solicitaste este cambio, ignora este correo. Tu contraseña
                    actual seguirá siendo válida.
                </p>
            </div>
        `,
    });
};

/** Escapa caracteres HTML (evita inyección por nombres o URLs con caracteres especiales). */
const escapeHtml = (valor: string): string =>
    valor
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
