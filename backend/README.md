# 🚀 Documentación del Backend (API Express + TypeScript + SQL Server)

Esta sección describe la arquitectura, la configuración del entorno y el punto de ejecución del servidor para la comunicación con el frontend en React.

---

## 📂 1. Estructura del Backend
El proyecto mantiene una separación estricta entre el cliente (frontend) y el servidor (backend). La carpeta `backend` se encuentra en la raíz con la siguiente distribución:

```text
backend/
├── src/
│   ├── config/          # Configuración de conexiones (ej. db.ts para SQL Server)
│   ├── controllers/     # Lógica de negocio y llamadas a Stored Procedures
│   ├── middlewares/     # Validaciones, autenticación JWT y manejo de errores
│   └── routes/          # Definición de endpoints de la API
├── .env                 # Variables de entorno confidenciales
├── package.json         # Dependencias y scripts de Node.js del servidor
├── tsconfig.json        # Configuración de compilación para TypeScript
└── server.ts            # Punto de entrada principal (Entry Point)