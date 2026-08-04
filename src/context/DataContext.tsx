/**
 * ============================================================================
 * Archivo: DataContext.tsx
 * ============================================================================
 *
 * NOTA (cambio - protección de rutas con JWT):
 * Este provider se comunica con el backend usando el cliente compartido `api`
 * (services/apiClient.ts) en lugar de fetch() crudo. Razones:
 *
 * 1. Las rutas de /api/personal, /residentes, /contratos y /reservas ahora exigen
 *    un token JWT (middlewares authenticateToken + validateSessionAndSetContext
 *    + authorizeRole('Administrador')). El api client adjunta automáticamente el
 *    header `Authorization: Bearer <token>` en cada petición.
 * 2. Si la sesión expira (respuesta 401), el api client limpia el localStorage y
 *    redirige a /login automáticamente (sin bucles: login/register no envían token).
 * 3. Ya NO se envía `id_usuario_actual` desde el cliente: el backend lo toma del
 *    token firmado (req.user.id_usuario), así un atacante no puede suplantar a
 *    otro administrador inventando un id.
 *
 * Antes: fetch(`${API_URL}/personal?id_usuario_actual=...`) sin token -> tras
 * proteger las rutas, esas llamadas habrían respondido 401 y la app se habría roto.
 * ============================================================================
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type {
  Area, Reserva, Visitante, Personal, Residente, Contrato, Departamento, Pago,
  ActivityItem, AlertaItem, NotificationItem, AreaInquilino, UserRole
} from '../types';
// NOTA (cambio): Personal, Residentes, Contratos y Reservas (admin) ya se cargan
// desde el backend (recargarPersonal/Residentes/Contratos/Reservas), por eso ya
// NO se importan sus datos mock de sampleData.ts.
import {
  initialAreasData, initialPagosData,
  visitasData, areasDisponibles, inquilinoReservas, inquilinoVisitantes,
  getInitialActivityLog, getInitialAlertas,
  getInitialAdminNotifications, getInitialGuardiaNotifications, getInitialInquilinoNotifications
} from '../data/sampleData';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/apiClient';

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
  inquilinoReservasData: Reserva[];
  setInquilinoReservas: React.Dispatch<React.SetStateAction<Reserva[]>>;
  inquilinoVisitantesData: Visitante[];
  setInquilinoVisitantes: React.Dispatch<React.SetStateAction<Visitante[]>>;
  activityLog: ActivityItem[];
  alertas: AlertaItem[];
  adminNotifications: NotificationItem[];
  guardiaNotifications: NotificationItem[];
  inquilinoNotifications: NotificationItem[];

  addActivity: (descripcion: string, icono?: string, color?: string) => void;
  addAlerta: (descripcion: string, prioridad: string, icono?: string, color?: string) => void;
  addNotification: (role: UserRole, titulo: string, mensaje: string, icono?: string) => void;
  markAsRead: (role: UserRole, id: number) => void;
  markAllRead: (role: UserRole) => void;

  // Personal CRUD
  crearPersonal: (nombre: string, correo: string, contrasena: string, telefono: string, cedula: string, correoContacto?: string) => Promise<void>;
  editarPersonal: (id_usuario: number, nombre: string, correo: string, telefono: string, cedula: string, correoContacto?: string) => Promise<void>;
  cambiarEstadoPersonal: (id_usuario: number, activar: boolean) => Promise<void>;

  // Residentes CRUD
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
  // NOTA (cambio): Personal, Residentes, Contratos y Reservas (admin) se cargan
  // desde el backend al montar el provider (recargar*). Se inicializan vacíos y
  // se reemplazan con los datos reales de la DB; el mock de sampleData ya no se usa.
  const [areasData, setAreasData] = useState<Area[]>(initialAreasData);
  const [personalData, setPersonalData] = useState<Personal[]>([]);
  const [residentesData, setResidentesData] = useState<Residente[]>([]);
  const [contratosData, setContratosData] = useState<Contrato[]>([]);
  const [departamentosData, setDepartamentosData] = useState<Departamento[]>([]);
  const [pagosData] = useState<Pago[]>(initialPagosData);
  const [adminReservas, setReservasData] = useState<Reserva[]>([]);
  const [visitas] = useState<Visitante[]>(visitasData);
  const [areasDisponiblesData] = useState<AreaInquilino[]>(areasDisponibles);
  const [inquilinoReservasData, setInquilinoReservas] = useState<Reserva[]>(inquilinoReservas);
  const [inquilinoVisitantesData, setInquilinoVisitantes] = useState<Visitante[]>(inquilinoVisitantes);
  
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(getInitialActivityLog);
  const [alertas, setAlertas] = useState<AlertaItem[]>(getInitialAlertas);
  const [adminNotifications, setAdminNotifications] = useState<NotificationItem[]>(getInitialAdminNotifications);
  const [guardiaNotifications, setGuardiaNotifications] = useState<NotificationItem[]>(getInitialGuardiaNotifications);
  const [inquilinoNotifications, setInquilinoNotifications] = useState<NotificationItem[]>(getInitialInquilinoNotifications);

  // El id_usuario SIEMPRE es el del administrador autenticado (nunca un id fijo):
  // el SP valida el rol contra este id real y rechaza cualquier otro.
  const { usuario, verificacion2FA } = useAuth();
  const idAdminActual = usuario?.idUsuario;

  // --- Personal CRUD ---
  const recargarPersonal = useCallback(async () => {
    // Nunca disparar sin sesión: requiere token JWT de admin autenticado.
    if (!idAdminActual) return;
    try {
      // El api client adjunta el Bearer token automáticamente y redirige a /login si expira.
      const data = await api.get<PersonalRaw[]>('/personal');

      if (!Array.isArray(data)) {
        console.error('Error del backend al obtener personal:', data);
        return;
      }

      const transformed = data.map((row: PersonalRaw) => ({
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
    // NOTA (cambio): la contraseña SIEMPRE la escribe el admin en el formulario
    // (nunca un valor fijo); el backend la hashea con bcrypt ANTES de guardarla.
    // El id_usuario_actual ahora lo toma el backend del JWT (req.user).
    // correo_contacto: correo real donde Admin/Guarda reciben el código 2FA.
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
      // El api client adjunta el Bearer token automáticamente y redirige a /login si expira.
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
    // NOTA (cambio): la contraseña la escribe el admin en el formulario (nunca un
    // valor fijo); el backend la hashea con bcrypt ANTES de guardarla.
    // El id_usuario_actual ahora lo toma el backend del JWT (req.user).
    await api.post('/residentes', {
      nombre_completo: nombre,
      correo,
      contrasena,
      telefono,
      cedula
    });

    await recargarResidentes();
  }, [recargarResidentes]);

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
  // NOTA: recargarDepartamentos se define ANTES de recargarContratos porque
  // ese callback lo invoca para mantener los estados (Disponible/Ocupado) al
  // día con el ciclo de vida del contrato.
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
      // El api client adjunta el Bearer token automáticamente y redirige a /login si expira.
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
        // Montos: se rellenan con 0 si la vista aún no los expone.
        monto_mensual: row.monto_mensual ?? 0,
        monto_deposito: row.monto_deposito ?? 0
      }));

      setContratosData(transformed);

      // Sincronización de departamentos: el ciclo de vida del contrato cambia
      // el estado del departamento (Ocupado al crear, Disponible al finalizar
      // por fecha_fin). Al recargar contratos se recargan también los
      // departamentos para que el módulo quede al día SIN necesidad de
      // refrescar la página.
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
    // El id_usuario_actual lo toma el backend del JWT (req.user); el SP
    // sp_Contrato_Insertar busca al inquilino por CÉDULA y asigna el
    // departamento por su NÚMERO (no por id).
    await api.post('/contratos', datos);

    await recargarContratos();
    await recargarResidentes();
  }, [recargarContratos, recargarResidentes]);

  const editarContrato = useCallback(async (
    id_contrato: number,
    datos: {
      fecha_inicio: string;
      fecha_fin: string;
      monto_mensual: number;
      monto_deposito: number;
    }
  ) => {
    // NOTA: el departamento NO se edita en el contrato (se asigna solo al crear).
    await api.put(`/contratos/${id_contrato}`, datos);

    await recargarContratos();
    // Recarga residentes también: si al recargar contratos la auto-finalización
    // (fecha_fin vencida) cambió el contrato del inquilino, su estado_contrato
    // en el módulo de residentes queda al día sin refrescar la página.
    await recargarResidentes();
  }, [recargarContratos, recargarResidentes]);

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
      // El api client adjunta el Bearer token automáticamente y redirige a /login si expira.
      const data = await api.get<ReservaRaw[]>('/reservas');

      if (!Array.isArray(data)) {
        console.error('Error del backend al obtener reservas:', data);
        setReservasData([]);
        return;
      }

      const transformed: Reserva[] = data.map((row: ReservaRaw) => {
        const rawFecha = row.fecha || row.fecha_reserva || '';
        const fechaFormateada = rawFecha ? String(rawFecha).split('T')[0] : '';

        // Formateo de hora: Recorta cadenas de microsegundos de SQL Server ("14:00:00.0000000" -> "14:00")
        const hInicio = row.hora_inicio ? String(row.hora_inicio).slice(0, 5) : '';
        const hFin = row.hora_fin ? String(row.hora_fin).slice(0, 5) : '';
        const horarioFormateado = hInicio && hFin ? `${hInicio} - ${hFin}` : (hInicio || '-');

        return {
          id: row.id || row.id_reserva || 0,
          area: row.area || row.nombre_area || 'Área Común',
          residente: row.residente || row.nombre_residente || row.nombre_completo || 'Sin asignar',
          fecha: fechaFormateada,
          hora: horarioFormateado,
          estado: row.estado || 'Confirmada',
          personas: row.cantidad_personas ?? row.personas ?? 1
        } as unknown as Reserva;
      });

      setReservasData(transformed);
    } catch (err) {
      console.error('Error de red al recargar reservas:', err);
      setReservasData([]);
    }
  }, [idAdminActual]);

  const crearReserva = useCallback(async (dto: CrearReservaDTO) => {
    // El id_usuario_actual ahora lo toma el backend del JWT (req.user).
    await api.post('/reservas', dto);

    await recargarReservas();
  }, [recargarReservas]);

  const editarReserva = useCallback(async (id_reserva: number, dto: EditarReservaDTO) => {
    await api.put(`/reservas/${id_reserva}`, dto);

    await recargarReservas();
  }, [recargarReservas]);

  const cancelarReserva = useCallback(async (id_reserva: number) => {
    await api.patch(`/reservas/${id_reserva}/cancelar`);

    await recargarReservas();
  }, [recargarReservas]);

  // --- Carga Inicial ---
  useEffect(() => {
    // No cargar datos hasta que la sesión esté restaurada Y el 2FA esté
    // verificado: con el token temporal (2faVerified: false) el backend responde
    // 403 "Se requiere la verificación 2FA". Al completar el 2FA, verificacion2FA
    // cambia a true y el efecto se re-ejecuta con el token definitivo.
    if (!usuario || !verificacion2FA) return;

    // La carga inicial de datos al montar el provider es intencional: los
    // recargar* solo actualizan el estado en continuaciones asíncronas
    // (después del await de la API), nunca de forma síncrona en el efecto.
    // La regla react-hooks/set-state-in-effect es conservadora y la marca.
    /* eslint-disable react-hooks/set-state-in-effect */
    recargarPersonal();
    recargarResidentes();
    recargarContratos();
    recargarDepartamentos();
    recargarReservas();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [usuario, verificacion2FA, recargarPersonal, recargarResidentes, recargarContratos, recargarDepartamentos, recargarReservas]);

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
      areasDisponiblesData,
      inquilinoReservasData, setInquilinoReservas,
      inquilinoVisitantesData, setInquilinoVisitantes,
      activityLog, alertas,
      adminNotifications, guardiaNotifications, inquilinoNotifications,
      addActivity, addAlerta, addNotification,
      markAsRead, markAllRead,
      crearPersonal, editarPersonal, cambiarEstadoPersonal,
      crearResidente, editarResidente, cambiarEstadoResidente,
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