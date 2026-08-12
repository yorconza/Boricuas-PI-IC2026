// src/services/areaServices.ts

const API_URL = 'http://localhost:4000/api/areas';

export interface AreaComun {
  id_area?: number;
  nombre: string;
  capacidad_max: number;
  descripcion?: string | null;
  costo_por_hora: number;
  hora_apertura?: string;
  hora_cierre?: string;
  max_reservas_semana?: number;
  foto_principal?: string | null;
  estado?: string;
}

export const getAreas = async (): Promise<AreaComun[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener la lista de áreas');
  }
  const result = await response.json();
  if (Array.isArray(result)) return result;
  if (result.data && Array.isArray(result.data)) return result.data;
  return [];
};

export const createArea = async (data: FormData | AreaComun) => {
  const isFormData = data instanceof FormData;
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body: isFormData ? data : JSON.stringify(data),
  });
  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(resData.message || 'Error al crear el área común');
  }
  return resData;
};

export const updateArea = async (id: number, data: FormData | AreaComun) => {
  const isFormData = data instanceof FormData;
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body: isFormData ? data : JSON.stringify(data),
  });
  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(resData.message || 'Error al actualizar el área común');
  }
  return resData;
};

export const toggleEstadoArea = async (id: number, activar: boolean) => {
  const endpoint = activar ? 'activar' : 'desactivar';
  const response = await fetch(`${API_URL}/${id}/${endpoint}`, { method: 'PATCH' });
  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(resData.message || 'Error al cambiar el estado del área');
  }
  return resData;
};