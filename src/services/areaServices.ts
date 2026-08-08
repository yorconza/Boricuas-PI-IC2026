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

/**
 * 1. Obtener todas las áreas comunes
 */
export const getAreas = async (): Promise<AreaComun[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener la lista de áreas');
  }
  return response.json();
};

/**
 * 2. Crear una nueva área común
 */
export const createArea = async (area: AreaComun) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(area),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error al crear el área común');
  }
  return data;
};

/**
 * 3. Actualizar información de un área común existente
 */
export const updateArea = async (id: number, area: AreaComun) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(area),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error al actualizar el área común');
  }
  return data;
};

/**
 * 4. Activar o Desactivar un área común
 * @param id - Identificador del área común
 * @param activar - true para 'activar', false para 'desactivar'
 */
export const toggleEstadoArea = async (id: number, activar: boolean) => {
  const endpoint = activar ? 'activar' : 'desactivar';
  const response = await fetch(`${API_URL}/${id}/${endpoint}`, {
    method: 'PATCH',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error al cambiar el estado del área');
  }
  return data;
};