/**
 * ============================================================================
 * Archivo: DataContext.tsx
 * ============================================================================
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type {
  Area, Reserva, Visitante, Personal, Residente, Contrato, Pago,
  ActivityItem, AlertaItem, NotificationItem, AreaInquilino, UserRole
} from '../types';
import {
  initialAreasData, initialPersonalData, initialResidentesData,
  initialContratosData, initialPagosData, reservasData as sampleReservas,
  visitasData, areasDisponibles, inquilinoReservas, inquilinoVisitantes,
  getInitialActivityLog, getInitialAlertas,
  getInitialAdminNotifications, getInitialGuardiaNotifications, getInitialInquilinoNotifications
} from '../data/sampleData';

interface PersonalRaw {
  id_usuario: number;
  nombre_completo: string;
  correo: string;
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

interface ContratoRaw {
  id_contrato: number;
  id_usuario: number;
  residente: string;
  id_departamento: number;
  departamento: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
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

const ID_ADMIN_ACTUAL = 1003;
const API_URL = 'http://localhost:4000/api';

interface DataContextType {
  areasData: Area[];
  setAreasData: React.Dispatch<React.SetStateAction<Area[]>>;
  personalData: Personal[];
  setPersonalData: React.Dispatch<React.SetStateAction<Personal[]>>;
  residentesData: Residente[];
  setResidentesData: React.Dispatch<React.SetStateAction<Residente[]>>;
  contratosData: Contrato[];
  setContratosData: React.Dispatch<React.SetStateAction<Contrato[]>>;
  pagosData: Pago[];
  reservasData: Reserva[];
  setReservasData: React.Dispatch<React.SetStateAction<Reserva[]>>;
  visitas: Visitante[];
  setVisitas: React.Dispatch<React.SetStateAction<Visitante[]>>;
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
  crearPersonal: (nombre: string, correo: string, telefono: string, cedula: string) => Promise<void>;
  editarPersonal: (id_usuario: number, nombre: string, correo: string, telefono: string, cedula: string) => Promise<void>;
  cambiarEstadoPersonal: (id_usuario: number, activar: boolean) => Promise<void>;

  // Residentes CRUD
  crearResidente: (nombre: string, correo: string, telefono: string, cedula: string) => Promise<void>;
  editarResidente: (id_usuario: number, nombre: string, correo: string, telefono: string, cedula: string) => Promise<void>;
  cambiarEstadoResidente: (id_usuario: number, activar: boolean) => Promise<void>;

  // Contratos CRUD
  recargarContratos: () => Promise<void>;
  crearContrato: (datos: { id_usuario: number; id_departamento: number; fecha_inicio: string; fecha_fin: string; monto_mensual: number; monto_deposito: number; observaciones?: string }) => Promise<void>;
  editarContrato: (id_contrato: number, datos: { id_departamento: number; fecha_inicio: string; fecha_fin: string; monto_mensual: number; monto_deposito: number; observaciones?: string }) => Promise<void>;
  finalizarContrato: (id_contrato: number) => Promise<void>;

  // Reservas CRUD / Consulta
  recargarReservas: () => Promise<void>;
  crearReserva: (dto: CrearReservaDTO) => Promise<void>;
  editarReserva: (id_reserva: number, dto: EditarReservaDTO) => Promise<void>;
  cancelarReserva: (id_reserva: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [areasData, setAreasData] = useState<Area[]>(initialAreasData);
  const [personalData, setPersonalData] = useState<Personal[]>(initialPersonalData);
  const [residentesData, setResidentesData] = useState<Residente[]>(initialResidentesData);
  const [contratosData, setContratosData] = useState<Contrato[]>(initialContratosData);
  const [pagosData] = useState<Pago[]>(initialPagosData);
  const [adminReservas, setReservasData] = useState<Reserva[]>(sampleReservas);
  const [visitas, setVisitas] = useState<Visitante[]>(visitasData);
  const [areasDisponiblesData] = useState<AreaInquilino[]>(areasDisponibles);
  const [inquilinoReservasData, setInquilinoReservas] = useState<Reserva[]>(inquilinoReservas);
  const [inquilinoVisitantesData, setInquilinoVisitantes] = useState<Visitante[]>(inquilinoVisitantes);
  
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(getInitialActivityLog);
  const [alertas, setAlertas] = useState<AlertaItem[]>(getInitialAlertas);
  const [adminNotifications, setAdminNotifications] = useState<NotificationItem[]>(getInitialAdminNotifications);
  const [guardiaNotifications, setGuardiaNotifications] = useState<NotificationItem[]>(getInitialGuardiaNotifications);
  const [inquilinoNotifications, setInquilinoNotifications] = useState<NotificationItem[]>(getInitialInquilinoNotifications);

  // --- Personal CRUD ---
  const recargarPersonal = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/personal?id_usuario_actual=${ID_ADMIN_ACTUAL}`);
      const data = await res.json();

      if (!res.ok || !Array.isArray(data)) {
        console.error('Error del backend al obtener personal:', data);
        return;
      }

      const transformed = data.map((row: PersonalRaw) => ({
        id_usuario: row.id_usuario,
        nombre: row.nombre_completo,
        correo: row.correo,
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
  }, []);

  const crearPersonal = useCallback(async (nombre: string, correo: string, telefono: string, cedula: string) => {
    const res = await fetch(`${API_URL}/personal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario_actual: ID_ADMIN_ACTUAL, nombre_completo: nombre, correo, contrasena_hash: 'temporal123', telefono, cedula, foto_perfil: null })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al crear personal');
    }
    await recargarPersonal();
  }, [recargarPersonal]);

  const editarPersonal = useCallback(async (id_usuario: number, nombre: string, correo: string, telefono: string, cedula: string) => {
    const res = await fetch(`${API_URL}/personal/${id_usuario}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario_actual: ID_ADMIN_ACTUAL, nombre_completo: nombre, correo, telefono, cedula, foto_perfil: null })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al editar personal');
    }
    await recargarPersonal();
  }, [recargarPersonal]);

  const cambiarEstadoPersonal = useCallback(async (id_usuario: number, activar: boolean) => {
    const accion = activar ? 'reactivar' : 'desactivar';
    const res = await fetch(`${API_URL}/personal/${id_usuario}/${accion}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario_actual: ID_ADMIN_ACTUAL })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al cambiar estado');
    }
    await recargarPersonal();
  }, [recargarPersonal]);

  // --- Residentes CRUD ---
  const recargarResidentes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/residentes?id_usuario_actual=${ID_ADMIN_ACTUAL}`);
      const data = await res.json();

      if (!res.ok || !Array.isArray(data)) {
        console.error('Error del backend al obtener residentes:', data);
        return;
      }

      const transformed: Residente[] = data.map((row: ResidenteRaw) => ({
        id: row.id_usuario,
        nombre: row.nombre_completo,
        departamento: row.departamento || 'Sin asignar',
        correo: row.correo,
        telefono: row.telefono,
        contrato_estado: row.estado_contrato || 'Sin Contrato',
        estado: row.activo ? 'Activo' : 'Inactivo'
      }));

      setResidentesData(transformed);
    } catch (err) {
      console.error('Error de red al recargar residentes:', err);
    }
  }, []);

  const crearResidente = useCallback(async (nombre: string, correo: string, telefono: string, cedula: string) => {
    const res = await fetch(`${API_URL}/residentes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario_actual: ID_ADMIN_ACTUAL,
        nombre_completo: nombre,
        correo,
        contrasena_hash: 'temporal123',
        telefono,
        cedula
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al registrar residente');
    }

    await recargarResidentes();
  }, [recargarResidentes]);

  const editarResidente = useCallback(async (id_usuario: number, nombre: string, correo: string, telefono: string, cedula: string) => {
    const res = await fetch(`${API_URL}/residentes/${id_usuario}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario_actual: ID_ADMIN_ACTUAL,
        nombre_completo: nombre,
        correo,
        telefono,
        cedula
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al editar residente');
    }

    await recargarResidentes();
  }, [recargarResidentes]);

  const cambiarEstadoResidente = useCallback(async (id: number, activo: boolean) => {
    const res = await fetch(`${API_URL}/residentes/${id}/changeEstadoResidente`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario_actual: ID_ADMIN_ACTUAL,
        activo: activo ? 1 : 0
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error de servidor' }));
      throw new Error(err.message || 'Error al cambiar estado');
    }

    await recargarResidentes();
  }, [recargarResidentes]);

  // --- Contratos CRUD ---
  const recargarContratos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/contratos?id_usuario_actual=${ID_ADMIN_ACTUAL}`);
      const data = await res.json();

      if (!res.ok || !Array.isArray(data)) {
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
        estado: row.estado
      }));

      setContratosData(transformed);
    } catch (err) {
      console.error('Error de red al recargar contratos:', err);
    }
  }, []);

  const crearContrato = useCallback(async (datos: {
    id_usuario: number;
    id_departamento: number;
    fecha_inicio: string;
    fecha_fin: string;
    monto_mensual: number;
    monto_deposito: number;
    observaciones?: string;
  }) => {
    const res = await fetch(`${API_URL}/contratos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario_actual: ID_ADMIN_ACTUAL,
        ...datos
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error al crear contrato' }));
      throw new Error(err.message || 'Error al crear contrato');
    }

    await recargarContratos();
    await recargarResidentes();
  }, [recargarContratos, recargarResidentes]);

  const editarContrato = useCallback(async (
    id_contrato: number,
    datos: {
      id_departamento: number;
      fecha_inicio: string;
      fecha_fin: string;
      monto_mensual: number;
      monto_deposito: number;
      observaciones?: string;
    }
  ) => {
    const res = await fetch(`${API_URL}/contratos/${id_contrato}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario_actual: ID_ADMIN_ACTUAL,
        ...datos
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error al actualizar contrato' }));
      throw new Error(err.message || 'Error al actualizar contrato');
    }

    await recargarContratos();
  }, [recargarContratos]);

  const finalizarContrato = useCallback(async (id_contrato: number) => {
    const res = await fetch(`${API_URL}/contratos/${id_contrato}/finalizar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario_actual: ID_ADMIN_ACTUAL
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error al finalizar contrato' }));
      throw new Error(err.message || 'Error al finalizar contrato');
    }

    await recargarContratos();
    await recargarResidentes();
  }, [recargarContratos, recargarResidentes]);

  // --- RESERVAS CONSULTA & CRUD ---
  const recargarReservas = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/reservas?id_usuario_actual=${ID_ADMIN_ACTUAL}`);
      const data = await res.json();

      if (!res.ok || !Array.isArray(data)) {
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
  }, []);

  const crearReserva = useCallback(async (dto: CrearReservaDTO) => {
    const res = await fetch(`${API_URL}/reservas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario_actual: ID_ADMIN_ACTUAL,
        ...dto
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error al crear reserva' }));
      throw new Error(err.message || 'Error al crear la reserva');
    }

    await recargarReservas();
  }, [recargarReservas]);

  const editarReserva = useCallback(async (id_reserva: number, dto: EditarReservaDTO) => {
    const res = await fetch(`${API_URL}/reservas/${id_reserva}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario_actual: ID_ADMIN_ACTUAL,
        ...dto
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error al actualizar reserva' }));
      throw new Error(err.message || 'Error al actualizar la reserva');
    }

    await recargarReservas();
  }, [recargarReservas]);

  const cancelarReserva = useCallback(async (id_reserva: number) => {
    const res = await fetch(`${API_URL}/reservas/${id_reserva}/cancelar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario_actual: ID_ADMIN_ACTUAL
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error al cancelar reserva' }));
      throw new Error(err.message || 'Error al cancelar la reserva');
    }

    await recargarReservas();
  }, [recargarReservas]);

  // --- Carga Inicial ---
  useEffect(() => {
    recargarPersonal();
    recargarResidentes();
    recargarContratos();
    recargarReservas();
  }, [recargarPersonal, recargarResidentes, recargarContratos, recargarReservas]);

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
      personalData, setPersonalData,
      residentesData, setResidentesData,
      contratosData, setContratosData,
      pagosData,
      reservasData: adminReservas, setReservasData,
      visitas, setVisitas,
      areasDisponiblesData,
      inquilinoReservasData, setInquilinoReservas,
      inquilinoVisitantesData, setInquilinoVisitantes,
      activityLog, alertas,
      adminNotifications, guardiaNotifications, inquilinoNotifications,
      addActivity, addAlerta, addNotification,
      markAsRead, markAllRead,
      crearPersonal, editarPersonal, cambiarEstadoPersonal,
      crearResidente, editarResidente, cambiarEstadoResidente,
      recargarContratos, crearContrato, editarContrato, finalizarContrato,
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