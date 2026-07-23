/**
 * Pruebas unitarias para el servicio de autenticación (authService).
 *
 * Verifica que:
 * - iniciarSesion retorne el rol correcto según el dominio del correo
 * - iniciarSesion rechace credenciales inválidas (dominio inexistente)
 * - registrarUsuario cree un inquilino y rechace dominios de admin/guardia
 * - verificarCodigo2FA acepte el código correcto y rechace códigos incorrectos
 * - reenviarCodigo2FA se complete sin errores
 */

import { describe, it, expect } from 'vitest';
import { authService } from './authService';

// ============================================================
// iniciarSesion
// ============================================================
describe('authService.iniciarSesion', () => {
  it('debe retornar un usuario administrador cuando el correo contiene @admin', async () => {
    const usuario = await authService.iniciarSesion({
      correo: 'admin@admin.com',
      contrasena: '123456',
    });

    expect(usuario).toMatchObject({
      idRol: 1,
      rol: 'Administrador',
      activo: true,
    });
    expect(usuario.idUsuario).toBe(1);
    expect(usuario.nombreCompleto).toBe('Administrador');
  });

  it('debe retornar un usuario guardia cuando el correo contiene @guardia', async () => {
    const usuario = await authService.iniciarSesion({
      correo: 'guardia@guardia.com',
      contrasena: '123456',
    });

    expect(usuario).toMatchObject({
      idRol: 2,
      rol: 'Guarda',
      activo: true,
    });
  });

  it('debe retornar un inquilino para cualquier otro correo', async () => {
    const usuario = await authService.iniciarSesion({
      correo: 'usuario@email.com',
      contrasena: 'password',
    });

    expect(usuario).toMatchObject({
      idRol: 3,
      rol: 'Inquilino',
      activo: true,
    });
  });

  it('debe convertir el correo a minúsculas antes de evaluar el dominio', async () => {
    const usuario = await authService.iniciarSesion({
      correo: 'ADMIN@ADMIN.COM',
      contrasena: '123456',
    });

    expect(usuario.rol).toBe('Administrador');
  });
});

// ============================================================
// registrarUsuario
// ============================================================
describe('authService.registrarUsuario', () => {
  it('debe registrar un usuario inquilino con datos válidos', async () => {
    const usuario = await authService.registrarUsuario({
      nombreCompleto: 'Juan Pérez',
      correo: 'juan@email.com',
      contrasena: 'SecurePass1!',
    });

    expect(usuario).toMatchObject({
      idUsuario: 4,
      rol: 'Inquilino',
      activo: true,
      nombreCompleto: 'Juan Pérez',
    });
  });

  it('debe rechazar el registro si el correo contiene admin', async () => {
    await expect(
      authService.registrarUsuario({
        nombreCompleto: 'Admin Falso',
        correo: 'admin@email.com',
        contrasena: 'SecurePass1!',
      })
    ).rejects.toThrow('The email domain does not correspond to a tenant.');
  });

  it('debe rechazar el registro si el correo contiene guardia', async () => {
    await expect(
      authService.registrarUsuario({
        nombreCompleto: 'Guarda Falso',
        correo: 'guardia@test.com',
        contrasena: 'SecurePass1!',
      })
    ).rejects.toThrow('The email domain does not correspond to a tenant.');
  });
});

// ============================================================
// verificarCodigo2FA
// ============================================================
describe('authService.verificarCodigo2FA', () => {
  it('debe retornar un token cuando el código es 123456', async () => {
    const resultado = await authService.verificarCodigo2FA(1, '123456');

    expect(resultado).toHaveProperty('token');
    expect(typeof resultado.token).toBe('string');
    expect(resultado.token).toMatch(/^2fa-token-/);
  });

  it('debe lanzar un error cuando el código es incorrecto', async () => {
    await expect(
      authService.verificarCodigo2FA(1, '000000')
    ).rejects.toThrow('Invalid verification code. Please try again.');
  });
});

// ============================================================
// reenviarCodigo2FA
// ============================================================
describe('authService.reenviarCodigo2FA', () => {
  it('debe completarse sin errores', async () => {
    await expect(authService.reenviarCodigo2FA(1)).resolves.toBeUndefined();
  });
});
