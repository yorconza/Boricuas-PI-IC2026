/**
 * ============================================================================
 * Archivo: types/index.ts
 * ============================================================================
 *
 * ¿Qué contiene?
 * Todas las interfaces y tipos compartidos del sistema.
 *
 * Responsabilidades
 * - Definir la estructura de datos de: Area, Reserva, Visitante, Personal,
 *   Residente, Contrato, Pago, ActivityItem, AlertaItem, NotificationItem
 * - Definir tipos auxiliares como UserRole y PageId
 *
 * Se comunica con
 * - TODOS los archivos del proyecto (es el contrato de datos central)
 * - DataContext.tsx (usa estos tipos para su estado global)
 * - Cada página usa estos tipos para mostrar datos
 *
 * Datos actuales
 * Interfaces completas para la versión mock. Cuando llegue el backend,
 * algunos campos podrían cambiar (ej: IDs numéricos a UUIDs).
 *
 * ============================================================================
 */

export interface Area {
  id: number;
  nombre: string;
  capacidad: string;
  hora_inicio: string;
  hora_fin: string;
  costo: string;
  imagen: string;
  estado: string;
}

// Para el panel de Inquilino (estructura diferente)
export interface AreaInquilino {
  id: number;
  nombre: string;
  imagen: string;
  capacidad: number;
  horario_inicio: number;
  horario_fin: number;
  costo_por_hora: number;
  disponible: boolean;
}

/**
 * NOTA (cambio para compilar con `tsc -b`):
 * En la app conviven DOS formas de `Reserva` con vocabularios distintos:
 *  - Forma API/Admin (id_reserva, id_area, cantidad_personas, estado
 *    'Reservado'|'Completado'|'Cancelado') usada por ReservasPage.tsx y por
 *    DataContext.recargarReservas() (panel admin).
 *  - Forma UI/Mock (id, personas, costo, pago_estado, estados
 *    'Confirmada'|'Pendiente'|'Cancelada'|...) usada por el panel de inquilino
 *    (MisReservasPage, NuevaReservaPage, InquilinoDashboard) y por sampleData.ts.
 * Se amplió la interfaz para admitir ambas formas: `estado` pasa a ser string
 * y los campos de la forma API quedan opcionales (la UI los lee con `??`/`!`),
 * mientras los de la forma UI/mock son obligatorios porque las páginas los
 * consumen como valores garantizados.
 */
export interface Reserva {
  // --- Presentes en ambas formas ---
  area: string;
  fecha: string;            // 'YYYY-MM-DD'
  hora_inicio: string;      // 'HH:mm:ss'
  hora_fin: string;         // 'HH:mm:ss'
  // Unión de TODOS los estados usados por ambas formas (API: 'Reservado' |
  // 'Completado' | 'Cancelado'; UI/mock: 'Confirmada' | 'Pendiente' | 'Cancelada' | 'Finalizado').
  // Se usa la unión (no `string`) para que `tsc -b` compile y aun así detecte
  // estados mal escritos (ej: 'Canceladdo').
  estado: 'Reservado' | 'Completado' | 'Cancelado' | 'Confirmada' | 'Pendiente' | 'Cancelada' | 'Finalizado';

  // --- Forma Backend/API (panel Admin) ---
  id_reserva?: number;
  id_usuario?: number;
  residente?: string;
  id_area?: number;
  cantidad_personas?: number;
  estado_pago?: string | null;
  monto?: number | null;
  fecha_creacion?: string;

  // --- Forma UI/Mock (panel Inquilino y sampleData) ---
  id: number;
  departamento?: string;
  personas: number;
  costo: number;
  pago_estado: string;
  horas_anticipacion_cancelacion?: number;
  hora?: string;
}

export interface CrearReservaPayload {
  id_area: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  cantidad_personas: number;
}

export interface EditarReservaPayload {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  cantidad_personas: number;
}

export interface Visitante {
  id: number;
  nombre_completo?: string;
  nombre?: string;
  documento_identidad?: string;
  documento?: string;
  placa: string;
  fecha_autorizacion?: string;
  estado: string;
  autoriza?: string;
  departamento?: string;
  motivo_rechazo?: string;
  hora_esperada?: string;
}

export interface Personal {
  id_usuario: number;
  nombre: string;
  correo: string;
  /** Correo real para recibir el código 2FA (lo usan Admin/Guarda) */
  correoContacto?: string;
  dominio: string;
  telefono: string;
  cedula: string;
  estado: string;
  iniciales: string;
}

export interface Residente {
  id: number;
  nombre: string;
  departamento: string;
  correo: string;
  telefono: string;
  cedula?: string;
  contrato_estado: string;
  estado: string;
}

export interface Departamento {
  id_departamento: number;
  numero: string;
  piso?: number | null;
  metros_cuadrados?: number | null;
  /** 'Disponible' | 'Ocupado' — lo gestiona el ciclo de vida del contrato (no se edita a mano). */
  estado: string;
  /** true = habilitado, false = deshabilitado (lo gestiona el admin). */
  activo: boolean;
  fecha_registro?: string;
}

export interface Contrato {
  id_contrato: number;
  id_usuario: number;
  residente: string;
  id_departamento: number;
  departamento: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  /** Monto mensual del contrato (colones CR). Opcional por compatibilidad con la vista VW_Contratos. */
  monto_mensual?: number;
  /** Monto del depósito (colones CR). Opcional por compatibilidad con la vista VW_Contratos. */
  monto_deposito?: number;
}

export interface Pago {
  id: number;
  residente: string;
  concepto: string;
  monto: string;
  fecha: string;
  metodo: string;
  estado: string;
}

export interface ActivityItem {
  id: number;
  descripcion: string;
  icono: string;
  color: string;
  fecha: string;
  hora: string;
  timestamp: number;
}

export interface AlertaItem {
  id: number;
  descripcion: string;
  prioridad: string;
  icono: string;
  color: string;
  fecha: string;
  timestamp: number;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
  timestamp: number;
}

export interface ProfileData {
  nombre: string;
  correo: string;
  telefono: string;
  password: string;
  avatar: string;
}

export type UserRole = 'admin' | 'guardia' | 'inquilino';

export interface User {
  username: string;
  role: UserRole;
  profile: ProfileData;
}

export type PageId =
  // Admin
  | 'dashboard' | 'actividad' | 'personal' | 'residentes'
  | 'departamentos' | 'areas' | 'reservas' | 'empresas'
  | 'contratos' | 'pagos' | 'reportes' | 'configuracion'
  // Guardia
  | 'visitas'
  // Inquilino
  | 'reservar-area' | 'nueva-reserva' | 'mis-reservas'
  | 'registrar-visitante' | 'mis-visitantes';
