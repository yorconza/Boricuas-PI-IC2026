/**
 * ============================================================================
 * Archivo: sampleData.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Contiene los datos simulados (mock) que AÚN no tienen backend: áreas,
 * pagos, visitas, panel de inquilino y notificaciones. Sirven de respaldo
 * mientras esas secciones no se conecten a la API.
 *
 * Datos que contiene
 * - initialAreasData       → Áreas comunes (Admin)
 * - initialPagosData       → Pagos (Admin)
 * - visitasData            → Visitas (Guardia)
 * - areasDisponibles       → Áreas para Inquilino
 * - inquilinoReservas      → Reservas del inquilino
 * - inquilinoVisitantes    → Visitantes del inquilino
 * - getInitialActivityLog(), getInitialAlertas() → Actividad y alertas
 * - getInitial*Notifications() → Notificaciones por rol
 * - adminProfile, guardiaProfile, inquilinoProfile → Perfiles de usuario
 *
 * NOTA (cambio): Se eliminaron initialPersonalData, initialResidentesData,
 * initialContratosData y reservasData porque esas colecciones ya se cargan desde
 * el backend vía DataContext (recargarPersonal/Residentes/Contratos/Reservas).
 * El frontend ahora muestra los datos reales de la DB, no los mock.
 *
 * Se comunica con
 * - DataContext.tsx (inicializa el estado global con estos datos)
 * - AuthContext.tsx (usa los perfiles de usuario)
 *
 * Cambios para Backend
 * Personal, Residentes, Contratos y Reservas (admin) ya se eliminaron de este
 * archivo porque DataContext los carga desde la API (recargar*). Los datos que
 * aquí se mantienen se migrarán a la API en la misma medida que se vayan
 * conectando sus páginas.
 *
 * ============================================================================
 */

import type {
  Area, Reserva, Visitante, Pago,
  ActivityItem, AlertaItem, NotificationItem, ProfileData, AreaInquilino
} from '../types';

// ==================== ADMIN SAMPLE DATA ====================

export const initialAreasData: Area[] = [
  {
    id: 1, nombre: 'Salón Social', capacidad: '50',
    hora_inicio: '08:00', hora_fin: '22:00',
    costo: '₡20/h',
    imagen: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=80',
    estado: 'Disponible',
  },
  {
    id: 2, nombre: 'Piscina', capacidad: '30',
    hora_inicio: '06:00', hora_fin: '20:00',
    costo: '₡10/h',
    imagen: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=400&q=80',
    estado: 'Mantenimiento',
  },
  {
    id: 3, nombre: 'Gimnasio', capacidad: '15',
    hora_inicio: '00:00', hora_fin: '23:59',
    costo: 'Incluido',
    imagen: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
    estado: 'Disponible',
  },
];

export const initialPagosData: Pago[] = [
  {
    id: 1, residente: 'María Pérez',
    concepto: 'Contrato #101', monto: '₡450',
    fecha: '2025-04-10', metodo: 'Transferencia',
    estado: 'Pagado',
  },
  {
    id: 2, residente: 'Carlos Gómez',
    concepto: 'Reserva de Piscina', monto: '₡300',
    fecha: '2025-04-09', metodo: 'Efectivo',
    estado: 'Pendiente',
  },
];

// ==================== GUARDIA SAMPLE DATA ====================

export const visitasData: Visitante[] = [
  {
    id: 1, nombre_completo: 'Juan Pérez',
    documento_identidad: '1-2345-6789', placa: 'ABC-123',
    fecha_autorizacion: '2026-07-20 10:30',
    estado: 'Pendiente', autoriza: 'María Fernández',
    departamento: '3B',
  },
  {
    id: 2, nombre_completo: 'Empresa Eléctrica S.A.',
    documento_identidad: '2-3456-7890', placa: 'XYZ-789',
    fecha_autorizacion: '2026-07-20 11:15',
    estado: 'Pendiente', autoriza: 'Carlos Gómez',
    departamento: '101',
  },
  {
    id: 3, nombre_completo: 'Laura Jiménez',
    documento_identidad: '3-4567-8901', placa: 'DEF-456',
    fecha_autorizacion: '2026-07-20 09:00',
    estado: 'Pendiente', autoriza: 'Ana Martínez',
    departamento: '2C',
  },
  {
    id: 4, nombre_completo: 'Mantenimiento Express',
    documento_identidad: '4-5678-9012', placa: 'GHI-789',
    fecha_autorizacion: '2026-07-20 14:00',
    estado: 'Rechazado', autoriza: 'Luis Torres',
    departamento: '5A',
    motivo_rechazo: 'No se presentó dentro del horario autorizado',
  },
  {
    id: 5, nombre_completo: 'Pedro Ramírez',
    documento_identidad: '5-6789-0123', placa: 'JKL-012',
    fecha_autorizacion: '2026-07-20 16:30',
    estado: 'Pendiente', autoriza: 'Andrés Mora',
    departamento: '402',
  },
  {
    id: 6, nombre_completo: 'Sofía Castro',
    documento_identidad: '6-7890-1234', placa: 'MNO-345',
    fecha_autorizacion: '2026-07-20 08:00',
    estado: 'Autorizado',
    autoriza: 'Sofía Castro (ella misma)',
    departamento: '301',
  },
];

// ==================== INQUILINO SAMPLE DATA ====================

export const areasDisponibles: AreaInquilino[] = [
  {
    id: 1, nombre: 'Piscina',
    imagen: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&q=80',
    capacidad: 25, horario_inicio: 6, horario_fin: 22,
    costo_por_hora: 3000, disponible: true,
  },
  {
    id: 2, nombre: 'Salón Social',
    imagen: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80',
    capacidad: 50, horario_inicio: 8, horario_fin: 23,
    costo_por_hora: 5000, disponible: true,
  },
  {
    id: 3, nombre: 'Gimnasio',
    imagen: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
    capacidad: 15, horario_inicio: 0, horario_fin: 24,
    costo_por_hora: 2000, disponible: true,
  },
  {
    id: 4, nombre: 'Cancha de Fútbol',
    imagen: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80',
    capacidad: 30, horario_inicio: 6, horario_fin: 22,
    costo_por_hora: 4000, disponible: false,
  },
];

export const inquilinoReservas: Reserva[] = [
  {
    id: 1, area: 'Piscina',
    fecha: '2026-07-05', hora_inicio: '15:00',
    hora_fin: '17:00', personas: 4,
    estado: 'Confirmada', costo: 6000,
    pago_estado: 'Pagado', horas_anticipacion_cancelacion: 1,
  },
  {
    id: 2, area: 'Salón Social',
    fecha: '2026-07-10', hora_inicio: '19:00',
    hora_fin: '22:00', personas: 20,
    estado: 'Pendiente', costo: 15000,
    pago_estado: 'Pendiente', horas_anticipacion_cancelacion: 1,
  },
  {
    id: 3, area: 'Piscina',
    fecha: '2026-12-05', hora_inicio: '09:00',
    hora_fin: '11:00', personas: 4,
    estado: 'Confirmada', costo: 6000,
    pago_estado: 'Pagado', horas_anticipacion_cancelacion: 1,
  },
  {
    id: 4, area: 'Salón Social',
    fecha: '2026-12-12', hora_inicio: '15:00',
    hora_fin: '17:00', personas: 8,
    estado: 'Confirmada', costo: 10000,
    pago_estado: 'Pagado', horas_anticipacion_cancelacion: 1,
  },
  {
    id: 5, area: 'Gimnasio',
    fecha: '2026-12-19', hora_inicio: '19:00',
    hora_fin: '21:00', personas: 3,
    estado: 'Pendiente', costo: 4000,
    pago_estado: 'Pendiente', horas_anticipacion_cancelacion: 1,
  },
  {
    id: 6, area: 'Salón Social',
    fecha: '2026-12-26', hora_inicio: '10:00',
    hora_fin: '12:00', personas: 6,
    estado: 'Confirmada', costo: 10000,
    pago_estado: 'Pagado', horas_anticipacion_cancelacion: 1,
  },
];

export const inquilinoVisitantes: Visitante[] = [
  {
    id: 1, nombre: 'Juan Pérez',
    documento: '1-2345-6789', placa: 'ABC-123',
    hora_esperada: '16:30', estado: 'Pendiente',
  },
  {
    id: 2, nombre: 'María López',
    documento: '2-3456-7890', placa: 'XYZ-789',
    hora_esperada: '10:00', estado: 'Autorizado',
  },
  {
    id: 3, nombre: 'Carlos Gómez',
    documento: '3-4567-8901', placa: '',
    hora_esperada: '14:00', estado: 'Rechazado',
    motivo_rechazo:
      'No coincide con la información proporcionada por el residente',
  },
];

// ==================== ACTIVITY / ALERTAS / NOTIFICATIONS ====================

export function getInitialActivityLog(): ActivityItem[] {
  const now = Date.now();
  return [
    {
      id: now,
      descripcion:
        'Se creó una nueva área común: <strong>Jardín</strong>',
      icono: 'fa-plus-circle', color: 'var(--accent)',
      fecha: '20 jul 2026', hora: '10:30', timestamp: now - 60000,
    },
    {
      id: now + 1,
      descripcion:
        'Se editó el contrato #105 de <strong>Carlos Gómez</strong>',
      icono: 'fa-edit', color: 'var(--success)',
      fecha: '20 jul 2026', hora: '09:15', timestamp: now - 120000,
    },
    {
      id: now + 2,
      descripcion:
        'Se registró un nuevo residente: <strong>Ana Torres</strong>',
      icono: 'fa-user-plus', color: 'var(--warning)',
      fecha: '20 jul 2026', hora: '08:45', timestamp: now - 180000,
    },
    {
      id: now + 3,
      descripcion:
        'Se modificó el horario de la <strong>Piscina</strong>',
      icono: 'fa-clock', color: 'var(--error)',
      fecha: '20 jul 2026', hora: '08:00', timestamp: now - 360000,
    },
    {
      id: now + 4,
      descripcion:
        'Se registró un pago manual de <strong>₡450</strong> '
        + 'de <strong>María Pérez</strong>',
      icono: 'fa-credit-card', color: 'var(--success)',
      fecha: '19 jul 2026', hora: '16:30', timestamp: now - 86400000,
    },
  ];
}

export function getInitialAlertas(): AlertaItem[] {
  const now = Date.now();
  return [
    {
      id: now,
      descripcion:
        'Contrato de <strong>Carlos Gómez</strong> '
        + '(201) vence en 3 días',
      prioridad: 'Alta', icono: 'fa-exclamation-triangle',
      color: 'var(--error)',
      fecha: '20 jul 2026', timestamp: now - 60000,
    },
    {
      id: now + 1,
      descripcion:
        'Pago pendiente de <strong>Laura Fernández</strong> '
        + '(202) · ₡300',
      prioridad: 'Media', icono: 'fa-exclamation-circle',
      color: 'var(--warning)',
      fecha: '20 jul 2026', timestamp: now - 120000,
    },
    {
      id: now + 2,
      descripcion:
        'Área <strong>Salón Social</strong> '
        + 'fuera de servicio por reparación',
      prioridad: 'Alta', icono: 'fa-wrench',
      color: 'var(--error)',
      fecha: '20 jul 2026', timestamp: now - 360000,
    },
  ];
}

export function getInitialAdminNotifications(): NotificationItem[] {
  const now = Date.now();
  return [
    {
      id: 1, title: 'Nueva reserva',
      message:
        'María Pérez registró una reserva para el Salón Social',
      time: '10:30', read: false,
      icon: 'fa-calendar-plus', timestamp: now - 60000,
    },
    {
      id: 2, title: 'Nuevo pago',
      message: 'Carlos Gómez realizó un pago de ₡450',
      time: '09:45', read: false,
      icon: 'fa-credit-card', timestamp: now - 180000,
    },
    {
      id: 3, title: 'Nuevo residente',
      message: 'Se registró a Luis Torres como nuevo residente',
      time: '08:20', read: false,
      icon: 'fa-user-plus', timestamp: now - 360000,
    },
  ];
}

export function getInitialGuardiaNotifications(): NotificationItem[] {
  const now = Date.now();
  return [
    {
      id: 1, title: 'Nueva visita esperada',
      message:
        'Juan Pérez tiene visita programada para las 10:30',
      time: '09:00', read: false,
      icon: 'fa-user-friends', timestamp: now - 60000,
    },
    {
      id: 2, title: 'Visita autorizada',
      message:
        'María López fue autorizada para ingresar',
      time: '08:45', read: false,
      icon: 'fa-check-circle', timestamp: now - 180000,
    },
    {
      id: 3, title: 'Actualización de horario',
      message:
        'El horario de visitas ha sido actualizado',
      time: '08:00', read: false,
      icon: 'fa-clock', timestamp: now - 360000,
    },
  ];
}

export function getInitialInquilinoNotifications(): NotificationItem[] {
  const now = Date.now();
  return [
    {
      id: 1, title: 'Visitante ingresó',
      message:
        'Su visitante Juan Pérez ingresó al condominio.',
      time: 'hace 5 min', read: false,
      icon: 'fa-check-circle', timestamp: now - 300000,
    },
    {
      id: 2, title: 'Reserva confirmada',
      message:
        'Su reserva de la Piscina fue confirmada para hoy',
      time: 'hace 15 min', read: false,
      icon: 'fa-check-circle', timestamp: now - 900000,
    },
    {
      id: 3, title: 'Recordatorio de cancelación',
      message:
        'Tiene hasta las 3:00 PM para cancelar su reserva',
      time: 'hace 1 h', read: false,
      icon: 'fa-clock', timestamp: now - 3600000,
    },
  ];
}

// ==================== PROFILE DATA ====================

export const adminProfile: ProfileData = {
  nombre: 'Administrador',
  correo: 'admin@condominio.com',
  telefono: '+506 8888-9999',
  password: 'admin123',
  avatar: ''
};

export const guardiaProfile: ProfileData = {
  nombre: 'Guarda',
  correo: 'guarda@condominio.com',
  telefono: '+506 7777-8888',
  password: 'guardia123',
  avatar: ''
};

export const inquilinoProfile: ProfileData = {
  nombre: 'Jeremy',
  correo: 'jeremy@condominio.com',
  telefono: '+506 6666-7777',
  password: 'jeremy123',
  avatar: ''
};
