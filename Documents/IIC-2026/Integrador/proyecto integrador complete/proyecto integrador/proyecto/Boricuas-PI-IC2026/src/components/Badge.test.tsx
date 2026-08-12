/**
 * Pruebas unitarias para el componente Badge.
 *
 * Verifica que:
 * - Renderice el texto hijo correctamente
 * - Aplique la clase CSS correcta según la variante
 * - Use la variante 'default' si no se especifica una
 * - Acepte className adicional
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';

describe('Badge', () => {
  it('debe renderizar el texto hijo', () => {
    render(<Badge>Activo</Badge>);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('debe usar la variante default y clase base badge cuando no se especifica variant', () => {
    render(<Badge>Default</Badge>);
    const span = screen.getByText('Default');
    expect(span.className).toBe('badge');
  });

  it('debe aplicar badge-success para variant success', () => {
    render(<Badge variant="success">Éxito</Badge>);
    const span = screen.getByText('Éxito');
    expect(span.className).toContain('badge-success');
  });

  it('debe aplicar badge-warning para variant warning', () => {
    render(<Badge variant="warning">Advertencia</Badge>);
    const span = screen.getByText('Advertencia');
    expect(span.className).toContain('badge-warning');
  });

  it('debe aplicar badge-error para variant error', () => {
    render(<Badge variant="error">Error</Badge>);
    const span = screen.getByText('Error');
    expect(span.className).toContain('badge-error');
  });

  it('debe aplicar badge-info para variant info', () => {
    render(<Badge variant="info">Info</Badge>);
    const span = screen.getByText('Info');
    expect(span.className).toContain('badge-info');
  });

  it('debe aplicar badge-domain para variant domain', () => {
    render(<Badge variant="domain">Dominio</Badge>);
    const span = screen.getByText('Dominio');
    expect(span.className).toContain('badge-domain');
  });

  it('debe aplicar badge-disabled para variant disabled', () => {
    render(<Badge variant="disabled">Deshabilitado</Badge>);
    const span = screen.getByText('Deshabilitado');
    expect(span.className).toContain('badge-disabled');
  });

  it('debe incluir className adicional cuando se proporciona', () => {
    render(<Badge className="mi-clase-extra">Extra</Badge>);
    const span = screen.getByText('Extra');
    expect(span.className).toContain('mi-clase-extra');
  });
});
