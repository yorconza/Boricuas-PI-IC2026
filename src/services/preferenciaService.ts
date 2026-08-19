/**
 * ============================================================================
 * Archivo: preferenciaService.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Service layer del módulo de Preferencias en el frontend. Gestiona la
 * lectura y actualización de las preferencias del usuario (tema, idioma,
 * fuente, tamaño de fuente):
 *
 *   obtenerPreferencias     → GET /api/preferencias
 *   actualizarPreferencias  → PATCH /api/preferencias (parcial)
 *
 * Se comunica con:
 *   - Backend: /api/preferencias (preferenciaController → sp_ObtenerPreferencias /
 *     sp_ActualizarPreferencias).
 *   - Consumido por: PreferenciasContext.tsx (proveedor de tema/idioma global).
 *   - apiClient.ts (wrapper de fetch con JWT automático).
 *
 * ============================================================================
 */
import { api } from './apiClient';

/** Respuesta cruda de GET /api/preferencias (sp_ObtenerPreferencias) */
export interface PreferenciasRaw {
  idioma: string;          // 'es' | 'en'
  tema: string;             // valor libre, ej. 'claro' (default BD) | 'light' | 'dark' | 'system'
  fuente: string;           // valor libre, ej. 'predeterminada' (default BD) | 'Inter' | 'SF Pro' | 'System'
  tamano_fuente: string;    // valor libre, ej. 'mediano' (default BD) | 'small' | 'medium' | 'large'
}

/** Payload de PATCH /api/preferencias - todos los campos son opcionales */
export interface ActualizarPreferenciasPayload {
  idioma?: 'es' | 'en';
  tema?: string;
  fuente?: string;
  tamano_fuente?: string;
}

export const preferenciaService = {
  obtenerPreferencias: async (): Promise<PreferenciasRaw | null> => {
    return await api.get<PreferenciasRaw | null>('/preferencias');
  },
  actualizarPreferencias: async (data: ActualizarPreferenciasPayload) => {
    return await api.patch('/preferencias', data);
  }
};
