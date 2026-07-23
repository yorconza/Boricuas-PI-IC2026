/**
 * ============================================================================
 * Archivo: AuthContext.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Administra el estado global de autenticación del usuario.
 * Guarda quién está logueado, su rol, sus datos de perfil y el token 2FA.
 *
 * Estado que administra
 * - usuario:        Datos del usuario logueado (id, nombre, rol)
 * - token:          Token de autenticación (simulado)
 * - autenticado:    Booleano que indica si pasó el login
 * - verificacion2FA: Booleano que indica si pasó la verificación 2FA
 * - isAuthenticated: Booleano (API anterior, compatibilidad)
 * - userRole:       Rol del usuario ('admin' | 'guardia' | 'inquilino')
 * - profile:        Perfil del usuario (nombre, correo, avatar, etc.)
 *
 * Quién lo utiliza
 * - LoginPage.tsx (para iniciar sesión)
 * - TwoFactorPage.tsx (para completar 2FA)
 * - AdminLayout, GuardiaLayout, InquilinoLayout (para mostrar perfil)
 * - Navbar.tsx (para mostrar el nombre del usuario)
 * - ProfileDrawer.tsx (para editar perfil)
 * - Sidebar (para cerrar sesión)
 *
 * Flujo
 * Login → guardarUsuarioParcial() → autenticado = true
 *   → TwoFactorPage → completar2FA() → verificacion2FA = true
 *   → Dashboard según el rol
 *
 * Cambios para Backend
 * Cuando exista el backend, AuthContext deberá:
 * ✓ Almacenar el JWT recibido del servidor
 * ✓ Verificar que el token no haya expirado
 * ✓ Enviar el token en cada petición (Authorization header)
 *
 *   Ejemplo:
 *   localStorage.setItem('token', response.token);
 *   headers: { Authorization: `Bearer ${token}` }
 *
 * ============================================================================
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { UserRole, ProfileData } from '../types';
import type { Usuario } from '../types/auth';
import { adminProfile, guardiaProfile, inquilinoProfile } from '../data/sampleData';

interface AuthContextType {
  // --- Nueva API (para LoginPage) ---
  usuario: Usuario | null;
  token: string | null;
  autenticado: boolean;
  verificacion2FA: boolean;
  guardarUsuarioParcial: (usuario: Usuario) => void;
  completar2FA: (token: string) => void;
  registrarUsuarioDirecto: (usuario: Usuario) => void;
  cerrarSesion: () => void;

  // --- API anterior (compatibilidad con el resto de la app) ---
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userName: string;
  profile: ProfileData | null;
  login: (role: UserRole, name?: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<ProfileData>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const profileMap: Record<UserRole, ProfileData> = {
  admin: adminProfile,
  guardia: guardiaProfile,
  inquilino: inquilinoProfile,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // Estados para la nueva API
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [autenticado, setAutenticado] = useState(false);
  const [verificacion2FA, setVerificacion2FA] = useState(false);

  // --- Nueva API ---

  const guardarUsuarioParcial = (nuevoUsuario: Usuario) => {
    setUsuario(nuevoUsuario);
    setAutenticado(true);

    // Sincronizar con la API anterior para que los dashboards funcionen
    const rolMap: Record<string, UserRole> = {
      Administrador: 'admin',
      Guarda: 'guardia',
      Inquilino: 'inquilino',
    };
    const role = rolMap[nuevoUsuario.rol] || 'inquilino';
    const baseProfile = { ...profileMap[role] };
    baseProfile.nombre = nuevoUsuario.nombreCompleto;
    baseProfile.correo = nuevoUsuario.correo;
    setProfile(baseProfile);
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const completar2FA = (nuevoToken: string) => {
    setToken(nuevoToken);
    setVerificacion2FA(true);
  };

  const registrarUsuarioDirecto = (nuevoUsuario: Usuario) => {
    setUsuario(nuevoUsuario);
    setToken('token-demo-' + Date.now());
    setAutenticado(true);
    setVerificacion2FA(true);

    // Sincronizar con la API anterior
    const baseProfile = { ...profileMap['inquilino'] };
    baseProfile.nombre = nuevoUsuario.nombreCompleto;
    baseProfile.correo = nuevoUsuario.correo;
    setProfile(baseProfile);
    setUserRole('inquilino');
    setIsAuthenticated(true);
  };

  const cerrarSesion = () => {
    setUsuario(null);
    setToken(null);
    setAutenticado(false);
    setVerificacion2FA(false);
    setProfile(null);
    setUserRole(null);
    setIsAuthenticated(false);
  };

  // --- API anterior ---

  const login = (role: UserRole, name?: string) => {
    const baseProfile = { ...profileMap[role] };
    if (name) baseProfile.nombre = name;
    setProfile(baseProfile);
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setProfile(null);
    setUsuario(null);
    setToken(null);
    setAutenticado(false);
    setVerificacion2FA(false);
  };

  const updateProfile = (data: Partial<ProfileData>) => {
    if (profile) {
      setProfile({ ...profile, ...data });
    }
  };

  const userName = profile?.nombre || usuario?.nombreCompleto || '';

  return (
    <AuthContext.Provider value={{
      // Nueva API
      usuario, token, autenticado, verificacion2FA,
      guardarUsuarioParcial, completar2FA, registrarUsuarioDirecto, cerrarSesion,
      // API anterior
      isAuthenticated, userRole, userName, profile,
      login, logout, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
