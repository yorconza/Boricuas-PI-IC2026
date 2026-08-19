/**
 * ============================================================================
 * Archivo: PreferenciasContext.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Contexto único que reemplaza al antiguo ThemeContext + localStorage.
 * Maneja tema, idioma, fuente y tamaño de letra para el usuario logueado
 * (cualquier rol), cargándolos y guardándolos contra el backend real
 * (GET/PATCH /api/preferencias -> sp_ObtenerPreferencias / sp_ActualizarPreferencias)
 * en vez de localStorage, para que persistan por cuenta y no por navegador.
 *
 * Normalización:
 * La tabla PreferenciaUsuario tiene valores por default en español
 * ('claro', 'predeterminada', 'mediano') porque así se definió en el
 * schema SQL. Como las columnas tema/fuente/tamano_fuente NO tienen CHECK
 * (a diferencia de idioma, que sí exige 'es'|'en'), a partir de ahora el
 * frontend guarda sus propios valores en inglés ('light'/'dark'/'system',
 * 'Inter'/'SF Pro'/'System', 'small'/'medium'/'large'). Las funciones
 * normalizar* solo existen para traducir los valores default viejos en
 * español la primera vez que se lee un usuario que nunca ha cambiado sus
 * preferencias.
 *
 * Uso: envolver la app (o el layout autenticado) con <PreferenciasProvider>
 * y consumir con usePreferencias() en cualquier componente hijo.
 * ============================================================================
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { preferenciaService } from '../services/preferenciaService';

type Tema = 'light' | 'dark' | 'system';
type Fuente = 'Inter' | 'SF Pro' | 'System';
type TamanoFuente = 'small' | 'medium' | 'large';
type Idioma = 'es' | 'en';

interface PreferenciasContextValue {
  tema: Tema;
  idioma: Idioma;
  fuente: Fuente;
  tamanoFuente: TamanoFuente;
  /** true mientras se está cargando la preferencia real desde el backend al montar */
  cargando: boolean;
  setTema: (value: Tema) => void;
  setIdioma: (value: Idioma) => void;
  setFuente: (value: Fuente) => void;
  setTamanoFuente: (value: TamanoFuente) => void;
}

const PreferenciasContext = createContext<PreferenciasContextValue | undefined>(undefined);

const normalizarTema = (value: string | undefined): Tema => {
  if (value === 'claro') return 'light';
  if (value === 'oscuro') return 'dark';
  if (value === 'sistema') return 'system';
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return 'system';
};

const normalizarFuente = (value: string | undefined): Fuente => {
  if (value === 'predeterminada') return 'System';
  if (value === 'Inter' || value === 'SF Pro' || value === 'System') return value;
  return 'Inter';
};

const normalizarTamano = (value: string | undefined): TamanoFuente => {
  if (value === 'pequeño' || value === 'pequeno') return 'small';
  if (value === 'mediano') return 'medium';
  if (value === 'grande') return 'large';
  if (value === 'small' || value === 'medium' || value === 'large') return value;
  return 'medium';
};

const aplicarTema = (value: Tema) => {
  const prefiereOscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const esOscuro = value === 'dark' || (value === 'system' && prefiereOscuro);
  document.documentElement.setAttribute('data-theme', esOscuro ? 'dark' : 'light');
};

const aplicarFuente = (value: Fuente) => {
  document.body.style.fontFamily = value === 'Inter' ? "'Inter', sans-serif" :
    value === 'SF Pro' ? "'SF Pro Display', -apple-system, sans-serif" :
      "system-ui, -apple-system, sans-serif";
};

const aplicarTamano = (value: TamanoFuente) => {
  document.documentElement.style.fontSize = value === 'small' ? '14px' : value === 'large' ? '18px' : '16px';
};

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Tema>('system');
  const [idioma, setIdiomaState] = useState<Idioma>('es');
  const [fuente, setFuenteState] = useState<Fuente>('Inter');
  const [tamanoFuente, setTamanoFuenteState] = useState<TamanoFuente>('medium');
  const [cargando, setCargando] = useState(true);

  // Carga la preferencia real del usuario logueado al montar el provider.
  useEffect(() => {
    (async () => {
      try {
        const prefs = await preferenciaService.obtenerPreferencias();

        const t = normalizarTema(prefs?.tema);
        const i: Idioma = prefs?.idioma === 'en' ? 'en' : 'es';
        const f = normalizarFuente(prefs?.fuente);
        const ts = normalizarTamano(prefs?.tamano_fuente);

        setTemaState(t);
        setIdiomaState(i);
        setFuenteState(f);
        setTamanoFuenteState(ts);

        aplicarTema(t);
        aplicarFuente(f);
        aplicarTamano(ts);
      } catch (err) {
        console.error('Error al cargar preferencias:', err);
        // Si falla (ej. todavía no hay sesión activa), se quedan los defaults locales
        aplicarTema('system');
        aplicarFuente('Inter');
        aplicarTamano('medium');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const setTema = (value: Tema) => {
    setTemaState(value);
    aplicarTema(value);
    preferenciaService.actualizarPreferencias({ tema: value })
      .catch(err => console.error('Error al guardar tema:', err));
  };

  const setIdioma = (value: Idioma) => {
    setIdiomaState(value);
    preferenciaService.actualizarPreferencias({ idioma: value })
      .catch(err => console.error('Error al guardar idioma:', err));
  };

  const setFuente = (value: Fuente) => {
    setFuenteState(value);
    aplicarFuente(value);
    preferenciaService.actualizarPreferencias({ fuente: value })
      .catch(err => console.error('Error al guardar fuente:', err));
  };

  const setTamanoFuente = (value: TamanoFuente) => {
    setTamanoFuenteState(value);
    aplicarTamano(value);
    preferenciaService.actualizarPreferencias({ tamano_fuente: value })
      .catch(err => console.error('Error al guardar tamaño de letra:', err));
  };

  return (
    <PreferenciasContext.Provider value={{ tema, idioma, fuente, tamanoFuente, cargando, setTema, setIdioma, setFuente, setTamanoFuente }}>
      {children}
    </PreferenciasContext.Provider>
  );
}

export function usePreferencias() {
  const ctx = useContext(PreferenciasContext);
  if (!ctx) {
    throw new Error('usePreferencias debe usarse dentro de <PreferenciasProvider>');
  }
  return ctx;
}
