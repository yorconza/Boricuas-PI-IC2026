# Boricuas-PI-IC2026

Repositorio para presentar avances y almacenar el proyecto de condominios.

# 🏢 Condominium - Sistema de Gestión de Condominios

**Condominium** es una aplicación web desarrollada en **React + TypeScript + Vite**
(frontend) conectada a un backend real **Node.js + Express + TypeScript + SQL
Server** (carpeta `backend/`). Permite gestionar las operaciones diarias de un
condominio con tres paneles de acceso según el rol del usuario: **Administrador**,
**Guarda** e **Inquilino**.

---

## 📋 ¿Qué hace esta aplicación?

- **Login real** (JWT) con **verificación en dos pasos (2FA)** por correo (Gmail SMTP).
- **Recuperación de contraseña** por correo con enlace de token (válido 10 min).
- **Panel Admin**: áreas comunes, personal, residentes, **departamentos**, contratos
  (con montos en colones ₡), reservas, visitas autorizadas, pagos y reportes.
- **Panel Guardia**: control de visitas (autorizar/rechazar) conectado a la BD.
- **Panel Inquilino**: reserva áreas comunes, consulta sus reservas y registra visitantes.
- **Alertas y confirmaciones personalizadas** (reemplazan los diálogos nativos del navegador).

> ✅ **Backend real conectado**: la app ya no es solo mock. Los datos se cargan desde
> la API (`/api/...`) y `src/data/sampleData.ts` queda solo como respaldo/fallback
> para algunos datos base.

---

## 🚀 Tecnologías utilizadas

| Tecnología | Versión | ¿Para qué se usa? |
|---|---|---|
| **React** | ^19.2 | Librería principal para construir la interfaz de usuario |
| **TypeScript** | ~6.0 | Tipado estático para evitar errores en tiempo de desarrollo |
| **Vite** | ^8.1 | Herramienta de compilación rápida (bundler) |
| **React Router** | ^7.18 | Navegación entre pantallas (rutas) |
| **Vitest** | ^4.1 | Framework de pruebas unitarias |
| **Testing Library** | ^16.3 | Utilidades para probar componentes React |
| **jsdom** | ^29.1 | Simula un navegador en las pruebas |
| **ESLint** | ^10.6 | Linter para mantener código limpio |

### Backend (carpeta `backend/`)

| Tecnología | ¿Para qué se usa? |
|---|---|
| **Express** | Servidor HTTP de la API REST |
| **mssql** | Conexión y consultas a SQL Server (Stored Procedures) |
| **jsonwebtoken** | Firma/verificación de tokens JWT |
| **bcrypt** | Hash de contraseñas (10 rondas) |
| **nodemailer** | Envío de correos reales (2FA y recuperación) con Gmail SMTP |
| **multer** | Subida de avatares (foto de perfil) |

> 📖 La documentación completa del backend (endpoints, flujos, SPs) está en
> `backend/README.md`.

---

## 📁 Estructura del proyecto (frontend)

```
interfaces-react/
├── src/
│   ├── components/       # Componentes reutilizables (Navbar, Modal, Badge, Alert, Drawer, etc.)
│   ├── context/          # Estado global (Autenticación, Datos, Tema)
│   ├── data/             # Datos de respaldo/fallback (sampleData.ts)
│   ├── hooks/            # Hooks personalizados (fechas, autenticación)
│   ├── pages/            # Pantallas completas
│   │   ├── admin/        # Panel de Administrador
│   │   ├── auth/         # Login, 2FA, Recuperar contraseña
│   │   ├── guardia/      # Panel de Guardia
│   │   └── inquilino/    # Panel de Inquilino
│   ├── services/         # Cliente HTTP + servicios (apiClient, authService, guardService, perfilService)
│   ├── styles/           # Archivos CSS
│   ├── test/             # Configuración de pruebas
│   ├── types/            # Interfaces y tipos de TypeScript
│   ├── utils/            # Utilidades (formateadores de fecha, moneda ₡, cédula, teléfono)
│   ├── App.tsx           # Componente raíz con las rutas
│   └── main.tsx          # Punto de entrada de la aplicación
├── vite.config.ts        # Configuración de Vite (+ Vitest)
├── package.json          # Dependencias y scripts
└── tsconfig.json         # Configuración de TypeScript
```

### Propósito de cada carpeta

| Carpeta | ¿Qué contiene? |
|---|---|
| `src/components/` | Componentes reutilizables: modales, alertas (`Alert.tsx`), `PrivateRoute`, badges, etc. |
| `src/context/` | Estado global de la app usando React Context (`AuthContext`, `DataContext`, `ThemeContext`). |
| `src/data/` | Datos de respaldo para algunos perfiles/base (el resto viene de la API). |
| `src/hooks/` | Funciones reutilizables (hooks) para lógica compartida. |
| `src/pages/` | Pantallas completas, organizadas por rol. |
| `src/services/` | `apiClient` (fetch con JWT + interceptor 401) y servicios tipados por módulo. |
| `src/styles/` | Archivos CSS para el diseño visual. |
| `src/types/` | Interfaces de TypeScript que definen la forma de los datos. |
| `src/utils/` | Formateadores: fecha/hora local, moneda en colones ₡, cédula y teléfono. |

---

## 🔧 Comandos disponibles

```bash
# ─── Instalación ──────────────────────────────────────────────
npm install          # Instala las dependencias del frontend
cd backend && npm install   # Instala las del backend

# ─── Desarrollo ───────────────────────────────────────────────
npm run dev          # Frontend (localhost:5173)
cd backend && npm run dev   # Backend (localhost:4000)

# ─── Compilación ──────────────────────────────────────────────
npm run build        # Compila el proyecto para producción

# ─── Vista previa ─────────────────────────────────────────────
npm run preview      # Previsualiza la versión compilada

# ─── Pruebas ──────────────────────────────────────────────────
npm test             # Ejecuta todas las pruebas unitarias una sola vez
npm run test:watch   # Ejecuta pruebas en modo "vigilancia"

# ─── Linter ───────────────────────────────────────────────────
npm run lint         # Revisa el código en busca de errores de estilo
```

> ⚠️ El frontend espera el backend en `http://localhost:4000/api`
> (configurable con `VITE_API_URL`).

---

## 🧪 Pruebas unitarias

El proyecto cuenta con **53 pruebas unitarias** distribuidas en 5 archivos:

| Archivo | Tests | ¿Qué verifica? |
|---|---|---|
| `authService.test.ts` | 11 | Llamadas reales a `/api/auth/*` (login, register, 2FA), mapeo de usuario, guardado en localStorage y manejo de errores |
| `useLocalDate.test.ts` | 21 | Formato de fecha/hora (AM/PM, timeAgo, saludos) |
| `PrivateRoute.test.tsx` | 6 | Redirecciones según sesión, rol y estado de verificación 2FA |
| `ErrorBoundary.test.tsx` | 6 | Captura de errores, mensaje amigable y recuperación |
| `Badge.test.tsx` | 9 | Variantes del componente Badge y clases CSS |

> *"Cada función de lógica de negocio debe tener al menos un caso de prueba
> exitoso y uno de fallo."*

---

## 🔐 Flujo de autenticación (real)

```
Usuario ingresa correo y contraseña
          ↓
  POST /api/auth/login  (backend valida contra la BD con bcrypt)
          ↓
  JWT TEMPORAL (2faVerified: false)  →  redirige a /2fa
          ↓
  POST /api/auth/2fa/send   → llega un código de 6 dígitos por correo (5 min)
          ↓
  POST /api/auth/2fa/verify → valida el código (3 intentos máx)
          ↓
  JWT DEFINITIVO (2faVerified: true)
          ↓
  Dashboard según el rol (rutaPorRol)
```

### ¿A qué correo llega el código 2FA?

| Rol | Correo destino |
|---|---|
| Inquilino | `correo` (su correo real: gmail/hotmail/...) |
| Administrador / Guarda | `correo_contacto` (campo dedicado con un correo real) |

> 🔑 Ya **no** existe un código fijo como "123456": el código se envía en tiempo
> real por correo (Gmail SMTP) y expira en 5 minutos.

### Recuperación de contraseña

```
/forgot → POST /api/auth/recuperar-solicitar (respuesta siempre genérica)
  → si el correo existe (busca en correo y correo_contacto), llega un enlace
    con token (válido 10 min) a la dirección real
  → /recuperar?token=... → nueva contraseña
  → POST /api/auth/recuperar-restablecer → redirige a /login (el 2FA aplica de nuevo)
```

---

## 🔄 Flujo general de la aplicación

```
                  ┌─────────────────────┐
                  │   LoginPage.tsx     │
                  │  (Inicio de sesión) │
                  └─────────┬───────────┘
                            │
                  ┌─────────▼───────────┐
                  │  TwoFactorPage.tsx  │
                  │ (2FA real por correo)│
                  └─────────┬───────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                  ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │    Admin     │  │   Guardia    │  │  Inquilino   │
  │              │  │              │  │              │
  │• Dashboard   │  │• Dashboard   │  │• Dashboard   │
  │• Personal    │  │• Visitas     │  │• Reservar    │
  │• Residentes  │  │• Configuración│  │  áreas       │
  │• Contratos   │  │              │  │• Mis reservas│
  │• Departamentos│ │              │  │• Visitantes  │
  │• Reservas    │  │              │  │• Configuración│
  │• Áreas       │  │              │  │              │
  │• Visitas     │  │              │  │              │
  │• Pagos       │  │              │  │              │
  │• Reportes    │  │              │  │              │
  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🔌 Conexión con el backend

El frontend ya está conectado al backend real:

1. **`src/services/apiClient.ts`**: cliente `fetch` que adjunta el JWT en cada
   petición (`Authorization: Bearer <token>`), lanza `ApiError` con el cuerpo del
   backend e intercepta el `401` (limpia la sesión y redirige a `/login`).
2. **`src/services/*`**: `authService` (login, registro, 2FA, recuperación),
   `guardService` (panel guardia) y `perfilService` (perfil, avatar, contraseña).
3. **`AuthContext`**: guarda el token y el usuario en `localStorage` y restaura la
   sesión al recargar según `2faVerified` (si falta verificación → redirige a `/2fa`).
4. **`DataContext`**: carga los datos desde la API (personal, residentes, contratos,
   departamentos, reservas, áreas, visitas) y mantiene el estado al día.
5. **`PrivateRoute`**: protege `/admin`, `/guardia` e `/inquilino` por rol y exige
   la verificación 2FA antes de entrar.

### Manejo de errores HTTP

| Código | Significado | Acción del frontend |
|---|---|---|
| 400 | Solicitud incorrecta | Mostrar el mensaje de validación del backend |
| 401 | No autenticado / token expirado | Limpiar sesión y redirigir a `/login` (interceptor) |
| 403 | Sin permisos (rol o 2FA) | `PrivateRoute` redirige según el caso |
| 429 | Demasiados intentos (2FA/recuperación) | Mostrar el mensaje y bloquear hasta reenviar |
| 500 | Error del servidor | Mostrar mensaje genérico |

---

## 🧑‍💻 Buenas prácticas para desarrolladores

### Convenciones de código

- **Variables y funciones**: `camelCase` (ej: `nombreCliente`, `obtenerReserva()`)
- **Interfaces y tipos**: `PascalCase` (ej: `interface Usuario {}`, `type UserRole`)
- **Archivos de componentes**: `PascalCase.tsx` (ej: `LoginPage.tsx`)
- **Archivos de servicio/utilidad**: `camelCase.ts` (ej: `authService.ts`)
- **Indentación**: 2 espacios, sin tabs
- **Líneas**: máximo 100 caracteres

### Al agregar una nueva pantalla:

1. Crear el archivo en la carpeta correspondiente (`pages/admin/`, `pages/inquilino/`, etc.)
2. Agregar la ruta en `App.tsx` dentro del Router correspondiente
3. Si necesita datos del backend, consumir a través de los servicios y el `DataContext`
4. Usar `showAlert`/`confirmar` (componente `Alert`) en lugar de `alert()`/`confirm()` nativos
5. Agregar pruebas unitarias en un archivo `.test.tsx`

### Para ejecutar pruebas antes de hacer commit:

```bash
npm test              # Verifica que todo funciona
npm run build         # Verifica que compila sin errores
npm run lint          # Verifica que el código sigue las reglas de estilo
```

---

## 📄 Documentación relacionada

- **`backend/README.md`** — documentación completa del backend (autenticación,
  2FA, recuperación, módulo guardia, endpoints y SPs).
- **`DOCUMENTACION-CAMBIOS.md`** — resumen de qué y por qué se cambió cada archivo
  en los módulos de contratos, departamentos, moneda ₡, diálogos personalizados
  y recuperación de contraseña.
