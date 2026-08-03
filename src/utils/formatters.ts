/**
 * ============================================================================
 * Archivo: formatters.ts
 * ============================================================================
 * Utilidades de formato de campos de formularios (máscaras de entrada).
 *
 * - formatearTelefono → 7777-7777 (8 dígitos, guion en el medio)
 * - formatearCedula   → #-###-##### (9 dígitos en total)
 * ============================================================================
 */

/** Moneda (colones CR, sin decimales): 1234.5 → ₡1.235 — puntos para miles, convención ₡ de toda la app */
export const formatearMoneda = (valor: number): string =>
  `₡${Math.round(valor).toLocaleString('es-CR')}`;

/** Teléfono: 7777-7777 (8 dígitos, guion en el medio) */
export const formatearTelefono = (valor: string): string => {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 4) return digitos;
  return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
};

/** Cédula: #-###-##### (9 dígitos en total) */
export const formatearCedula = (valor: string): string => {
  const digitos = valor.replace(/\D/g, '').slice(0, 9);
  if (digitos.length <= 1) return digitos;
  if (digitos.length <= 4) return `${digitos[0]}-${digitos.slice(1)}`;
  return `${digitos[0]}-${digitos.slice(1, 4)}-${digitos.slice(4)}`;
};

/**
 * Valida un teléfono con el formato 7777-7777 (8 dígitos).
 * Devuelve un mensaje de error legible o null si es válido (o está vacío).
 */
export const validarTelefono = (valor: string): string | null => {
  const limpio = valor.trim();
  if (!limpio) return null; // opcional: vacío no es error
  if (!/^\d{4}-\d{4}$/.test(limpio)) {
    return 'El teléfono debe tener el formato 7777-7777 (8 dígitos).';
  }
  return null;
};

/**
 * Valida una cédula con el formato #-###-##### (9 dígitos en total).
 * Devuelve un mensaje de error legible o null si es válida (o está vacía).
 */
export const validarCedula = (valor: string): string | null => {
  const limpio = valor.trim();
  if (!limpio) return null; // opcional: vacío no es error
  if (!/^\d-\d{3}-\d{5}$/.test(limpio)) {
    return 'La cédula debe tener el formato 1-234-56789 (9 dígitos).';
  }
  return null;
};
