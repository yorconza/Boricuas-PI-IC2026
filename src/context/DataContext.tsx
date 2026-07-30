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
  initialContratosData, initialPagosData, reservasData,
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
  adminReservas: Reserva[];
  setAdminReservas: React.Dispatch<React.SetStateAction<Reserva[]>>;
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

  crearPersonal: (nombre: string, correo: string, telefono: string, cedula: string) => Promise<void>;
  editarPersonal: (id_usuario: number, nombre: string, correo: string, telefono: string, cedula: string) => Promise<void>;
  cambiarEstadoPersonal: (id_usuario: number, activar: boolean) => Promise<void>;

  crearResidente: (nombre: string, correo: string, telefono: string, cedula: string) => Promise<void>;
  editarResidente: (id_usuario: number, nombre: string, correo: string, telefono: string, cedula: string) => Promise<void>;
  cambiarEstadoResidente: (id_usuario: number, activar: boolean) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [areasData, setAreasData] = useState<Area[]>(initialAreasData);
  const [personalData, setPersonalData] = useState<Personal[]>(initialPersonalData);
  const [residentesData, setResidentesData] = useState<Residente[]>(initialResidentesData);
  const [contratosData, setContratosData] = useState<Contrato[]>(initialContratosData);
  const [pagosData] = useState<Pago[]>(initialPagosData);
  const [adminReservas, setAdminReservas] = useState<Reserva[]>(reservasData);
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

    // Validar si el backend respondió con un error o no es un arreglo
    if (!res.ok || !Array.isArray(data)) {
      console.error('El backend respondió con un error:', data);
      return;
    }

    const transformed = data.map((row) => ({
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

  // --- Residentes CRUD (AHORA DENTRO DE DataProvider) ---
  const recargarResidentes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/residentes?id_usuario_actual=${ID_ADMIN_ACTUAL}`);
      if (!res.ok) throw new Error('Error al cargar residentes');
      
      const data: ResidenteRaw[] = await res.json();
      
      const transformed: Residente[] = data.map((row) => ({
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
      console.error('Error cargando residentes:', err);
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

  const cambiarEstadoResidente = useCallback(async (id_usuario: number, activar: boolean) => {
    const accion = activar ? 'reactivar' : 'desactivar';
    const res = await fetch(`${API_URL}/residentes/${id_usuario}/${accion}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario_actual: ID_ADMIN_ACTUAL })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al cambiar estado del residente');
    }

    await recargarResidentes();
  }, [recargarResidentes]);

  // --- Carga Inicial ---
  useEffect(() => {
    recargarPersonal();
    recargarResidentes();

    fetch(`${API_URL}/contratos`)
      .then(res => res.json())
      .then(data => setContratosData(data))
      .catch(err => console.error('Error cargando contratos:', err));

    fetch(`${API_URL}/reservas`)
      .then(res => res.json())
      .then(data => setAdminReservas(data))
      .catch(err => console.error('Error cargando reservas:', err));
  }, [recargarPersonal, recargarResidentes]);

  // --- Notificaciones / Actividad (Helpers) ---
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
      adminReservas, setAdminReservas,
      visitas, setVisitas,
      areasDisponiblesData,
      inquilinoReservasData, setInquilinoReservas,
      inquilinoVisitantesData, setInquilinoVisitantes,
      activityLog, alertas,
      adminNotifications, guardiaNotifications, inquilinoNotifications,
      addActivity, addAlerta, addNotification,
      markAsRead, markAllRead,
      crearPersonal, editarPersonal, cambiarEstadoPersonal,
      crearResidente, editarResidente, cambiarEstadoResidente
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