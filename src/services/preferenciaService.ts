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
