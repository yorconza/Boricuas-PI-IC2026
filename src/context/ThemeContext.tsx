/**
 * ============================================================================
 * Archivo: ThemeContext.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Administra el tema visual de la aplicación (oscuro, claro o según el sistema).
 * Guarda la preferencia en localStorage para que persista entre sesiones.
 *
 * Estado que administra
 * - theme:          'dark' | 'light' | 'system' (preferencia del usuario)
 * - appliedTheme:   'dark' | 'light' (tema realmente aplicado)
 * - setTheme():     Cambia el tema y lo guarda en localStorage
 *
 * Quién lo utiliza
 * - Toda la aplicación (aplica el atributo data-theme en el HTML)
 * - ConfigPage (para que el usuario cambie el tema)
 * - InquilinoConfig, GuardiaConfig (igual)
 *
 * Flujo
 * 1. Al cargar, lee localStorage para recuperar la preferencia
 * 2. Si es 'system', detecta el tema del sistema operativo
 * 3. Aplica el atributo data-theme en <html>
 * 4. Escucha cambios en el tema del sistema (si aplica)
 *
 * ============================================================================
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  appliedTheme: 'dark' | 'light';
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDOM(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function ThemeProvider({
  children, storageKey = 'theme'
}: { children: ReactNode; storageKey?: string }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(storageKey) as Theme) || 'dark';
  });

  const appliedTheme = theme === 'system' ? getSystemTheme() : theme;

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(storageKey, newTheme);
    applyThemeToDOM(newTheme);
  };

  useEffect(() => {
    applyThemeToDOM(theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        applyThemeToDOM('system');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, appliedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
