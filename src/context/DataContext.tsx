/**
 * ============================================================================
 * Archivo: DataContext.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Administra el estado global de TODOS los datos de la aplicación: áreas,
 * personal, residentes, contratos, pagos, reservas, visitas, notificaciones,
 * actividad reciente y alertas.
 *
 * Estado que administra
 * - areasData / setAreasData             → Áreas comunes (Admin)
 * - personalData / setPersonalData       → Empleados (Admin)
 * - residentesData / setResidentesData   → Residentes (Admin)
 * - contratosData / setContratosData     → Contratos (Admin)
 * - pagosData                            → Pagos (Admin)
 * - adminReservas                        → Reservas globales
 * - visitas / setVisitas                 → Visitas (Guardia)
 * - areasDisponiblesData                 → Áreas para Inquilino
 * - inquilinoReservasData                → Reservas del inquilino
 * - inquilinoVisitantesData              → Visitantes del inquilino
 * - activityLog                          → Registro de actividad
 * - alertas                              → Alertas administrativas
 * - adminNotifications, guardiaNotifications, inquilinoNotifications
 *
 * Quién lo utiliza
 * - AdminDashboard, PersonalPage, ResidentesPage, ContratosPage
 * - AreasPage, ReservasPage, VisitasPage, PagosPage, ReportesPage
 * - InquilinoDashboard, MisReservasPage, MisVisitantesPage
 * - GuardiaVisitas, NotificationDropdown
 *
 * Flujo
 * Los datos se inicializan desde sampleData.ts (mock).
 * Los componentes leen y modifican el estado a través del context.
 *
 * Cambios para Backend
 * Cuando exista el backend, este context deberá:
 * ✓ Obtener datos del servidor en lugar de sampleData.ts
 * ✓ Mantener los datos sincronizados con la base de datos
 * ✓ Manejar estados de carga (loading) y error
 *
 * ============================================================================
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
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

interface DataContextType {
  // Admin data
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

  // Guardia data
  visitas: Visitante[];
  setVisitas: React.Dispatch<React.SetStateAction<Visitante[]>>;

  // Inquilino data
  areasDisponiblesData: AreaInquilino[];
  inquilinoReservasData: Reserva[];
  setInquilinoReservas: React.Dispatch<React.SetStateAction<Reserva[]>>;
  inquilinoVisitantesData: Visitante[];
  setInquilinoVisitantes: React.Dispatch<React.SetStateAction<Visitante[]>>;

  // Shared
  activityLog: ActivityItem[];
  alertas: AlertaItem[];

  // Role-specific notifications
  adminNotifications: NotificationItem[];
  guardiaNotifications: NotificationItem[];
  inquilinoNotifications: NotificationItem[];

  // Functions
  addActivity: (descripcion: string, icono?: string, color?: string) => void;
  addAlerta: (descripcion: string, prioridad: string, icono?: string, color?: string) => void;
  addNotification: (role: UserRole, titulo: string, mensaje: string, icono?: string) => void;
  markAsRead: (role: UserRole, id: number) => void;
  markAllRead: (role: UserRole) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [areasData, setAreasData] = useState<Area[]>(initialAreasData);
  const [personalData, setPersonalData] = useState<Personal[]>(initialPersonalData);
  const [residentesData, setResidentesData] = useState<Residente[]>(initialResidentesData);
  const [contratosData, setContratosData] = useState<Contrato[]>(initialContratosData);
  const [pagosData] = useState<Pago[]>(initialPagosData);
  const [adminReservas] = useState<Reserva[]>(reservasData);
  const [visitas, setVisitas] = useState<Visitante[]>(visitasData);
  const [areasDisponiblesData] = useState<AreaInquilino[]>(areasDisponibles);
  const [inquilinoReservasData, setInquilinoReservas] = useState<Reserva[]>(inquilinoReservas);
  const [inquilinoVisitantesData, setInquilinoVisitantes]
    = useState<Visitante[]>(inquilinoVisitantes);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(getInitialActivityLog);
  const [alertas, setAlertas] = useState<AlertaItem[]>(getInitialAlertas);

  // Role-specific notifications
  const [adminNotifications, setAdminNotifications]
    = useState<NotificationItem[]>(getInitialAdminNotifications);
  const [guardiaNotifications, setGuardiaNotifications]
    = useState<NotificationItem[]>(getInitialGuardiaNotifications);
  const [inquilinoNotifications, setInquilinoNotifications]
    = useState<NotificationItem[]>(getInitialInquilinoNotifications);

  const addActivity = useCallback(
    (descripcion: string, icono = 'fa-circle', color = 'var(--accent)') => {
    const now = new Date();
    const newItem: ActivityItem = {
      id: Date.now(),
      descripcion,
      icono,
      color,
      fecha: now.toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric' as const,
      }),
      hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.getTime()
    };
    setActivityLog(prev => [newItem, ...prev]);
  }, []);

  const addAlerta = useCallback(
    (descripcion: string, prioridad: string,
      icono = 'fa-exclamation-triangle', color = 'var(--error)') => {
    const now = new Date();
    const newItem: AlertaItem = {
      id: Date.now(),
      descripcion,
      prioridad,
      icono,
      color,
      fecha: now.toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric' as const,
      }),
      timestamp: now.getTime()
    };
    setAlertas(prev => [newItem, ...prev]);
  }, []);

  const addNotification = useCallback(
    (role: UserRole, titulo: string, mensaje: string,
      icono = 'fa-bell') => {
    const now = new Date();
    const newItem: NotificationItem = {
      id: Date.now(),
      title: titulo,
      message: mensaje,
      time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      read: false,
      icon: icono,
      timestamp: now.getTime()
    };
    if (role === 'admin') {
      setAdminNotifications(prev => [newItem, ...prev]);
    } else if (role === 'guardia') {
      setGuardiaNotifications(prev => [newItem, ...prev]);
    } else {
      setInquilinoNotifications(prev => [newItem, ...prev]);
    }
  }, []);

  const markAsRead = useCallback((role: UserRole, id: number) => {
    const setter = (prev: NotificationItem[]) =>
      prev.map(n => n.id === id ? { ...n, read: true } : n);
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
      personalData, setPersonalData, residentesData, setResidentesData,
      contratosData, setContratosData, pagosData,
      adminReservas,
      visitas, setVisitas,
      areasDisponiblesData,
      inquilinoReservasData, setInquilinoReservas,
      inquilinoVisitantesData, setInquilinoVisitantes,
      activityLog, alertas,
      adminNotifications, guardiaNotifications, inquilinoNotifications,
      addActivity, addAlerta, addNotification,
      markAsRead, markAllRead
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
