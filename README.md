# Boricuas-PI-IC2026
Repositorio para presentar avances y almacenar el proyecto de condominios.

# 🏢 Condominium - Sistema de Gestión de Condominios

**Condominium** es una aplicación web desarrollada en **React + TypeScript + Vite** que permite gestionar las operaciones diarias de un condominio. Cuenta con tres paneles de acceso según el rol del usuario: **Administrador**, **Guarda** e **Inquilino**.

---

## 📋 ¿Qué hace esta aplicación?

La aplicación simula la gestión completa de un condominio:

- **Login** con autenticación simulada y verificación en 2 pasos (2FA).
- **Panel Admin**: Gestiona áreas comunes, personal, residentes, contratos, reservas, visitas autorizadas, pagos y reportes.
- **Panel Guardia**: Gestiona las visitas que llegan al condominio (autorizar/rechazar).
- **Panel Inquilino**: Reserva áreas comunes, consulta sus reservas y registra visitantes.

> ⚠️ **Importante**: Actualmente la aplicación funciona con **datos simulados (mock)**. No hay backend real. Todos los datos se generan desde `src/data/sampleData.ts`.

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

### Dependencias de desarrollo (devDependencies)

```json
"@testing-library/jest-dom": "^7.0.0",   // Matchers adicionales para tests
"@testing-library/react": "^16.3.2",     // Renderizado de componentes en tests
"@testing-library/user-event": "^14.6.1",// Simula eventos de usuario en tests
"@types/react": "^19.2.17",              // Tipos de TypeScript para React
"@types/react-dom": "^19.2.3",           // Tipos de TypeScript para React DOM
"@vitejs/plugin-react": "^6.0.3",        // Plugin de Vite para React
"eslint": "^10.6.0",                     // Linter para mantener código limpio
"jsdom": "^29.1.1",                      // Entorno DOM simulado para tests
"typescript": "~6.0.2",                  // Compilador de TypeScript
"vite": "^8.1.1",                        // Bundler y servidor de desarrollo
"vitest": "^4.1.10",                     // Ejecutor de pruebas unitarias
```

---

## 📁 Estructura del proyecto

```
interfaces-react/
├── src/
│   ├── components/       # Componentes reutilizables (Navbar, Modal, Badge, etc.)
│   ├── context/          # Estado global (Autenticación, Datos, Tema)
│   ├── data/             # Datos simulados (sampleData.ts)
│   ├── hooks/            # Hooks personalizados (fechas, autenticación)
│   ├── pages/            # Pantallas completas
│   │   ├── admin/        # Panel de Administrador
│   │   ├── auth/         # Login, 2FA, Recuperar contraseña
│   │   ├── guardia/      # Panel de Guardia
│   │   └── inquilino/    # Panel de Inquilino
│   ├── services/         # Servicios (authService)
│   ├── styles/           # Archivos CSS
│   ├── test/             # Configuración de pruebas
│   ├── types/            # Interfaces y tipos de TypeScript
│   ├── App.tsx           # Componente raíz con las rutas
│   └── main.tsx          # Punto de entrada de la aplicación
├── vite.config.ts        # Configuración de Vite (+ Vitest)
├── package.json          # Dependencias y scripts
└── tsconfig.json         # Configuración de TypeScript
```

### Propósito de cada carpeta

| Carpeta | ¿Qué contiene? |
|---|---|
| `src/components/` | Componentes reutilizables como botones, modales, barras de navegación. |
| `src/context/` | Estado global de la app usando React Context. |
| `src/data/` | Datos simulados (mock) para que la app funcione sin backend. |
| `src/hooks/` | Funciones reutilizables (hooks) para lógica compartida. |
| `src/pages/` | Pantallas completas, organizadas por rol. |
| `src/services/` | Lógica de comunicación con el backend (actualmente simulado). |
| `src/styles/` | Archivos CSS para el diseño visual. |
| `src/types/` | Interfaces de TypeScript que definen la forma de los datos. |

---

## 🔧 Comandos disponibles

```bash
# ─── Instalación ──────────────────────────────────────────────
npm install          # Instala todas las dependencias del proyecto

# ─── Desarrollo ───────────────────────────────────────────────
npm run dev          # Inicia el servidor de desarrollo (localhost:5173)

# ─── Compilación ──────────────────────────────────────────────
npm run build        # Compila el proyecto para producción

# ─── Vista previa ─────────────────────────────────────────────
npm run preview      # Previsualiza la versión compilada

# ─── Pruebas ──────────────────────────────────────────────────
npm test             # Ejecuta todas las pruebas unitarias una sola vez
npm run test:watch   # Ejecuta pruebas en modo "vigilancia" (se re-ejecutan al guardar)

# ─── Linter ───────────────────────────────────────────────────
npm run lint         # Revisa el código en busca de errores de estilo
```

---

## 🧪 Pruebas unitarias

Actualmente el proyecto cuenta con **46 pruebas unitarias** distribuidas en 4 archivos:

### ¿Qué se prueba?

| Archivo | Tests | ¿Qué verifica? |
|---|---|---|
| `authService.test.ts` | 10 | Que el inicio de sesión retorna el rol correcto, que el registro rechaza dominios inválidos, que el código 2FA funciona correctamente |
| `useLocalDate.test.ts` | 21 | Que las funciones de formato de fecha y hora retornan valores correctos (AM/PM, timeAgo, saludos) |
| `ErrorBoundary.test.tsx` | 6 | Que el ErrorBoundary captura errores, muestra mensaje amigable y permite recuperación |
| `Badge.test.tsx` | 9 | Que las variantes del componente Badge aplican las clases CSS correctas |

### Cubrimiento del estándar

> *"Cada función de lógica de negocio debe tener al menos un caso de prueba exitoso y uno de fallo."*

Cada función probada tiene **casos de éxito** (ej: login retorna admin) y **casos de fallo** (ej: código 2FA incorrecto lanza error).

---

## 🔐 Flujo de autenticación

```
Usuario ingresa correo y contraseña
          ↓
    authService.iniciarSesion()
          ↓
    Verifica el dominio del correo:
    • @admin  → Redirige a /admin
    • @guardia → Redirige a /guardia
    • Otro     → Redirige a /inquilino
          ↓
    Pantalla de verificación 2FA
    (código correcto: 123456)
          ↓
    Dashboard según el rol
```

### Credenciales de prueba para SIGN IN 

| Correo | Rol |
|---|---|
| `admin@admin.com` | Administrador |
| `guardia@guardia.com` | Guardia |
| `cualquier@correo.com` | Inquilino |

> El código 2FA correcto es: 123456

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
                  │  (Verificación 2FA) │
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
  │• Reservas    │  │              │  │• Visitantes  │
  │• Áreas       │  │              │  │• Configuración│
  │• Visitas     │  │              │  │              │
  │• Pagos       │  │              │  │              │
  │• Reportes    │  │              │  │              │
  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🔌 ¿Cómo se conectará con el backend?

Actualmente la aplicación usa **datos simulados (mock)**. Cuando el backend esté listo, estos son los cambios necesarios:

### 1. Servicios (`src/services/`)

Actualmente `authService.ts` simula respuestas con `setTimeout`. En el futuro deberá hacer peticiones HTTP reales:

```typescript
// Ejemplo de cómo lucirá con backend real:
async function iniciarSesion(credenciales: Credenciales): Promise<Usuario> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credenciales),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.mensaje);
  }

  const data = await response.json();
  localStorage.setItem('token', data.token); // Guardar JWT
  return data.usuario;
}
```

### 2. Contextos (`src/context/`)

El `AuthContext` deberá almacenar el **JWT** (token de autenticación) y enviarlo en cada petición al backend:

```typescript
// Ejemplo de cómo se enviará el token en peticiones autenticadas:
const response = await fetch('/api/reservas', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### 3. Datos (`src/data/sampleData.ts`)

Este archivo será reemplazado gradualmente por llamadas a la API. Los datos mock sirven para desarrollar la interfaz mientras el backend no está listo.

### 4. Manejo de errores HTTP

Cuando exista el backend, cada página deberá manejar códigos de error HTTP:

| Código | Significado | Acción |
|---|---|---|
| 400 | Solicitud incorrecta | Mostrar mensaje de validación |
| 401 | No autenticado | Redirigir al login |
| 403 | Sin permisos | Mostrar mensaje de acceso denegado |
| 404 | Recurso no encontrado | Mostrar pantalla de no encontrado |
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
3. Si necesita datos, agregarlos en `sampleData.ts` o consumir del `DataContext`
4. Agregar pruebas unitarias en un archivo `.test.tsx`

### Para ejecutar pruebas antes de hacer commit:

```bash
npm test              # Verifica que todo funciona
npm run build         # Verifica que compila sin errores
npm run lint          # Verifica que el código sigue las reglas de estilo
```

---
