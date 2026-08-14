# 🚀 Backend — CondominioDB (API Express + TypeScript + SQL Server)

Documentación única del backend: cómo correrlo, cómo está organizado y cómo
funcionan los módulos de **Autenticación (JWT + 2FA)**, **Recuperación de
contraseña** y **Guardia** (control de visitas). Está escrita en lenguaje
sencillo para que estudiantes puedan entenderla y usar la API sin complicarse.

> Este archivo consolida la información que antes vivía en `AUTH.md`, `2FA.md`
> y `GUARD.md` (ahora eliminados).

---

## 📂 1. Estructura del backend

```
backend/
├── src/
│   ├── config/          # Conexión a SQL Server (confDB.ts)
│   ├── controllers/     # Lógica de negocio + llamadas a Stored Procedures
│   ├── middlewares/     # Autenticación JWT, sesión y roles
│   ├── routes/          # Definición de endpoints de la API
│   └── services/        # Lógica reutilizable (correos, auto-finalización)
├── .env                 # Variables de entorno (SECRETOS: no subir a git)
├── package.json         # Dependencias y scripts de Node.js
├── tsconfig.json        # Configuración de TypeScript
├── server.ts            # Punto de entrada principal (Entry Point)
└── uploads/             # Avatares subidos por los usuarios
```

**Cómo correrlo:**

```bash
cd backend
npm install          # una sola vez
npm run dev          # inicia con tsx watch (recarga automática)
# El servidor escucha en http://localhost:4000
```

**Configuración (`.env`):**

| Variable | Uso |
|---|---|
| `PORT` | Puerto del servidor (4000) |
| `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_DATABASE` | Conexión a SQL Server |
| `JWT_SECRET` | Firma de los tokens JWT |
| `MAIL_USER`, `MAIL_APP_PASSWORD` | Gmail SMTP para 2FA y recuperación |
| `FRONTEND_URL` | URL del frontend (CORS y enlaces de recuperación). Default: `http://localhost:5173` |

---

## 🗂️ 2. Archivos clave del backend

| Archivo | Responsabilidad |
|---|---|
| `src/config/confDB.ts` | Pool de conexión con `max: 1` (ver §3: por qué importa para la auditoría) |
| `src/middlewares/auth.ts` | `authenticateToken` (valida el JWT) + `require2FA` (exige 2FA verificado) |
| `src/middlewares/session.ts` | `validateSessionAndSetContext` (sesión activa + `SET CONTEXT_INFO`) |
| `src/middlewares/roles.ts` | `authorizeRole(...roles)` (acceso por rol) |
| `src/controllers/authController.ts` | `register`, `login`, 2FA, logout, `me`, **recuperación de contraseña** |
| `src/routes/authRoutes.ts` | Rutas de `/api/auth` con sus middlewares |
| `src/services/mailService.ts` | Envío de correos reales con Gmail SMTP (2FA y recuperación) |
| `src/controllers/guardController.ts` | Endpoints del panel Guardia (visitas) |
| `src/routes/guardRoute.ts` | Rutas de `/api/guard` protegidas con rol `Guarda` |
| `server.ts` | Registra todas las rutas y habilita CORS desde `FRONTEND_URL` |

---

## 🔐 3. Autenticación (JWT + sesiones en BD)

### Flujo de una petición protegida

```
Request → authenticateToken → validateSessionAndSetContext → [authorizeRole?] → Controlador
```

1. **`authenticateToken`**: lee `Authorization: Bearer <token>`, verifica la
   firma y la expiración (8 h) y adjunta `req.user = { id_usuario, id_rol,
   nombre_rol, id_sesion, 2faVerified, correo, correo_contacto }`.
2. **`validateSessionAndSetContext`**: valida en BD que la sesión siga activa
   (inactividad máxima 30 min → `401 "Sesión expirada por inactividad"`). Si
   está activa, ejecuta `SET CONTEXT_INFO` con el id del usuario en la **misma
   conexión** y la guarda en `req.pool`.
3. **`authorizeRole('Administrador', ...)`**: devuelve `403` si el rol no coincide.
4. **El controlador** reutiliza `req.pool` (la misma conexión donde se puso el
   `CONTEXT_INFO`).

### Endpoints de autenticación

| Método | Ruta | Protección | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register` | Pública | Registra inquilino (correo de dominio público) |
| `POST` | `/api/auth/login` | Pública | Login → JWT **temporal** (`2faVerified: false`) |
| `POST` | `/api/auth/2fa/send` | JWT + sesión | Genera y envía el código 2FA al correo |
| `POST` | `/api/auth/2fa/verify` | JWT + sesión | Valida el código → JWT **definitivo** (`2faVerified: true`) |
| `POST` | `/api/auth/logout` | JWT + sesión | Cierra la sesión (NO exige 2FA) |
| `GET` | `/api/auth/me` | JWT + sesión | Datos del token (NO exige 2FA) |

**Login (body):** `{ "correo": "...", "contrasena": "..." }`

```json
{
  "token": "<JWT temporal, 8h>",
  "usuario": { "id": 3, "nombre": "Juan Pérez", "correo": "juan@gmail.com", "cedula": null, "rol": "Inquilino" }
}
```

> **Regla de correos:** Inquilino → `correo` es real (gmail/hotmail/...).
> Admin/Guarda → `correo` es un dominio interno falso (`@admin.com`,
> `@guardia.com`) y reciben los correos en `correo_contacto` (real).

### ¿Por qué `pool.max = 1`?

`CONTEXT_INFO` es por **conexión física**, no por pool. Con una sola conexión,
todas las consultas de una petición comparten el `CONTEXT_INFO` y los triggers
de bitácora registran quién hizo cada acción. Por eso `id_usuario_actual`
siempre sale del **JWT**, nunca del cliente.

---

## 🛡️ 4. Autenticación en dos pasos (2FA)

### Flujo

```
login → JWT TEMPORAL (2faVerified: false)
  → /2fa/send   → genera código de 6 dígitos, lo guarda (expira en 5 min)
                  y lo envía por correo real (Gmail SMTP)
  → /2fa/verify → valida el código → JWT DEFINITIVO (2faVerified: true)
Rutas sensibles → solo con el JWT definitivo (require2FA: 403 si falta 2FA)
```

### ¿A qué correo llega el código?

| Rol | Correo destino |
|---|---|
| Inquilino | `correo` (principal, dominio real) |
| Administrador / Guarda | `correo_contacto` (campo dedicado con correo real) |

### Reglas de seguridad del 2FA

- El código **nunca** se devuelve en la respuesta ni se registra en logs.
- Expira a los **5 minutos** y se permiten **3 intentos** por código → `429` al agotarlos.
- **Reenvío controlado**: mientras exista un código vigente con intentos, no se
  genera otro (`ya_enviado: true`). Solo se reenvía tras agotar los 3 intentos,
  expirar el código o fallar el envío inicial.
- **Nunca se generan 2 códigos a la vez**: el chequeo y el INSERT corren en una
  única transacción (aunque lleguen 2 peticiones simultáneas, solo se inserta
  un código y se envía un correo).
- Los tokens temporales NO acceden a rutas sensibles (`403`).
- `logout` y `me` no exigen 2FA a propósito (el usuario debe poder salir).

### Envío de correos (Gmail SMTP)

```
MAIL_USER=jedeba27@gmail.com            # tu Gmail (remitente)
MAIL_APP_PASSWORD=abcd efgh ijkl mnop   # App Password de 16 caracteres
```

- Crear la App Password: activa la verificación en 2 pasos de Google y genera
  la contraseña en https://myaccount.google.com/apppasswords
- Límite ~500 envíos/día; algunos correos a Hotmail/Yahoo pueden caer en Spam.

---

## 🔑 5. Recuperación de contraseña (sin JWT ni 2FA)

Cuando el usuario olvida su contraseña, el flujo es **público** (no tiene
sesión). Reutiliza la infraestructura del 2FA: Gmail SMTP, bcrypt y transacciones.

### Flujo

```
/forgot (ingresa su correo)
  → POST /api/auth/recuperar-solicitar   → busca en `correo` y `correo_contacto`
      → si existe un usuario activo: genera token (10 min), lo guarda en
        TokenRecuperacion y envía un correo con el enlace
        ${FRONTEND_URL}/recuperar?token=...
  → El usuario abre el enlace → página /recuperar (nueva contraseña)
  → POST /api/auth/recuperar-restablecer → valida token, hashea con bcrypt,
        actualiza la contraseña y marca el token como usado
  → Redirige a /login (el 2FA aplica de nuevo al iniciar sesión)
```

### Endpoints

| Método | Ruta | Protección | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/recuperar-solicitar` | **Pública** | Solicita el enlace de recuperación |
| `POST` | `/api/auth/recuperar-restablecer` | **Pública** | Cambia la contraseña con el token |

### Archivos del módulo de recuperación (modificados / agregados)

| Archivo | Qué se hizo | Por qué |
|---|---|---|
| `backend/src/services/mailService.ts` | Nueva función `enviarCorreoRecuperacion({destino, nombre, enlace})` | Enviar el enlace con el token reutilizando el mismo transporte Gmail del 2FA |
| `backend/src/controllers/authController.ts` | Nuevos `solicitarRecuperacion` y `restablecerContrasena` | Lógica completa del flujo (token, expiración, bcrypt, uso único) |
| `backend/src/routes/authRoutes.ts` | 2 rutas públicas nuevas | El usuario no tiene sesión: no se exige JWT ni 2FA |
| `src/services/authService.ts` | Nuevos `solicitarRecuperacion(correo)` y `restablecerContrasena(token, pass)` | Consumir los endpoints desde el frontend |
| `src/pages/auth/ForgotPasswordPage.tsx` | De demo a real (llama a la API) | Antes solo simulaba el envío |
| `src/pages/auth/RecuperarPasswordPage.tsx` | **Nuevo** — formulario que lee `?token=` de la URL | Paso 2 del flujo; redirige a `/login` al terminar |
| `src/App.tsx` | Ruta `/recuperar` registrada | El enlace del correo apunta a `/recuperar?token=...` |

### Seguridad de la recuperación

- **Respuesta siempre genérica**: `"Si el correo existe, recibirás instrucciones."`
  (no revela si el correo está registrado — anti-enumeración).
- **Token seguro**: `crypto.randomBytes(32)` (64 chars), válido **10 minutos**,
  de **uso único**; los tokens anteriores sin usar se invalidan.
- **Uso único garantizado**: `UPDLOCK` dentro de una transacción.
- **Contraseña fuerte**: mín. 8 caracteres con mayúscula, minúscula, número y
  símbolo (validada en backend y en frontend).
- **Rate limit**: máx. 3 solicitudes por hora por correo+IP (en memoria).
- **Base de datos**: usa la tabla `TokenRecuperacion` (ya existente) — no se
  requieren SPs nuevos.

---

## 🛡️ 6. Módulo Guardia (control de visitas)

### Endpoints

| Método | Ruta | SP | Descripción |
|---|---|---|---|
| `GET` | `/api/guard/dashboard/summary` | `sp_ObtenerResumenVisitasHoy` | KPIs: pendientes / autorizadas / rechazadas |
| `GET` | `/api/guard/dashboard/upcoming` | `sp_ListarProximasVisitas` | Próximas visitas pendientes |
| `GET` | `/api/guard/visits/pending?search=` | `sp_ListarVisitasEsperadas` | Visitas esperadas (Pendiente) |
| `GET` | `/api/guard/visits/history?search=&status=` | `sp_ListarHistorialVisitas_Del_Dia` | Historial del día con filtros |
| `GET` | `/api/guard/visits/:id` | `sp_ObtenerDetalleVisitante` | Detalle completo (modal) |
| `PATCH` | `/api/guard/visits/:id/status` | `sp_RegistrarIngresoVisitante` | Autorizar / rechazar (con motivo) |

**Payload del PATCH:**

```json
{ "acceso_permitido": false, "motivo_rechazo": "No presenta identificación oficial" }
```

Las rutas `/api/guard` están protegidas con
`authenticateToken → validateSessionAndSetContext → authorizeRole('Guarda')`.
En el frontend, `/guardia/*` está protegido por `PrivateRoute roles={['Guarda']}`.

### Visitas (panel Administrador)

Mismo SP de historial del día que el guardia, más el historial completo
paginado y el detalle. El `id_usuario_actual` siempre se inyecta desde el JWT
(`req.user`), nunca desde el cliente.

| Método | Ruta | SP | Descripción |
|---|---|---|---|
| `GET` | `/api/visitas/hoy?busqueda=&estado=` | `sp_ListarVisitasDelDia` *(nuevo)* | Visitas de HOY en CUALQUIER estado (Pendiente/Autorizado/Rechazado), sin paginar |
| `GET` | `/api/visitas/historial?busqueda=&estado=&fechaInicio=&fechaFin=&pageNumber=&pageSize=` | `sp_ListarHistorialVisitantes` | Historial paginado **solo de días pasados** (respuesta `{ pagina, limite, totalRegistros, totalPaginas, datos }`) |
| `GET` | `/api/visitas/detalle/:id` | `sp_ObtenerDetalleVisitante` | Detalle completo de una visita (modal/drawer) |

Protección por ruta:
- `/hoy` y `/detalle/:id` → `Administrador | Guarda` (los SPs también validan rol).
- `/historial` → **solo Administrador**. El middleware `authorizeRole` devuelve
  `403` a otros roles, y el RAISERROR del SP también se traduce a HTTP 403 como
  respaldo.

Reglas de las pestañas (aplicadas en los SPs, no en el controlador):
- **"Hoy"** = visitas cuya `fecha_hora_estimada` cae HOY, en cualquier estado,
  vía `sp_ListarVisitasDelDia` (SP dedicado, incluye Pendiente). El SP de
  "historial del día" (`sp_ListarHistorialVisitas_Del_Dia`) solo devuelve
  visitas ya decididas (Autorizado/Rechazado), por eso se creó uno nuevo.
- **"Historial"** = visitas con `fecha_hora_estimada` ANTERIOR a HOY: el propio
  `sp_ListarHistorialVisitantes` filtra `fecha_hora_estimada < HOY`. Nunca
  muestra HOY ni visitas futuras, sin importar los filtros que envíe el cliente.
- Los parámetros de fecha del historial se envían como **VARCHAR**, no
  `DateTime2`: el driver `mssql` desplaza los DateTime2 por la zona horaria
  (+6 h) y el filtro quedaría corrido.

---

## 📡 7. Probar la API con curl

```bash
# 1) Login → token temporal
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" \
  -d '{"correo":"juan@gmail.com","contrasena":"Secreto123!"}'

# 2) Enviar el código 2FA (llega al correo)
curl -X POST http://localhost:4000/api/auth/2fa/send -H "Authorization: Bearer <TOKEN>"

# 3) Verificar el código → JWT definitivo
curl -X POST http://localhost:4000/api/auth/2fa/verify \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"codigo":"123456"}'

# 4) Ruta protegida
curl http://localhost:4000/api/auth/me -H "Authorization: Bearer <TOKEN_DEFINITIVO>"

# 5) Recuperación: solicitar enlace (respuesta siempre genérica)
curl -X POST http://localhost:4000/api/auth/recuperar-solicitar \
  -H "Content-Type: application/json" -d '{"correo":"juan@gmail.com"}'

# 6) Restablecer con el token del correo
curl -X POST http://localhost:4000/api/auth/recuperar-restablecer \
  -H "Content-Type: application/json" \
  -d '{"token":"<TOKEN_DEL_CORREO>","nuevaContrasena":"NuevaClave123!"}'
```

---

## 🗄️ 8. Stored Procedures utilizados (ya existen en CondominioDB)

| SP | Módulo | Propósito |
|---|---|---|
| `sp_RegistrarInquilino` | Auth | Registra inquilino (hash bcrypt) |
| `sp_LoginUsuario` | Auth | Devuelve usuario + hash para validar login |
| `sp_CrearSesion` / `sp_CerrarSesion` | Auth | Abre/cierra sesión (output `id_sesion`) |
| `sp_VerificarYExpirarSesion` | Auth | Valida sesión activa (inactividad 30 min) |
| `sp_GenerarCodigo2FA` / `sp_VerificarCodigo2FA` | 2FA | Guarda/valida el código de 6 dígitos |
| `sp_ObtenerResumenVisitasHoy`, `sp_ListarProximasVisitas`, `sp_ListarVisitasEsperadas`, `sp_ListarHistorialVisitas_Del_Dia`, `sp_ObtenerDetalleVisitante`, `sp_RegistrarIngresoVisitante` | Guardia | Panel del guardia y control de visitas |
| `sp_ListarVisitasDelDia` | Visitas (Admin) | Visitas de HOY en cualquier estado (pestaña "Hoy") |
| `sp_ListarHistorialVisitantes` | Visitas (Admin) | Historial paginado con filtros, solo días anteriores a HOY |

> La recuperación de contraseña **no** requiere SPs nuevos: usa la tabla
> `TokenRecuperacion` con consultas parametrizadas directas desde el controlador.
