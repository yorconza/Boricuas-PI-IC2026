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

export interface Reserva {
  id: number;
  area: string;
  residente?: string;
  departamento?: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  personas: number;
  estado: string;
  costo: number;
  pago_estado: string;
  horas_anticipacion_cancelacion: number;
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
  contrato_estado: string;
  estado: string;
}

export interface Contrato {
  id: number;
  residente: string;
  departamento: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
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
