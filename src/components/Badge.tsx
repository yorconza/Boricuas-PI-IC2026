/**
 * ============================================================================
 * Archivo: Badge.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Componente simple que muestra una etiqueta (badge) con un color según su
 * variante. Se usa para indicar estados: Activo, Pendiente, Error, etc.
 *
 * Props que recibe
 * - variant?: 'success' | 'warning' | 'error' | 'info' | 'domain' | 'disabled' | 'default'
 * - children: ReactNode (texto a mostrar dentro del badge)
 * - className?: string (clase CSS adicional)
 *
 * Quién lo utiliza
 * - Tablas en Admin, Inquilino y Guardia (mostrar estados)
 * - AreasPage (disponible/deshabilitada)
 * - ReservasPage (estado de reserva)
 * - VisitasPage (estado de visita)
 *
 * ============================================================================
 */

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'domain' | 'disabled' | 'default';
  children: React.ReactNode;
  className?: string;
}

// Mapa variante → clase CSS (reemplaza el switch; evita asignaciones muertas)
const VARIANT_CLASSES: Record<string, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
  domain: 'badge-domain',
  disabled: 'badge-disabled',
};

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variantClass = VARIANT_CLASSES[variant] ?? '';
  return <span className={`badge ${variantClass} ${className}`.trim()}>{children}</span>;
}
