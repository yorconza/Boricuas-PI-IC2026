# Documentación de cambios

Este documento resume **qué** se modificó y **por qué** en cada archivo durante la
implementación de los módulos de **Contratos** y **Departamentos**, el formato de
**moneda costarricense (₡)**, el sistema de **diálogos personalizados** (alertas
y confirmaciones), y el módulo de **recuperación de contraseña por correo**
(que reutiliza la infraestructura del 2FA).

> **Nota sobre SQL:** los scripts `.sql` (SPs y vistas) se entregaron durante el
> desarrollo y se **eliminaron del repositorio** a petición del cliente. La base
> de datos ya los tiene aplicados. Al final de este documento se listan los
> **objetos de BD requeridos** por nombre para referencia.

---

## 1. Módulo de Contratos

### Backend

| Archivo | Qué | Por qué |
|---|---|---|
| `backend/src/services/contratoService.ts` | Helper `finalizarContratosVencidos()` que ejecuta `sp_Contrato_AutoFinalizar` antes de cada listado | Los contratos **solo finalizan por su `fecha_fin`** (se eliminó el botón "Finalizar"). Estrategia *lazy*: la BD se pone al día en cuanto alguien consulta. |
| `backend/src/controllers/contractoController.ts` | `createContrato` ahora recibe `numero_departamento` (no `id_departamento`); valida montos > 0; `getContratos` dispara la auto-finalización | Asignación por **número de departamento** (regla de negocio) y montos NOT NULL (rechazo 400 si ≤ 0). |
| `backend/src/controllers/departamentoController.ts` *(nuevo)* | CRUD de departamentos (listar, crear, actualizar, desactivar/reactivar) conectado a SPs | Nuevo módulo de administración de departamentos. |
| `backend/src/routes/departamentoRoute.ts` *(nuevo)* | Rutas `GET/POST/PUT/PATCH /api/departamentos` protegidas (JWT + 2FA + rol Administrador) | Mismo patrón de seguridad que las demás rutas del admin. |
| `backend/server.ts` | Registro de la ruta `/api/departamentos` | Exponer el nuevo módulo. |

### Frontend

| Archivo | Qué | Por qué |
|---|---|---|
| `src/pages/admin/ContratosPage.tsx` | Select de departamento **por número** (deshabilita ocupados/inactivos); inputs de montos con **máscara ₡** (formato CR sin decimales); se quitó el campo Observaciones y el departamento del formulario de edición; montos visibles en tabla y detalle | El contrato asigna departamento solo al crearlo; los montos se capturan/formatean en colones CR. |
| `src/pages/admin/DepartamentosPage.tsx` *(nuevo)* | CRUD completo: crear, ver, editar, habilitar/deshabilitar, filtros | Módulo nuevo solicitado. |
| `src/context/DataContext.tsx` | `departamentosData` + CRUD de departamentos; `crearContrato`/`editarContrato` por número de departamento; `recargarContratos` refresca también departamentos y `editarContrato` refresca residentes | Mantener los estados (Disponible/Ocupado) al día **sin recargar la página**. |

### Reglas de negocio implementadas
- Un departamento **Ocupado** no se puede deshabilitar (se valida en el SP
  `sp_Departamento_CambiarEstado` y en la UI con alerta explicativa).
- Al finalizar el contrato por fecha fin, el departamento vuelve a **Disponible**.
- Los montos (`monto_mensual`, `monto_deposito`) son **NOT NULL y > 0**.

---

## 2. Módulo de Residentes

| Archivo | Qué | Por qué |
|---|---|---|
| `src/pages/admin/ResidentesPage.tsx` | El detalle (Ver) muestra **"Documento de identidad" (cédula)** | Se solicitó; la vista `VW_Residentes` ya devolvía `cedula`. |
| `backend/sql/vw_Residentes.sql` → aplicado en BD | `estado_contrato`: `'Vencido'` → `'Finalizado'`; `'SinContrato'` → `'Sin Contrato'` | Unificar el lenguaje de estados en toda la app y que coincida con el filtro de la página. |

---

## 3. Moneda colones costarricenses (₡)

| Archivo | Qué | Por qué |
|---|---|---|
| `src/utils/formatters.ts` | `formatearMoneda` → `₡${Math.round(v).toLocaleString('es-CR')}` | Formato CR: **puntos para miles y sin decimales** (`₡1.235`), en toda la app. |
| `src/pages/admin/*` (Dashboard, Pagos, Areas, Contratos) | Strings y placeholders `$` → `₡`, montos con `formatearMoneda` | Toda la app habla colones. |
| `src/pages/inquilino/*` (ReservarArea, NuevaReserva, MisReservas) | Unificados al helper `formatearMoneda` | Antes usaban formato inline inconsistente (con comas). |
| `src/types/index.ts` | Comentarios "(USD)" → "(colones CR)" | Documentación actualizada. |

---

## 4. Sistema de diálogos personalizados (Alert / Confirm)

Reemplaza los diálogos nativos del navegador por modales con el estilo de la app.

| Archivo | Qué | Por qué |
|---|---|---|
| `src/components/Alert.tsx` *(nuevo)* | `AlertProvider` + `useAlert()` con `showAlert(mensaje, {titulo, tipo})` y `confirmar(mensaje, {titulo, confirmarTexto})` → `Promise<boolean>` | Consistencia visual, tema claro/oscuro, y comportamiento predecible (Escape/click fuera). |
| `src/styles/coomon.css` | Estilos `.alert-overlay`, `.alert-modal`, `.alert-icon-*` (z-index 400) | Reutilizan la base `.modal-overlay/.modal` existente. |
| `src/App.tsx` | `AlertProvider` registrado dentro de `ToastProvider` | Disponible para todos los paneles. |
| 10 páginas (admin, guardia, auth) | `alert()` nativo → `showAlert()` | Migración completa. |
| `src/pages/admin/ReservasPage.tsx`, `src/pages/inquilino/MisVisitantesPage.tsx` | `confirm()` nativo → `confirmar()` (async) | Migración completa de confirmaciones. |

---

## 5. Fix: tecla Enter en autenticación

| Archivo | Qué | Por qué |
|---|---|---|
| `src/pages/auth/LoginPage.tsx` | Los bloques Sign In / Sign Up ahora son `<form onSubmit>` con botones `type="submit"` | Antes eran `<div>` con botones comunes: **Enter no ejecutaba la acción**. |
| `src/pages/auth/TwoFactorPage.tsx` | Botón "Reenviar código" ahora `type="button"` | Evita que interfiera con el submit implícito de Enter (el botón "Verificar" es `type="submit"`). |
| `src/pages/auth/ForgotPasswordPage.tsx` | Ya tenía `<form onSubmit>` + botón submit (verificado, sin cambios) | Enter funcionaba correctamente. |

---

## 6. Limpieza de código muerto / relleno

| Archivo | Qué | Por qué |
|---|---|---|
| `backend/sql/` *(eliminada)* | Toda la carpeta de scripts SQL eliminada | A petición del cliente; los objetos ya están aplicados en la BD. |
| `src/components/Badge.tsx` | Switch con asignaciones muertas → mapa `VARIANT_CLASSES` | El inicializador `let variantClass = ''` se sobreescribía siempre (error de lint `no-useless-assignment`). |
| `src/pages/admin/AreasPage.tsx` | Parámetro `_id` sin usar en `openDrawer` eliminado | Código muerto (el modo editar lee el DOM por nombre). |
| `src/context/DataContext.tsx` | Setters sin consumidores eliminados del API del contexto (`setPersonalData`, `setResidentesData`, `setContratosData`, `setDepartamentosData`, `setReservasData`, `setVisitas`) | Exposición innecesaria: ningún componente los usaba. |
| `src/pages/admin/PagosPage.tsx` | Dependencia `pagosData` innecesaria en `useCallback` eliminada | Advertencia de `react-hooks/exhaustive-deps`. |
| `src/pages/admin/ContratosPage.tsx` | `any` intencionales documentados con `eslint-disable` | Acceso dinámico a claves que no existen en el tipo `Contrato` (compatibilidad API vs UI). |
| `backend/src/services/contratoService.ts` | Comentario ya no referencia `backend/sql/...` | La carpeta se eliminó; se deja solo el nombre del SP. |

---

## 7. Objetos de BD requeridos (aplicados en SQL Server)

| Objeto | Propósito |
|---|---|
| `sp_Contrato_Insertar` | Crea contrato por **cédula + número de departamento** con montos. |
| `sp_Contrato_Listar` | Lista contratos (incluye `monto_mensual`/`monto_deposito`). |
| `sp_Contrato_Actualizar` | Edita fechas y montos (`ISNULL` conserva montos ausentes). |
| `sp_Contrato_AutoFinalizar` | Marca 'Finalizado' los contratos con `fecha_fin` vencida y libera departamentos. |
| `sp_Departamento_Listar / Insertar / Actualizar / CambiarEstado` | CRUD de departamentos; `CambiarEstado` bloquea deshabilitar un departamento ocupado. |
| `VW_Contratos` | Vista con montos y estado `'Finalizado'` como red de seguridad. |
| `VW_Residentes` | Vista con `cedula`, `estado_contrato` unificado (`'Finalizado'` / `'Sin Contrato'`). |
| Tabla `Contrato` | Columnas `monto_mensual`/`monto_deposito` **NOT NULL**. |
| `TRG_Contrato_ActualizarDepartamento` (main) | Ocupa/libera `Departamento.estado` según el contrato activo. |

---

## 8. Recuperación de contraseña por correo

Flujo completo y **público** (sin JWT ni 2FA): el usuario pide el enlace, lo abre
con su token, define nueva contraseña y vuelve a `/login` (el 2FA aplica de nuevo
al iniciar sesión). Reutiliza la infraestructura del 2FA: `mailService` (Gmail
SMTP), bcrypt (10 rondas), transacciones mssql y el patrón de rate limit en
memoria. **No se crearon SPs nuevos**: la tabla `TokenRecuperacion` ya existe y
las consultas son parametrizadas inline (igual que el UPDATE de `Codigo2FA`).

### Backend

| Archivo | Qué | Por qué |
|---|---|---|
| `backend/src/services/mailService.ts` | Nueva `enviarCorreoRecuperacion({destino, nombre, enlace})` que reutiliza el **mismo transporte Gmail SMTP** del 2FA (con botón de enlace HTML y `escapeHtml`) | Enviar el enlace al correo real sin duplicar la configuración del transporte. |
| `backend/src/controllers/authController.ts` | `solicitarRecuperacion` (POST /recuperar-solicitar) y `restablecerContrasena` (POST /recuperar-restablecer) | El flujo completo del lado servidor (ver reglas abajo). |
| `backend/src/routes/authRoutes.ts` | Dos rutas **públicas** sin `authenticateToken` | El usuario olvidó su contraseña: no tiene sesión, no debe exigirse JWT ni 2FA. |

### Frontend

| Archivo | Qué | Por qué |
|---|---|---|
| `src/services/authService.ts` | `solicitarRecuperacion(correo)` y `restablecerContrasena(token, nuevaContrasena)` | Consumir los endpoints públicos nuevos. |
| `src/pages/auth/ForgotPasswordPage.tsx` | De demo a real: llama a la API, estados de carga/error/éxito | Antes solo simulaba el envío. |
| `src/pages/auth/RecuperarPasswordPage.tsx` *(nuevo)* | Formulario de nueva contraseña que lee `?token=` de la URL y valida la política client-side | Paso 2 del flujo; redirige a `/login` tras el éxito. |
| `src/App.tsx` | Ruta `/recuperar` registrada | Enlace del correo: `${FRONTEND_URL}/recuperar?token=...`. |

### Reglas de negocio / seguridad
- **Dualidad de correos**: busca en `correo` **Y** `correo_contacto` (solo
  `activo = 1`); el correo se envía **al campo donde coincidió**.
- **Respuesta siempre genérica**: `"Si el correo existe, recibirás instrucciones."`
  (anti-enumeración de usuarios).
- **Token seguro**: `crypto.randomBytes(32).toString('hex')` (64 chars), válido
  **10 minutos** (decisión del cliente: su spec tenía 1 h vs 20 min), de **uso
  único**; los tokens anteriores sin usar se invalidan.
- **Expiración comparada EN SQL Server** (`fecha_expira > SYSDATETIME()`, insert   con `DATEADD(MINUTE, 10, SYSDATETIME())`): evita el desfase de zona horaria del
   driver mssql (mismo fix que el 2FA).
- **Contraseña fuerte**: regex (mín 8, mayúscula, minúscula, número, símbolo)
  validada en backend (y espejo en frontend).
- **Rate limit**: máx. 3 solicitudes/hora por correo+IP (Map en memoria, mismo
  patrón que los intentos del 2FA) → 429.
- **Uso único garantizado**: `UPDLOCK` sobre `TokenRecuperacion` dentro de una
  transacción antes de actualizar la contraseña.
- Si el **correo falla** al enviarse, el token se invalida (el usuario nunca lo
  recibió) pero la respuesta sigue siendo genérica.
- Requiere tabla `TokenRecuperacion` (ya existe): `id_token, id_usuario, token,
  fecha_solicitud, fecha_expira, usado`.
- `FRONTEND_URL` en `backend/.env` (default `http://localhost:5173`): se usa para
  construir el enlace y ya se usaba para CORS en `server.ts`.
