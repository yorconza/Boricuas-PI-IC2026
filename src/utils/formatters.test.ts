/**
 * Pruebas unitarias para los formateadores de la app (formatters.ts).
 *
 * Verifica que:
 * - formatearMoneda devuelva colones CR con PUNTOS para miles (₡3.000),
 *   independiente de la ICU del navegador (toLocaleString('es-CR') separa
 *   con espacio U+00A0 en Chrome/Node, lo que NO queremos).
 * - formatearTelefono / formatearCedula mantengan sus máscaras.
 */

import { describe, it, expect } from 'vitest';
import { formatearMoneda, formatearTelefono, formatearCedula, validarCedula } from './formatters';

// ============================================================
// formatearMoneda
// ============================================================
describe('formatearMoneda', () => {
  it('debe formatear 3000 como ₡3.000 (puntos para miles)', () => {
    expect(formatearMoneda(3000)).toBe('₡3.000');
  });

  it('debe formatear 1234567 como ₡1.234.567', () => {
    expect(formatearMoneda(1234567)).toBe('₡1.234.567');
  });

  it('debe formatear 0 como ₡0', () => {
    expect(formatearMoneda(0)).toBe('₡0');
  });

  it('debe redondear sin decimales: 1234.5 → ₡1.235', () => {
    expect(formatearMoneda(1234.5)).toBe('₡1.235');
  });

  it('debe dejar los montos sin miles igual: 950 → ₡950', () => {
    expect(formatearMoneda(950)).toBe('₡950');
  });

  it('NUNCA debe usar espacio ni espacio no separable como separador de miles', () => {
    expect(formatearMoneda(3000)).not.toMatch(/[\s\u00A0\u202F]/);
    expect(formatearMoneda(1234567)).not.toMatch(/[\s\u00A0\u202F]/);
  });
});

// ============================================================
// formatearTelefono
// ============================================================
describe('formatearTelefono', () => {
  it('debe formatear 77777777 como 7777-7777', () => {
    expect(formatearTelefono('77777777')).toBe('7777-7777');
  });

  it('debe ignorar caracteres no numéricos y limitar a 8 dígitos', () => {
    expect(formatearTelefono('77 77-7777 x99')).toBe('7777-7777');
  });

  it('debe dejar sin guion los números de 4 dígitos o menos', () => {
    expect(formatearTelefono('1234')).toBe('1234');
  });
});

// ============================================================
// formatearCedula
// ============================================================
describe('formatearCedula', () => {
  it('debe formatear 123456789 como 1-2345-6789', () => {
    expect(formatearCedula('123456789')).toBe('1-2345-6789');
  });

  it('debe limitar a 9 dígitos', () => {
    expect(formatearCedula('1234567890123')).toBe('1-2345-6789');
  });

  it('debe formatear parcialmente mientras se escribe (3 dígitos → 1-23)', () => {
    expect(formatearCedula('123')).toBe('1-23');
  });

  it('debe formatear parcialmente mientras se escribe (6 dígitos → 1-2345-6)', () => {
    expect(formatearCedula('123456')).toBe('1-2345-6');
  });
});

// ============================================================
// validarCedula
// ============================================================
describe('validarCedula', () => {
  it('debe aceptar el formato nuevo 1-2345-6789', () => {
    expect(validarCedula('1-2345-6789')).toBeNull();
  });

  it('debe rechazar el formato antiguo 1-234-56789', () => {
    expect(validarCedula('1-234-56789')).toBe('La cédula debe tener el formato 1-2345-6789 (9 dígitos).');
  });

  it('debe aceptar cédulas vacías (opcional, no es error)', () => {
    expect(validarCedula('')).toBeNull();
    expect(validarCedula('   ')).toBeNull();
  });
});
