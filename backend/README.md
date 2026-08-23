# Backend — CondominioDB

API REST con **Express + TypeScript + SQL Server** (Stored Procedures).

---

## Inicio rápido

```bash
npm install
npm run dev          # http://localhost:4000
```

### Variables de entorno (`.env`)

```env
PORT=4000
DB_USER=sa
DB_PASSWORD=TuContraseña
DB_SERVER=localhost
DB_DATABASE=CondominioDB
JWT_SECRET=TuSecretoJWT
MAIL_USER=tu@gmail.com
MAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
FRONTEND_URL=http://localhost:5173
```

---

## Estructura

```
src/
├── config/          # Conexión SQL Server (confDB.ts)
├── controllers/     # Lógica de negocio + llamadas a SPs
├── middlewares/     # JWT, 2FA, sesión, roles
├── routes/          # Endpoints de la API
└── services/        # Lógica reutilizable (correo, timezone, auto-finalización)
server.ts            # Entry point + montaje de rutas
```

---

## Autenticación (JWT + 2FA)

```
Login → JWT temporal → 2FA por correo → JWT definitivo
```

| Endpoint | Método | Protección |
|----------|--------|------------|
| `/api/auth/login` | POST | Pública |
| `/api/auth/register` | POST | Pública |
| `/api/auth/2fa/send` | POST | JWT + sesión |
| `/api/auth/2fa/verify` | POST | JWT + sesión |
| `/api/auth/logout` | POST | JWT |
| `/api/auth/me` | GET | JWT |
| `/api/auth/recuperar-solicitar` | POST | Pública |
| `/api/auth/recuperar-restablecer` | POST | Pública |

**¿A qué correo llega el 2FA?**
- Inquilino → `correo`
- Admin/Guarda → `correo_contacto`

---

## Módulos principales

| Ruta | Módulo | Ejemplo |
|------|--------|---------|
| `/api/auth` | Autenticación, 2FA, recuperación | Login, registro |
| `/api/personal` | Personal del condominio | CRUD |
| `/api/residentes` | Residentes | CRUD |
| `/api/contratos` | Contratos (admin + inquilino) | Listar, crear, pagar |
| `/api/reservas` | Reservas (admin) | CRUD |
| `/api/pagos` | Pagos | Listar, métricas, reporte PDF |
| `/api/guard` | Panel de guardia | Dashboard, visitas del día |
| `/api/visitas` | Visitas (admin) | Hoy, historial, detalle |
| `/api/areas` | Áreas comunes (admin) | CRUD con imágenes |
| `/api/departamentos` | Departamentos | CRUD |
| `/api/notificaciones` | Notificaciones (todos los roles) | Listar, marcar leída |
| `/api/bitacora` | Bitácora de auditoría | Consulta |
| `/api/perfil` | Perfil de usuario | Ver/editar |
| `/api/dashboard` | Dashboard del admin | KPIs, actividad |
| `/api/inquilino/*` | Panel inquilino | Áreas, reservas, visitantes |
| `/api/reportes/*` | Reportes PDF | Pagos, visitas, contratos, reservas |

---

## Stored Procedures

Todos los SPs viven en la BD `CondominioDB`. Principales:

| SP | Módulo |
|----|--------|
| `sp_LoginUsuario` | Auth |
| `sp_RegistrarInquilino` | Auth |
| `sp_GenerarCodigo2FA` / `sp_VerificarCodigo2FA` | 2FA |
| `sp_CrearSesion` / `sp_CerrarSesion` | Sesión |
| `sp_Contrato_Insertar` | Contratos |
| `sp_CrearReservaPago` | Reservas |
| `sp_CancelarReserva` | Reservas |
| `sp_RegistrarPago` | Pagos |
| `sp_Dashboard_ObtenerDatos` | Dashboard |
| `sp_CrearNotificacion` | Notificaciones |

Ver `DOCUMENTACION-CAMBIOS.md` para la lista completa de objetos de BD.

---

## Zona horaria

SQL Server en Docker usa **UTC por defecto**. Configura `TZ=America/Costa_Rica` en Docker. Ver `DOCKER.md` en la raíz del proyecto.

---

## Recuperación de contraseña

```
/recuperar-solicitar (correo) → enlace con token (10 min) → /recuperar-restablecer
```

- Respuesta siempre genérica (anti-enumeración)
- Token de uso único, expira en 10 min
- Contraseña: mín. 8 caracteres, mayúscula, minúscula, número y símbolo

---

## Probar con curl

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"juan@gmail.com","contrasena":"Secreto123!"}'

# Enviar 2FA
curl -X POST http://localhost:4000/api/auth/2fa/send \
  -H "Authorization: Bearer <TOKEN>"

# Verificar 2FA
curl -X POST http://localhost:4000/api/auth/2fa/verify \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"codigo":"123456"}'
```
