# 🏢 Condominium — Sistema de Gestión de Condominios

App web **React + TypeScript + Vite** con backend **Node.js + Express + SQL Server**.
Tres paneles según rol: **Administrador**, **Guarda** e **Inquilino**.

---

## 🚀 Inicio rápido

```bash
# Instalar dependencias
npm install
cd backend && npm install

# Ejecutar (en terminales separadas)
npm run dev          # Frontend → http://localhost:5173
cd backend && npm run dev   # Backend → http://localhost:4000
```

> ⚠️ El frontend necesita el backend corriendo. Variables de entorno en `backend/.env`.

### ⏰ SQL Server en Docker

Si usas SQL Server en Docker (UTC), debes configurar la zona horaria para que las fechas/horas funcionen correctamente. Ver **`DOCKER.md`** para instrucciones detalladas.

```bash
# Ejemplo rápido:
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=TuContraseña123!" \
           -e "TZ=America/Costa_Rica" -p 1433:1433 -d mcr.microsoft.com/mssql/server:latest
```

---

## 📁 Estructura

```
src/
├── components/       # Componentes reutilizables (Modal, Alert, Navbar, etc.)
├── context/          # Estado global (AuthContext, DataContext, ThemeContext)
├── hooks/            # Hooks personalizados (fechas, autenticación)
├── pages/            # Pantallas organizadas por rol
│   ├── admin/        # Panel de Administrador
│   ├── auth/         # Login, 2FA, Recuperar contraseña
│   ├── guardia/      # Panel de Guardia
│   └── inquilino/    # Panel de Inquilino
├── services/         # Cliente HTTP + servicios por módulo
├── styles/           # CSS
├── types/            # Interfaces TypeScript
└── utils/            # Utilidades (fecha, moneda ₡, formateadores)
```

---

## 🧪 Pruebas

```bash
npm test             # Ejecutar una vez
npm run test:watch   # Modo vigilancia
npm run build        # Verificar compilación
npm run lint         # Verificar estilo
```

---

## 🔐 Autenticación

```
Login → JWT temporal → 2FA por correo (6 dígitos, 5 min) → JWT definitivo
```

- **2FA**: código de 6 dígitos enviado por Gmail SMTP (3 intentos, expira en 5 min)
- **Recuperación**: enlace por correo (token válido 10 min)
- **Roles**: Administrador, Guarda, Inquilino (protegidos con `PrivateRoute`)

---

## 📄 Documentación

- **`DOCKER.md`** — Configuración de SQL Server en Docker (zona horaria)
- **`backend/README.md`** — API, endpoints, módulos y SPs
- **`DOCUMENTACION-CAMBIOS.md`** — Historial de cambios

---

## 🛠️ Tech Stack

| Frontend | Backend |
|----------|---------|
| React 19 + TypeScript | Express + TypeScript |
| Vite (bundler) | mssql (SQL Server) |
| React Router 7 | JWT + bcrypt |
| Vitest (tests) | nodemailer (Gmail SMTP) |
| ESLint | multer (subida de archivos) |
