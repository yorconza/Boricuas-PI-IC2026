/**
 * ============================================================================
 * Archivo: useLocalDate.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Contiene funciones de utilidad para manejar fechas y horas en formato local.
 * No es un hook de React (no usa useState ni useEffect), sino funciones puras.
 *
 * Funciones que expone
 * - getLocalDateString(date?)  → Retorna "YYYY-MM-DD"
 * - getLocalDateTimeString(date?) → Retorna "YYYY-MM-DD HH:MM"
 * - formatHora(hora24)         → Convierte "15:30" a "03:30 PM"
 * - formatHoraAMPM(hora24)     → Convierte "15:30" a "3:30 p.m."
 * - toDateOnly(fecha)          → Convierte ISO SQL Server ("...T00:00:00.000Z")
 *                                 a "YYYY-MM-DD" plano (o la deja igual si ya lo es)
 * - toTimeOnly(hora)           → Convierte ISO SQL Server (TIME/DATETIME) a
 *                                 "HH:mm:ss" plano (o la deja igual si ya lo es)
 * - getTimeAgo(timestamp)      → Retorna "hace 5 min", "hace 3 h", etc.
 * - getGreeting()              → Retorna "Buenos días / tardes / noches"
 *
 * Quién las utiliza
 * - AdminDashboard, ReservasPage, AreasPage, VisitasPage
 * - InquilinoDashboard, MisReservasPage, NuevaReservaPage
 * - DataContext.tsx (toDateOnly/toTimeOnly, para normalizar lo que devuelve
 *   el backend de Inquilino antes de guardarlo en el estado)
 * - Cualquier componente que muestre fechas u horas
 *
 * ============================================================================
 */

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDateTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${getLocalDateString(date)} ${hours}:${minutes}`;
}

export function formatHora(hora24: string): string {
  if (!hora24) return '--:--';
  const [h, m] = hora24.split(':').map(Number);
  // Entradas malformadas (sin ":", ej. un Date serializado por SQL Server)
  // no deben romper el render: se devuelve el placeholder en vez de crashear.
  if (Number.isNaN(h) || Number.isNaN(m)) return '--:--';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function formatHoraAMPM(hora24: string): string {
  if (!hora24) return '--:--';
  const partes = hora24.split(':');
  let h = parseInt(partes[0]);
  const m = partes[1] || '00';
  const ampm = h >= 12 ? 'p.m.' : 'a.m.';
  if (h > 12) h = h - 12;
  if (h === 0) h = 12;
  return h + ':' + m + ' ' + ampm;
}

/**
 * Convierte un valor de fecha que puede venir como "YYYY-MM-DD" (ya plano)
 * o como ISO completo (lo que devuelve SQL Server al serializar una columna
 * DATE, ej. "2026-08-15T00:00:00.000Z") a un string plano "YYYY-MM-DD".
 * Usa los componentes UTC porque SQL Server no aplica timezone a DATE: la
 * "T00:00:00.000Z" es solo un artefacto de la serialización, no una hora real.
 */
export function toDateOnly(fecha: string): string {
  if (!fecha) return '';
  if (!fecha.includes('T')) return fecha;
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convierte un valor de hora que puede venir como "HH:mm[:ss]" (ya plano) o
 * como ISO completo (lo que devuelve SQL Server para columnas TIME —Date con
 * fecha base 1970-01-01, ej. "1970-01-01T13:00:00.000Z"— o DATETIME) a
 * "HH:mm:ss". Usa los componentes UTC por la misma razón que toDateOnly.
 */
export function toTimeOnly(hora: string): string {
  if (!hora) return '';
  if (!hora.includes('T')) return hora;
  const d = new Date(hora);
  if (isNaN(d.getTime())) return hora;
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'hace unos segundos';
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days < 7) return `hace ${days} días`;
  return new Date(timestamp).toLocaleDateString('es-ES');
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  // 12:00 a. m. – 11:59 a. m. → Buenos días
  if (hour >= 0 && hour < 12) return 'Buenos días';
  // 12:00 p. m. – 6:59 p. m. → Buenas tardes
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  // 7:00 p. m. – 11:59 p. m. → Buenas noches
  return 'Buenas noches';
}