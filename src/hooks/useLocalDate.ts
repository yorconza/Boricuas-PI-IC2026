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
 * - getTimeAgo(timestamp)      → Retorna "hace 5 min", "hace 3 h", etc.
 * - getGreeting()              → Retorna "Buenos días / tardes / noches"
 *
 * Quién las utiliza
 * - AdminDashboard, ReservasPage, AreasPage, VisitasPage
 * - InquilinoDashboard, MisReservasPage, NuevaReservaPage
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
