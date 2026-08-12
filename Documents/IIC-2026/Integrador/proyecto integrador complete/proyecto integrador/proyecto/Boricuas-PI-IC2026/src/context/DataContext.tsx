/**
 * ============================================================================
 * Archivo: DataContext.tsx
 * ============================================================================
 *
 * NOTA (protección de rutas con JWT):
 * Este provider se comunica con el backend usando el cliente compartido `api`
 * (services/apiClient.ts) en lugar de fetch() crudo. Razones:
 *
 * 1. Las rutas exigen token JWT (Authorization: Bearer <token>).
 * 2. Si la sesión expira (401), limpia localStorage y redirige a /login.
 * 3. `id_usuario_actual` lo deduce el backend del JWT (req.user.id_usuario).
 * ============================================================================
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type {
  Area, Reserva, Visitante, Personal, Residente, Contrato, Departamento, Pago,
  ActivityItem, AlertaItem, NotificationItem, AreaInquilino, UserRole
} from '../types';
import {
  initialAreasData, initialPagosData,
  visitasData, areasDisponibles, inquilinoReservas, inquilinoVisitantes,
  getInitialActivityLog, getInitialAlertas,
  getInitialAdminNotifications, getInitialGuardiaNotifications, getInitialInquilinoNotifications
} from '../data/sampleData';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/apiClient';
import { inquilinoService, type AreaInquilinoRaw } from '../services/inquilinoService';
import { toDateOnly, toTimeOnly } from '../hooks/useLocalDate';

interface PersonalRaw {
  id_usuario: number;
  nombre_completo: string;
  correo: string;
  correo_contacto?: string | null;
  telefono: string;
  cedula: string;
  activo: boolean;
}

interface ResidenteRaw {
  id_usuario: number;
  nombre_completo: string;
  correo: string;
  telefono: string;
  cedula: string;
  departamento?: string;
  estado_contrato?: string;
  activo: boolean;
}

interface DepartamentoRaw {
  id_departamento: number;
  numero: string;
  piso?: number | null;
  metros_cuadrados?: number | null;
  estado: string;
  activo: boolean | number;
  fecha_registro?: string;
}

interface ContratoRaw {
  id_contrato: number;
  id_usuario: number;
  residente: string;
  id_departamento: number;
  departamento: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  monto_mensual?: number;
  monto_deposito?: number;
  fecha_registro?: string;
}

interface ReservaRaw {
  id_reserva?: number;
  id?: number;
  area?: string;
  nombre_area?: string;
  residente?: string;
  nombre_residente?: string;
  nombre_completo?: string;
  fecha?: string;
  fecha_reserva?: string;
  hora_inicio?: string;
  hora_fin?: string;
  estado?: string;
  cantidad_personas?: number;
  personas?: number;
  costo?: number;
  estado_pago?: string;
}

export interface CrearReservaDTO {
  id_area: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  cantidad_personas: number;
}

export interface EditarReservaDTO {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  cantidad_personas: number;
}

// --- Interfaces para el Dashboard ---
export interface DashboardKPIs {
  reservas_hoy: number;
  visitas_registradas: number;
  contratos_activos: number;
  areas_ocupadas: number;
  ingresos_del_dia: number; // antes: ingresos_dia (no coincidía con el backend, siempre daba 0/₡0)
}

export interface DashboardData {
  kpis: DashboardKPIs;
  proximasReservas: unknown[];
  alertas: unknown[]; // antes faltaba este campo: se perdía aunque el backend lo mandara
  actividadReciente: unknown[];
}

interface DashboardApiResponse {
  status?: string;
  data?: DashboardData;
  kpis?: DashboardKPIs;
  proximasReservas?: unknown[];
  alertas?: unknown[];
  actividadReciente?: unknown[];
}

interface DataContextType {
  areasData: Area[];
  setAreasData: React.Dispatch<React.SetStateAction<Area[]>>;
  personalData: Personal[];
  residentesData: Residente[];
  contratosData: Contrato[];
  departamentosData: Departamento[];
  pagosData: Pago[];
  reservasData: Reserva[];
  visitas: Visitante[];
  areasDisponiblesData: AreaInquilino[];
  recargarAreasDisponibles: () => Promise<void>;
  inquilinoReservasData: Reserva[];
  setInquilinoReservas: React.Dispatch<React.SetStateAction<Reserva[]>>;
  recargarReservasInquilino: () => Promise<void>;
  inquilinoVisitantesData: Visitante[];
  setInquilinoVisitantes: React.Dispatch<React.SetStateAction<Visitante[]>>;
  recargarVisitantesInquilino: () => Promise<void>;
  activityLog: ActivityItem[];
  alertas: AlertaItem[];
  adminNotifications: NotificationItem[];
  guardiaNotifications: NotificationItem[];
  inquilinoNotifications: NotificationItem[];

  // Dashboard State & Method
  dashboardData: DashboardData | null;
  recargarDashboard: () => Promise<void>;

  addActivity: (descripcion: string, icono?: string, color?: string) => void;
  addAlerta: (descripcion: string, prioridad: string, icono?: string, color?: string) => void;
  addNotification: (role: UserRole, titulo: string, mensaje: string, icono?: string) => void;
  markAsRead: (role: UserRole, id: number) => void;
  markAllRead: (role: UserRole) => void;

  // Personal CRUD
  recargarPersonal: () => Promise<void>;
  crearPersonal: (nombre: string, correo: string, contrasena: string, telefono: string, cedula: string, correoContacto?: string) => Promise<void>;
  editarPersonal: (id_usuario: number, nombre: string, correo: string, telefono: string, cedula: string, correoContacto?: string) => Promise<void>;
  cambiarEstadoPersonal: (id_usuario: number, activar: boolean) => Promise<void>;

  // Residentes CRUD
  recargarResidentes: () => Promise<void>;
  crearResidente: (nombre: string, correo: string, contrasena: string, telefono: string, cedula: string) => Promise<void>;
  editarResidente: (id_usuario: number, nombre: string, correo: string, telefono: string, cedula: string) => Promise<void>;
  cambiarEstadoResidente: (id_usuario: number, activar: boolean) => Promise<void>;

  // Contratos CRUD
  recargarContratos: () => Promise<void>;
  crearContrato: (datos: { cedula: string; numero_departamento: string; fecha_inicio: string; fecha_fin: string; monto_mensual: number; monto_deposito: number }) => Promise<void>;
  editarContrato: (id_contrato: number, datos: { fecha_inicio: string; fecha_fin: string; monto_mensual: number; monto_deposito: number }) => Promise<void>;

  // Departamentos CRUD
  recargarDepartamentos: () => Promise<void>;
  crearDepartamento: (numero: string, piso: number | null, metrosCuadrados: number | null) => Promise<void>;
  editarDepartamento: (id_departamento: number, numero: string, piso: number | null, metrosCuadrados: number | null) => Promise<void>;
  cambiarEstadoDepartamento: (id_departamento: number, activar: boolean) => Promise<void>;

  // Reservas CRUD / Consulta
  recargarReservas: () => Promise<void>;
  crearReserva: (dto: CrearReservaDTO) => Promise<void>;
  editarReserva: (id_reserva: number, dto: EditarReservaDTO) => Promise<void>;
  cancelarReserva: (id_reserva: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [areasData, setAreasData] = useState<Area[]>(initialAreasData);
  const [personalData, setPersonalData] = useState<Personal[]>([]);
  const [residentesData, setResidentesData] = useState<Residente[]>([]);
  const [contratosData, setContratosData] = useState<Contrato[]>([]);
  const [departamentosData, setDepartamentosData] = useState<Departamento[]>([]);
  const [pagosData] = useState<Pago[]>(initialPagosData);
  const [adminReservas, setReservasData] = useState<Reserva[]>([]);
  const [visitas] = useState<Visitante[]>(visitasData);
  const [areasDisponiblesData, setAreasDisponibles] = useState<AreaInquilino[]>(areasDisponibles);
  const [inquilinoReservasData, setInquilinoReservas] = useState<Reserva[]>(inquilinoReservas);
  const [inquilinoVisitantesData, setInquilinoVisitantes] = useState<Visitante[]>(inquilinoVisitantes);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(getInitialActivityLog);
  const [alertas, setAlertas] = useState<AlertaItem[]>(getInitialAlertas);
  const [adminNotifications, setAdminNotifications] = useState<NotificationItem[]>(getInitialAdminNotifications);
  const [guardiaNotifications, setGuardiaNotifications] = useState<NotificationItem[]>(getInitialGuardiaNotifications);
  const [inquilinoNotifications, setInquilinoNotifications] = useState<NotificationItem[]>(getInitialInquilinoNotifications);
  const { usuario, verificacion2FA } = useAuth();
  const idAdminActual = usuario?.idUsuario;

  // --- Reservas / Visitantes del Inquilino (rol Inquilino) ---
  const recargarReservasInquilino = useCallback(async () => {
    if (!usuario || usuario.rol !== 'Inquilino') return;

    try {
      const data = await inquilinoService.obtenerMisReservas();

      if (!Array.isArray(data)) {
        console.error('Error del backend al obtener reservas del inquilino:', data);
        return;
      }

      const transformed: Reserva[] = data.map((r) => ({
        id: r.id_reserva,
        area: r.area,
        fecha: toDateOnly(r.fecha),
        hora_inicio: toTimeOnly(r.hora_inicio),
        hora_fin: toTimeOnly(r.hora_fin),
        estado: r.estado as Reserva['estado'],
        personas: r.cantidad_personas,
        costo: r.costo,
        pago_estado: r.estado_pago,
      }));

      setInquilinoReservas(transformed);
    } catch (err) {
      console.error('Error de red al recargar reservas del inquilino:', err);
    }
  }, [usuario]);

  const recargarVisitantesInquilino = useCallback(async () => {
    if (!usuario || usuario.rol !== 'Inquilino') return;

    try {
      const data = await inquilinoService.obtenerVisitantes();

      if (!Array.isArray(data)) {
        console.error('Error del backend al obtener visitantes del inquilino:', data);
        return;
      }

      const transformed: Visitante[] = data.map((v) => ({
        id: v.id_visitante,
        nombre: v.nombre_completo,
        documento: v.documento_identidad,
        placa: v.placa ?? '',
        hora_esperada: v.hora_esperada ? toTimeOnly(v.hora_esperada) : '',
        estado: v.estado,
        motivo_rechazo: v.motivo_rechazo ?? undefined,
      }));

      setInquilinoVisitantes(transformed);
    } catch (err) {
      console.error('Error de red al recargar visitantes del inquilino:', err);
    }
  }, [usuario]);

  const recargarAreasDisponibles = useCallback(async () => {
    if (!usuario || usuario.rol !== 'Inquilino') return;

    try {
      const data = await inquilinoService.obtenerAreasDisponibles();

      if (!Array.isArray(data)) {
        console.error('Error del backend al obtener áreas disponibles:', data);
        return;
      }

      const transformed: AreaInquilino[] = data.map((a: AreaInquilinoRaw) => ({
        id: a.id_area,
        nombre: a.nombre,
        imagen: a.foto_principal || '/img/area-placeholder.jpg',
        capacidad: a.capacidad_max,
        horario_inicio: new Date(a.hora_apertura).getUTCHours(),
        horario_fin: new Date(a.hora_cierre).getUTCHours(),
        costo_por_hora: a.costo_por_hora,
        disponible: a.estado === 'Disponible',
      }));

      setAreasDisponibles(transformed);
    } catch (err) {
      console.error('Error de red al recargar áreas disponibles:', err);
    }
  }, [usuario]);

  // --- Dashboard Consulta ---
  const recargarDashboard = useCallback(async () => {
    if (!idAdminActual) return;

    try {
      const res = await api.get<DashboardApiResponse>('/dashboard');

      if (res && res.data) {
        setDashboardData(res.data);
      } else if (res && res.kpis) {
        setDashboardData({
          kpis: res.kpis,
          proximasReservas: res.proximasReservas ?? [],
          alertas: res.alertas ?? [],
          actividadReciente: res.actividadReciente ?? []
        });
      }
    } catch (err) {
      console.error('Error de red al recargar el dashboard:', err);
    }
  }, [idAdminActual]);

  // --- Personal CRUD ---
  const recargarPersonal = useCallback(async () => {
    if (!idAdminActual) return;
    try {
      const data = await api.get<PersonalRaw[]>('/personal');

      if (!Array.isArray(data)) {
        console.error('Error del backend al obtener personal:', data);
        return;
      }

      const transformed: Personal[] = data.map((row: PersonalRaw) => ({
        id_usuario: row.id_usuario,
        nombre: row.nombre_completo,
        correo: row.correo,
        correoContacto: row.correo_contacto || '',
        telefono: row.telefono,
        cedula: row.cedula,
        dominio: row.correo?.split('@')[1] || '',
        iniciales: row.nombre_completo?.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) || '',
        estado: row.activo ? 'Activo' : 'Inactivo'
      }));
      setPersonalData(transformed);
    } catch (err) {
      console.error('Error de red al recargar personal:', err);
    }
  }, [idAdminActual]);

  const crearPersonal = useCallback(async (nombre: string, correo: string, contrasena: string, telefono: string, cedula: string, correoContacto?: string) => {
    await api.post('/personal', { nombre_completo: nombre, correo, correo_contacto: correoContacto || null, contrasena, telefono, cedula, foto_perfil: null });
    await recargarPersonal();
  }, [recargarPersonal]);

  const editarPersonal = useCallback(async (id_usuario: number, nombre: string, correo: string, telefono: string, cedula: string, correoContacto?: string) => {
    await api.put(`/personal/${id_usuario}`, { nombre_completo: nombre, correo, correo_contacto: correoContacto || null, telefono, cedula, foto_perfil: null });
    await recargarPersonal();
  }, [recargarPersonal]);

  const cambiarEstadoPersonal = useCallback(async (id_usuario: number, activar: boolean) => {
    const accion = activar ? 'reactivar' : 'desactivar';
    await api.patch(`/personal/${id_usuario}/${accion}`);
    await recargarPersonal();
  }, [recargarPersonal]);

  // --- Residentes CRUD ---
  const recargarResidentes = useCallback(async () => {
    if (!idAdminActual) return;
    try {
      const data = await api.get<ResidenteRaw[]>('/residentes');

      if (!Array.isArray(data)) {
        console.error('Error del backend al obtener residentes:', data);
        return;
      }

      const transformed: Residente[] = data.map((row: ResidenteRaw) => ({
        id: row.id_usuario,
        nombre: row.nombre_completo,
        departamento: row.departamento || 'Sin asignar',
        correo: row.correo,
        telefono: row.telefono,
        cedula: row.cedula || '',
        contrato_estado: row.estado_contrato || 'Sin Contrato',
        estado: row.activo ? 'Activo' : 'Inactivo'
      }));

      setResidentesData(transformed);
    } catch (err) {
      console.error('Error de red al recargar residentes:', err);
    }
  }, [idAdminActual]);

  const crearResidente = useCallback(async (nombre: string, correo: string, contrasena: string, telefono: string, cedula: string) => {
    await api.post('/residentes', {
      nombre_completo: nombre,
      correo,
      contrasena,
      telefono,
      cedula
    });

    await recargarResidentes();
    await recargarDashboard(); // "Actividad reciente" muestra altas de residentes
  }, [recargarResidentes, recargarDashboard]);

  const editarResidente = useCallback(async (id_usuario: number, nombre: string, correo: string, telefono: string, cedula: string) => {
    await api.put(`/residentes/${id_usuario}`, {
      nombre_completo: nombre,
      correo,
      telefono,
      cedula
    });

    await recargarResidentes();
  }, [recargarResidentes]);

  const cambiarEstadoResidente = useCallback(async (id: number, activo: boolean) => {
    await api.patch(`/residentes/${id}/changeEstadoResidente`, {
      activo: activo ? 1 : 0
    });

    await recargarResidentes();
  }, [recargarResidentes]);

  // --- Departamentos CRUD ---
  const recargarDepartamentos = useCallback(async () => {
    if (!idAdminActual) return;
    try {
      const data = await api.get<DepartamentoRaw[]>('/departamentos');

      if (!Array.isArray(data)) {
        console.error('Error del backend al obtener departamentos:', data);
        return;
      }

      const transformed: Departamento[] = data.map((row: DepartamentoRaw) => ({
        id_departamento: row.id_departamento,
        numero: row.numero,
        piso: row.piso ?? null,
        metros_cuadrados: row.metros_cuadrados ?? null,
        estado: row.estado,
        activo: Boolean(row.activo)
      }));

      setDepartamentosData(transformed);
    } catch (err) {
      console.error('Error de red al recargar departamentos:', err);
    }
  }, [idAdminActual]);

  // --- Contratos CRUD ---
  const recargarContratos = useCallback(async () => {
    if (!idAdminActual) return;
    try {
      const data = await api.get<ContratoRaw[]>('/contratos');

      if (!Array.isArray(data)) {
        console.error('Error del backend al obtener contratos:', data);
        return;
      }

      const transformed: Contrato[] = data.map((row: ContratoRaw) => ({
        id_contrato: row.id_contrato,
        id_usuario: row.id_usuario,
        residente: row.residente,
        id_departamento: row.id_departamento,
        departamento: row.departamento,
        fecha_inicio: row.fecha_inicio?.split('T')[0] || row.fecha_inicio,
        fecha_fin: row.fecha_fin?.split('T')[0] || row.fecha_fin,
        estado: row.estado,
        monto_mensual: row.monto_mensual ?? 0,
        monto_deposito: row.monto_deposito ?? 0
      }));

      setContratosData(transformed);
      await recargarDepartamentos();
    } catch (err) {
      console.error('Error de red al recargar contratos:', err);
    }
  }, [idAdminActual, recargarDepartamentos]);

  const crearContrato = useCallback(async (datos: {
    cedula: string;
    numero_departamento: string;
    fecha_inicio: string;
    fecha_fin: string;
    monto_mensual: number;
    monto_deposito: number;
  }) => {
    await api.post('/contratos', datos);

    await recargarContratos();
    await recargarResidentes();
    await recargarDashboard(); // 🔑 antes faltaba: por esto "Contratos activos" no se actualizaba en la tarjeta
  }, [recargarContratos, recargarResidentes, recargarDashboard]);

  const editarContrato = useCallback(async (
    id_contrato: number,
    datos: {
      fecha_inicio: string;
      fecha_fin: string;
      monto_mensual: number;
      monto_deposito: number;
    }
  ) => {
    await api.put(`/contratos/${id_contrato}`, datos);

    await recargarContratos();
    await recargarResidentes();
    await recargarDashboard(); // las fechas editadas pueden afectar la alerta de "vence en N días"
  }, [recargarContratos, recargarResidentes, recargarDashboard]);

  const crearDepartamento = useCallback(async (numero: string, piso: number | null, metrosCuadrados: number | null) => {
    await api.post('/departamentos', { numero, piso, metros_cuadrados: metrosCuadrados });

    await recargarDepartamentos();
  }, [recargarDepartamentos]);

  const editarDepartamento = useCallback(async (id_departamento: number, numero: string, piso: number | null, metrosCuadrados: number | null) => {
    await api.put(`/departamentos/${id_departamento}`, { numero, piso, metros_cuadrados: metrosCuadrados });

    await recargarDepartamentos();
  }, [recargarDepartamentos]);

  const cambiarEstadoDepartamento = useCallback(async (id_departamento: number, activar: boolean) => {
    const accion = activar ? 'reactivar' : 'desactivar';
    await api.patch(`/departamentos/${id_departamento}/${accion}`);

    await recargarDepartamentos();
  }, [recargarDepartamentos]);

  // --- RESERVAS CONSULTA & CRUD ---
  const recargarReservas = useCallback(async () => {
    if (!idAdminActual) return;
    try {
      const data = await api.get<ReservaRaw[]>('/reservas');

      if (!Array.isArray(data)) {
        console.error('Error del backend al obtener reservas:', data);
        setReservasData([]);
        return;
      }

      const transformed: Reserva[] = data.map((row: ReservaRaw) => {
        const rawFecha = row.fecha || row.fecha_reserva || '';
        const fechaFormateada = rawFecha ? String(rawFecha).split('T')[0] : '';

        const hInicio = row.hora_inicio ? String(row.hora_inicio).slice(0, 5) : '';
        const hFin = row.hora_fin ? String(row.hora_fin).slice(0, 5) : '';
        const horarioFormateado = hInicio && hFin ? `${hInicio} - ${hFin}` : (hInicio || '-');

        return {
          id: row.id || row.id_reserva || 0,
          area: row.area || row.nombre_area || 'Área Común',
          residente: row.residente || row.nombre_residente || row.nombre_completo || 'Sin asignar',
          fecha: fechaFormateada,
          hora: horarioFormateado,
          hora_inicio: hInicio,
          hora_fin: hFin,
          estado: row.estado || 'Confirmada',
          personas: row.cantidad_personas ?? row.personas ?? 1,
          costo: row.costo ?? 0,
          pago_estado: row.estado_pago ?? 'Pendiente'
        };
      });

      setReservasData(transformed);
    } catch (err) {
      console.error('Error de red al recargar reservas:', err);
      setReservasData([]);
    }
  }, [idAdminActual]);

  const crearReserva = useCallback(async (dto: CrearReservaDTO) => {
    await api.post('/reservas', dto);

    await recargarReservas();
    await recargarDashboard(); // afecta reservas_hoy, areas_ocupadas y "Próximas reservas"
  }, [recargarReservas, recargarDashboard]);

  const editarReserva = useCallback(async (id_reserva: number, dto: EditarReservaDTO) => {
    await api.put(`/reservas/${id_reserva}`, dto);

    await recargarReservas();
    await recargarDashboard();
  }, [recargarReservas, recargarDashboard]);

  const cancelarReserva = useCallback(async (id_reserva: number) => {
    await api.patch(`/reservas/${id_reserva}/cancelar`);

    await recargarReservas();
    await recargarDashboard();
  }, [recargarReservas, recargarDashboard]);

  // --- Carga Inicial ---
  useEffect(() => {
    if (!usuario || !verificacion2FA) return;

    // La carga inicial de datos al montar el provider es intencional: los
    // recargar* solo actualizan el estado en continuaciones asíncronas
    // (después del await de la API), nunca de forma síncrona en el efecto.
    // La regla react-hooks/set-state-in-effect es conservadora y la marca.
    /* eslint-disable react-hooks/set-state-in-effect */
    // NOTA (cambio - fix 403 + reservas/visitantes vacías):
    // Antes se llamaban SIEMPRE las 5 rutas de admin sin importar el rol
    // autenticado. authorizeRole('Administrador') las rechazaba con 403 para
    // Guarda/Inquilino, y las reservas/visitantes del inquilino nunca se
    // cargaban desde el backend (quedaban en el mock de sampleData.ts).
    if (usuario.rol === 'Administrador') {
      recargarPersonal();
      recargarResidentes();
      recargarContratos();
      recargarDepartamentos();
      recargarReservas();
      recargarDashboard();
    } else if (usuario.rol === 'Inquilino') {
      recargarReservasInquilino();
      recargarVisitantesInquilino();
      recargarAreasDisponibles();
    }
    // Guarda no necesita ninguna de estas listas por ahora.
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [usuario, verificacion2FA, recargarPersonal, recargarResidentes, recargarContratos, recargarDepartamentos, recargarReservas, recargarDashboard, recargarReservasInquilino, recargarVisitantesInquilino, recargarAreasDisponibles]);

  // --- Helpers Notificaciones / Actividad ---
  const addActivity = useCallback((descripcion: string, icono = 'fa-circle', color = 'var(--accent)') => {
    const now = new Date();
    setActivityLog(prev => [{
      id: Date.now(), descripcion, icono, color,
      fecha: now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' as const }),
      hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.getTime()
    }, ...prev]);
  }, []);

  const addAlerta = useCallback((descripcion: string, prioridad: string, icono = 'fa-exclamation-triangle', color = 'var(--error)') => {
    const now = new Date();
    setAlertas(prev => [{
      id: Date.now(), descripcion, prioridad, icono, color,
      fecha: now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' as const }),
      timestamp: now.getTime()
    }, ...prev]);
  }, []);

  const addNotification = useCallback((role: UserRole, titulo: string, mensaje: string, icono = 'fa-bell') => {
    const now = new Date();
    const newItem: NotificationItem = {
      id: Date.now(), title: titulo, message: mensaje,
      time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      read: false, icon: icono, timestamp: now.getTime()
    };
    if (role === 'admin') setAdminNotifications(prev => [newItem, ...prev]);
    else if (role === 'guardia') setGuardiaNotifications(prev => [newItem, ...prev]);
    else setInquilinoNotifications(prev => [newItem, ...prev]);
  }, []);

  const markAsRead = useCallback((role: UserRole, id: number) => {
    const setter = (prev: NotificationItem[]) => prev.map(n => n.id === id ? { ...n, read: true } : n);
    if (role === 'admin') setAdminNotifications(setter);
    else if (role === 'guardia') setGuardiaNotifications(setter);
    else setInquilinoNotifications(setter);
  }, []);

  const markAllRead = useCallback((role: UserRole) => {
    const setter = (prev: NotificationItem[]) => prev.map(n => ({ ...n, read: true }));
    if (role === 'admin') setAdminNotifications(setter);
    else if (role === 'guardia') setGuardiaNotifications(setter);
    else setInquilinoNotifications(setter);
  }, []);

  return (
    <DataContext.Provider value={{
      areasData, setAreasData,
      personalData,
      residentesData,
      contratosData,
      departamentosData,
      pagosData,
      reservasData: adminReservas,
      visitas,
      areasDisponiblesData, recargarAreasDisponibles,
      inquilinoReservasData, setInquilinoReservas, recargarReservasInquilino,
      inquilinoVisitantesData, setInquilinoVisitantes, recargarVisitantesInquilino,
      activityLog, alertas,
      adminNotifications, guardiaNotifications, inquilinoNotifications,
      dashboardData, recargarDashboard,
      addActivity, addAlerta, addNotification,
      markAsRead, markAllRead,
      recargarPersonal, crearPersonal, editarPersonal, cambiarEstadoPersonal,
      recargarResidentes, crearResidente, editarResidente, cambiarEstadoResidente,
      recargarContratos, crearContrato, editarContrato,
      recargarDepartamentos, crearDepartamento, editarDepartamento, cambiarEstadoDepartamento,
      recargarReservas, crearReserva, editarReserva, cancelarReserva
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}