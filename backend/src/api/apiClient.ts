// apiClient.ts
const API_BASE_URL = 'http://localhost:4000'; // 👈 Asegura el puerto de Express

export const apiClient = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem('token'); // O donde guardes el JWT
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });

    if (!response.ok) {
      // Si la respuesta no es OK, leemos JSON de forma segura
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    return response.json();
  }
};