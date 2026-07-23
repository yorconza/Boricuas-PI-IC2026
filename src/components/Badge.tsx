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

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  let variantClass = '';
  switch (variant) {
    case 'success': variantClass = 'badge-success'; break;
    case 'warning': variantClass = 'badge-warning'; break;
    case 'error': variantClass = 'badge-error'; break;
    case 'info': variantClass = 'badge-info'; break;
    case 'domain': variantClass = 'badge-domain'; break;
    case 'disabled': variantClass = 'badge-disabled'; break;
    default: variantClass = '';
  }
  return <span className={`badge ${variantClass} ${className}`.trim()}>{children}</span>;
}
