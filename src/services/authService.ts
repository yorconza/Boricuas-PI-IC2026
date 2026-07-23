/**
 * ============================================================================
 * Archivo: authService.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Simula el servicio de autenticación del backend. Expone funciones para
 * iniciar sesión, registrar usuarios y verificar el código 2FA.
 *
 * Métodos que expone
 * - iniciarSesion(credenciales)  → Devuelve un Usuario según el dominio
 * - registrarUsuario(datos)      → Crea un nuevo inquilino
 * - verificarCodigo2FA(id, codigo) → Verifica el código de 2 pasos
 * - reenviarCodigo2FA(id)        → Reenvía el código (simulado)
 *
 * Se comunica con
 * - LoginPage.tsx (llama a iniciarSesion y registrarUsuario)
 * - TwoFactorPage.tsx (llama a verificarCodigo2FA y reenviarCodigo2FA)
 *
 * Datos actuales
 * TODO es simulado con setTimeout. No hay conexión real a backend.
 *
 * Cambios para Backend
 * Cuando exista el backend, este archivo deberá:
 *
 * ✓ Consumir el endpoint POST /api/auth/login
 * ✓ Guardar el JWT en localStorage
 * ✓ Manejar errores HTTP (401, 403, 500, etc.)
 * ✓ Verificar la expiración del token
 *
 * Ejemplo de cómo lucirá con backend:
 *
 *   const response = await fetch('/api/auth/login', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(credenciales),
 *   });
 *   if (!response.ok) throw new Error('Credenciales inválidas');
 *   const data = await response.json();
 *   localStorage.setItem('token', data.token);
 *   return data.usuario;
 *
 * ============================================================================
 */

import type { Usuario, Credenciales, DatosRegistro } from '../types/auth';

export const authService = {
  async verificarCodigo2FA(idUsuario: number, codigo: string): Promise<{ token: string }> {
    await new Promise(r => setTimeout(r, 800));
    if (codigo === '123456') {
      return { token: '2fa-token-' + Date.now() };
    }
    throw new Error('Invalid verification code. Please try again.');
  },

  async reenviarCodigo2FA(idUsuario: number): Promise<void> {
    await new Promise(r => setTimeout(r, 500));
    // Simula reenvío exitoso
  },
  async iniciarSesion(credenciales: Credenciales): Promise<Usuario> {
    await new Promise(r => setTimeout(r, 500));

    const correo = credenciales.correo.toLowerCase();

    if (correo.includes('@admin')) {
      return {
        idUsuario: 1,
        nombreCompleto: 'Administrador',
        correo: credenciales.correo,
        idRol: 1,
        rol: 'Administrador',
        activo: true,
      };
    }

    if (correo.includes('@guardia')) {
      return {
        idUsuario: 2,
        nombreCompleto: 'Guardia',
        correo: credenciales.correo,
        idRol: 2,
        rol: 'Guarda',
        activo: true,
      };
    }

    return {
      idUsuario: 3,
      nombreCompleto: 'Inquilino Demo',
      correo: credenciales.correo,
      idRol: 3,
      rol: 'Inquilino',
      activo: true,
    };
  },

  async registrarUsuario(datos: DatosRegistro): Promise<Usuario> {
    await new Promise(r => setTimeout(r, 500));
    if (datos.correo.includes('admin') || datos.correo.includes('guardia')) {
      throw new Error('The email domain does not correspond to a tenant.');
    }
    return {
      idUsuario: 4,
      nombreCompleto: datos.nombreCompleto,
      correo: datos.correo,
      idRol: 3,
      rol: 'Inquilino',
      activo: true,
    };
  },
};
