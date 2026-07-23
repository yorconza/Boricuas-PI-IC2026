/**
 * ============================================================================
 * Archivo: GuardiaConfig.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de configuración del panel Guardia. Permite cambiar idioma,
 * tema (oscuro/claro/sistema), fuente y tamaño de texto.
 *
 * Componentes que utiliza
 * - PageHeader (título)
 * - useTheme (contexto de tema)
 *
 * ============================================================================
 */

import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import PageHeader from '../../components/PageHeader';

export default function GuardiaConfig() {
  const { theme, setTheme } = useTheme();
  const [font, setFontState] = useState(() => localStorage.getItem('guardia-font') || 'Inter');
  const [fontSize, setFontSizeState] = useState(() => localStorage.getItem('guardia-fontSize') || 'medium');

  const handleFontChange = (value: string) => {
    setFontState(value);
    localStorage.setItem('guardia-font', value);
    document.body.style.fontFamily = value === 'Inter' ? "'Inter', sans-serif" :
      value === 'SF Pro' ? "'SF Pro Display', -apple-system, sans-serif" :
      "system-ui, -apple-system, sans-serif";
  };

  const handleFontSizeChange = (value: string) => {
    setFontSizeState(value);
    localStorage.setItem('guardia-fontSize', value);
    let baseSize = '16px';
    if (value === 'small') baseSize = '14px';
    else if (value === 'large') baseSize = '18px';
    document.documentElement.style.fontSize = baseSize;
  };

  return (
    <>
      <PageHeader title="Configuración" />
      <div className="settings-grid">
        <div className="settings-card">
          <h4>Idioma y región</h4>
          <div className="setting-item">
            <span className="setting-label">Idioma</span>
            <div className="setting-control">
              <select id="langSelect">
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>
        <div className="settings-card">
          <h4>Apariencia</h4>
          <div className="setting-item">
            <span className="setting-label">Tema</span>
            <div className="setting-control">
              <select id="themeSelect" value={theme} onChange={e => setTheme(e.target.value as 'dark' | 'light' | 'system')}>
                <option value="dark">Oscuro</option>
                <option value="light">Claro</option>
                <option value="system">Sistema</option>
              </select>
            </div>
          </div>
          <div className="setting-item">
            <span className="setting-label">Fuente</span>
            <div className="setting-control">
              <select id="fontSelect" value={font} onChange={e => handleFontChange(e.target.value)}>
                <option value="Inter">Inter</option>
                <option value="SF Pro">SF Pro</option>
                <option value="System">System</option>
              </select>
            </div>
          </div>
          <div className="setting-item">
            <span className="setting-label">Tamaño de texto</span>
            <div className="setting-control">
              <select id="fontSizeSelect" value={fontSize} onChange={e => handleFontSizeChange(e.target.value)}>
                <option value="small">Pequeño</option>
                <option value="medium">Mediano</option>
                <option value="large">Grande</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
