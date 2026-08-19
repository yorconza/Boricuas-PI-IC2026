# 🚀 Backend — CondominioDB

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
DB_PASSWORD=TuContraseña123!
DB_SERVER=localhost
DB_DATABASE=CondomioDB
JWT_SECRET=TuSecretoJWT
MAIL_USER=tu@gmail.com
MAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
FRONTEND_URL=http://localhost:5173
DB_TIMEZONE=America/Costa_Rica   # Opcional: ver DOCKER.md
```

---

## ⏰ Zona horaria (importante)

SQL Server en Docker usa **UTC por defecto**. Si tus fechas/horas no coinciden, necesitas configurar `TZ=America/Costa_Rica` en Docker o `DB_TIMEZONE` en `.env`. Ver **`DOCKER.md`** en la raíz del proyecto.

---

## 📁 Estructura

```
src/
├── config/          # Conexión SQL Server (confDB.ts)
├── controllers/     # Lógica de negocio + llamadas a SPs
├── middlewares/     # JWT, sesión, roles
├── routes/          # Endpoints de la API
└── services/        # Lógica reutilizable (correos, timezone, auto-finalización)
server.ts            # Entry point
```

---

## 🔐 Autenticación (JWT + 2FA)

```
Login → JWT temporal → 2FA por correo → JWT definitivo
```

| Endpoint | Método | Protección |
|----------|--------|------------|
| `/api/auth/login` | POST | Pública |
| `/api/auth/2fa/send` | POST | JWT + sesión |
| `/api/auth/2fa/verify` | POST | JWT + sesión |
| `/api/auth/logout` | POST | JWT |
| `/api/auth/register` | POST | Pública |
| `/api/auth/me` | GET | JWT |

**¿A qué correo llega el 2FA?**
- Inquilino → `correo` (gmail/hotmail real)
- Admin/Guarda → `correo_contacto` (campo dedicado)

---

## 🛡️ Módulos principales

### Guardia (`/api/guard`)
| Endpoint | Descripción |
|----------|-------------|
| `GET /dashboard/summary` | KPIs del día |
| `GET /visits/pending` | Visitas pendientes |
| `PATCH /visits/:id/status` | Autorizar/rechazar visita |

### Inquilino (`/api/inquilino`)
| Endpoint | Descripción |
|----------|-------------|
| `GET /areas` | Áreas disponibles |
| `GET /reservas` | Mis reservas |
| `POST /reservas` | Crear reserva |
| `GET /visitantes` | Mis visitantes |
| `POST /visitantes` | Registrar visitante |

### Admin (`/api/admin`)
- Áreas, personal, residentes, contratos, departamentos, reservas, pagos, reportes

---

## 🗄️ Stored Procedures

Todos los SPs existen en la BD `CondominioDB`. Principales:

| SP | Módulo |
|----|--------|
| `sp_LoginUsuario` | Auth |
| `sp_RegistrarInquilino` | Auth |
| `sp_GenerarCodigo2FA` / `sp_VerificarCodigo2FA` | 2FA |
| `sp_ListarAreasComunes` | Áreas |
| `sp_CrearReservaPago` | Reservas |
| `sp_RegistrarVisitante` | Visitantes |
| `sp_ListarMisReservas` | Reservas |
| `sp_FinalizarReservasVencidas` | Auto-finalización |

---

## 🔑 Recuperación de contraseña

```
/recuperar-solicitar (correo) → enlace con token (10 min) → /recuperar-restablecer
```

- Respuesta siempre genérica (anti-enumeración)
- Token de uso único, expira en 10 min
- Contraseña: mín. 8 caracteres, mayúscula, minúscula, número y símbolo

---

## 📡 Probar con curl

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
