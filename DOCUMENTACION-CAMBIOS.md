# Documentación técnica — Condominio

> Documento de referencia con lo **concreto e importante** del proyecto:
> objetos de BD requeridos, reglas de negocio, actualización automática y los
> "gotchas" recurrentes. **No** es un changelog de cada actualización. Los
> scripts SQL de los SPs/vistas/triggers viven en el script de BD del proyecto
> (ya aplicados en CondominioDB); aquí solo se describe su comportamiento.

---

## 1. Gotchas del proyecto (leer antes de tocar fechas o APIs)

### 1.1 Driver `mssql` + fechas (causa de la mayoría de bugs "de hora")

- **Enviar** parámetros de fecha a SQL Server: usar `sql.VarChar` con ISO
  (`'2026-08-14T00:00:00'`), NUNCA `sql.DateTime2` ni objetos `Date`: el driver
  los desplaza por la zona horaria local (+6 h) y el rango llega corrido a la BD.
- **Recibir** DATETIME2: el driver lo serializa como UTC (`...T01:16:13.443Z`).
  Para mostrar la hora de pared que guardó la BD, usar `toDateOnly`/`toTimeOnly`
  (componentes UTC) o parsear el string con regex; **nunca** `new Date(iso)` +
  `getHours()` (desfasa a la zona local del navegador).
- Expiración y "hoy": comparar EN SQL Server con `SYSDATETIME()` (p. ej.
  `fecha_expira > SYSDATETIME()` o `CAST(fecha AS DATE) = CAST(SYSDATETIME() AS DATE)`),
  no traer la fecha al Node para comparar.

### 1.2 Convenciones de API

- Paginación estándar: `{ pagina, limite, totalRegistros, totalPaginas, datos }`;
  `pageNumber ≥ 1`, `pageSize` 1–200 (def. 50). Los campos `total_registros`/
  `total_paginas` repetidos por fila se limpian.
- `id_usuario_actual` SIEMPRE del JWT (`req.user`), nunca del cliente.
- Cadena de middlewares: JWT (401) → 2FA verificado (403) → sesión activa +
  `SET CONTEXT_INFO` (401) → `authorizeRole` (403). El pool usa `max: 1` para
  que el `CONTEXT_INFO` persista (auditoría por trigger de bitácora).
- Reportes PDF que exigen token: descargar con fetch + `Authorization: Bearer`
  (blob → descarga); no sirven con `window.open`.
- Fechas `YYYY-MM-DD` se expanden a rango completo del día
  (`T00:00:00` / `T23:59:59.999`) antes de enviarse a los SPs.
- Formato de moneda: `formatearMoneda` → `₡1.235` (puntos para miles, sin
  decimales, es-CR). Nunca usar `$`.

---

## 2. Objetos de BD requeridos (ya aplicados en CondominioDB)

Los scripts `.sql` se entregaron durante el desarrollo y se eliminaron del
repositorio a petición del cliente; la BD ya los tiene. Esta es la referencia
de lo que la app espera:

| Módulo | Objetos |
|---|---|
| Contratos | `sp_Contrato_Insertar` (por cédula + número de depto, montos > 0), `sp_Contrato_Listar`, `sp_Contrato_Actualizar`, `sp_Contrato_AutoFinalizar`, `VW_Contratos`, `TRG_Contrato_ActualizarDepartamento` (ocupa/libera el depto), `TRG_Contrato_ValidarDisponibilidad` (INSTEAD OF INSERT) |
| Departamentos | `sp_Departamento_Listar/Insertar/Actualizar/CambiarEstado` (`CambiarEstado` bloquea deshabilitar un depto Ocupado) |
| Residentes | `VW_Residentes` (con `cedula` y `estado_contrato` unificado: `'Finalizado'` / `'Sin Contrato'`) |
| Autenticación | `sp_RegistrarInquilino`, `sp_LoginUsuario`, `sp_CrearSesion` / `sp_CerrarSesion`, `sp_VerificarYExpirarSesion` (inactividad 30 min), `sp_GenerarCodigo2FA` / `sp_VerificarCodigo2FA` |
| Recuperación | Tabla `TokenRecuperacion` (sin SPs nuevos; consultas parametrizadas inline) |
| Guardia | `sp_ObtenerResumenVisitasHoy`, `sp_ListarProximasVisitas`, `sp_ListarVisitasEsperadas`, `sp_ListarHistorialVisitas_Del_Dia` (solo decididas del día), `sp_ObtenerDetalleVisitante`, `sp_RegistrarIngresoVisitante` |
| Visitas (admin) | `sp_ListarVisitasDelDia` *(nuevo)*, `sp_ListarHistorialVisitantes` *(modificado)*, `sp_ObtenerDetalleVisitante`, vista `VW_VisitanteDetalle` |
| Notificaciones | `sp_ListarNotificaciones`, `sp_MarcarNotificacionLeida`, `sp_MarcarTodasNotificacionesLeidas`, `sp_CrearNotificacion`; tabla `Notificacion` (se llena con triggers) |
| Reservas | `sp_CrearReservaPago` (calcula el monto en el servidor), `sp_CancelarReserva` (solo el dueño + reembolso) |
| Pagos | `sp_RegistrarPago` (manual), `sp_RegistrarPagoContrato`, `sp_ListarPagos`, `sp_ObtenerMetricasPagos`, `sp_ReportePagos`, `VW_AdministracionPagos` |
| Reportes | `sp_ReporteVisitas`, `sp_ObtenerReporteContratos`, `sp_ObtenerReporteReservas`, `VW_ReportePagos` |
| Dashboard | `sp_Dashboard_ObtenerDatos` (1 sola ejecución, 4 result sets: KPIs / próximas reservas / alertas / actividad) |

---

## 3. Cambios de BD importantes (aplicados; script en el proyecto)

| Objeto | Comportamiento |
|---|---|
| `TRG_Contrato_ValidarDisponibilidad` (INSTEAD OF INSERT) | Valida que el depto no esté Ocupado e incluye `monto_mensual`/`monto_deposito` en su INSERT (antes los dejaba en NULL/0.00) |
| `sp_ListarVisitasDelDia` *(nuevo)* | Visitas de HOY en CUALQUIER estado (Pendiente | Autorizado | Rechazado), con búsqueda y filtro de estado |
| `sp_ListarHistorialVisitantes` *(modificado)* | Filtra `fecha_hora_estimada < HOY`: el historial NUNCA muestra HOY ni visitas futuras |
| `sp_CancelarReserva` | Solo el inquilino DUEÑO de la reserva; solo reservas activas; reembolso según anticipación; notifica a los Administradores (fuera de la transacción) |
| `sp_CrearReservaPago` | Ya NO recibe `@monto`: calcula `DATEDIFF(HOUR, ...) × costo_por_hora` y lo devuelve como `monto_pagado`; valida rol, fechas, horario, capacidad, traslape, límite semanal y método de pago |
| `sp_Dashboard_ObtenerDatos` | 4 result sets en una ejecución; KPI `ingresos_del_dia` = suma de TODOS los pagos del día (sin filtrar por `estado_pago`) |

---

## 4. Seguridad

### 4.1 Autenticación (JWT + 2FA + sesión)

- Login → JWT **temporal** (`2faVerified: false`); las rutas sensibles exigen
  el JWT **definitivo** (2FA verificado). `logout` y `me` no exigen 2FA a
  propósito.
- 2FA: código de 6 dígitos por correo (Gmail SMTP), expira en 5 min, 3 intentos
  → 429, reenvío controlado (nunca dos códigos vigentes). Admin/Guarda reciben
  el código en `correo_contacto`; los inquilinos en `correo`.
- Sesión: inactividad máxima 30 min → 401. `SET CONTEXT_INFO` en la misma
  conexión (pool `max: 1`) para que la bitácora registre al usuario real.

### 4.2 Recuperación de contraseña (público, sin JWT)

- Endpoints públicos `POST /api/auth/recuperar-solicitar` y
  `/recuperar-restablecer`; enlace `${FRONTEND_URL}/recuperar?token=...`.
- Respuesta SIEMPRE genérica (anti-enumeración). Token `crypto.randomBytes(32)`
  (64 chars), 10 min de vida, uso único (`UPDLOCK`), los anteriores sin usar se
  invalidan. Expiración comparada EN SQL Server con `SYSDATETIME()`.
- Contraseña fuerte: mín. 8, mayúscula, minúscula, número, símbolo (backend +
  frontend). Rate limit 3/hora por correo+IP (memoria) → 429. Si el correo
  falla, el token se invalida.

### 4.3 Roles y rutas

- Todas las rutas usan la cadena JWT → 2FA → sesión → `authorizeRole`.
- `/api/visitas/historial` y `/api/reportes/*` (los 4 reportes) → solo
  Administrador. `/api/visitas/hoy` y `/detalle/:id` → Admin | Guarda.
- **Corrección de seguridad:** los PDFs de contratos y reservas eran PÚBLICOS
  (`window.open`); ahora exigen JWT + 2FA + sesión + rol y se descargan con
  fetch + token. Los RAISERROR de permisos de los SPs se traducen a HTTP 403.

---

## 5. Reglas de negocio por módulo

### 5.1 Contratos y Departamentos

- Asignación por **número de departamento** (no id); montos `NOT NULL > 0` y
  formateados en ₡.
- Los contratos **solo finalizan por `fecha_fin`** (`sp_Contrato_AutoFinalizar`
  se ejecuta *lazy* antes de cada listado); al finalizar, el depto vuelve a
  Disponible. Un depto Ocupado no se puede deshabilitar.
- **Fix cédula:** `sp_Contrato_Insertar` busca por cédula con igualdad exacta y
  el formato de guiones puede variar; el controlador resuelve el usuario por
  DÍGITOS (`REPLACE(cedula, '-', '')`) y envía la cédula exacta almacenada.
- La cédula es **obligatoria** en el sign up (backend valida 400).

### 5.2 Visitas (panel Admin)

- Endpoints: `GET /api/visitas/hoy` → `sp_ListarVisitasDelDia`;
  `GET /api/visitas/historial` → `sp_ListarHistorialVisitantes` (paginado);
  `GET /api/visitas/detalle/:id` → `sp_ObtenerDetalleVisitante`.
- "Hoy" incluye Pendiente en el filtro de estado; el selector de fechas del
  Historial no permite elegir hoy ni futuras (`max = ayer`).
- El módulo de Guardia NO se tocó: sigue usando sus propios SPs.

### 5.3 Notificaciones

- La campana se alimenta de la tabla `Notificacion` (triggers: visitas,
  reservas, pagos, altas). Polling cada 30 s + al volver a la pestaña
  (ver §6.2).
- **Caducidad 24 h:** el backend borra best-effort las notificaciones con
  `fecha_envio < DATEADD(HOUR, -24, SYSDATETIME())`; el frontend también filtra
  las de más de 24 h (red de seguridad).
- Aislamiento por usuario: `id_usuario` del JWT; marcar como leída valida la
  pertenencia. `@limite` 1–100 (frontend pide 50). Tipos desconocidos se
  humanizan automáticamente.

### 5.4 Reservas

- **Solo el inquilino dueño cancela** (`PATCH /api/inquilino/reservas/:id` →
  `sp_CancelarReserva`); el admin no cancela. Reembolso según anticipación.
- `sp_CrearReservaPago` calcula el monto (horas enteras × costo_por_hora); la
  UI solo ofrece bloques de hora en punto para que el estimado coincida.
- **Auto-finalización de reservas vencidas**: nuevo `backend/src/services/reservaService.ts`
  con `finalizarReservasVencidas()` (espejo de `finalizarContratosVencidos`).
  Ejecuta `sp_FinalizarReservasVencidas` —marca `'Finalizada'` las reservas
  `Confirmada`/`Reservado` cuya fecha ya pasó o que HOY ya tienen `hora_fin`
  vencida— de forma *lazy* antes de cada listado (admin: `/reservas`,
  `/reservas/hoy`, `/reservas/historial`; inquilino: `sp_ListarMisReservas` y
  `sp_ObtenerMiProximaReserva`). El helper nunca lanza: si falla, el listado
  sigue igual. `'Finalizada'` se agregó a los filtros de estado de
  `ReservasPage`.
- **Historial paginado (panel admin)**: `sp_ConsultarHistorial` ahora recibe
  `@solo_historial` (1 = solo días anteriores a hoy), `@page_number` y
  `@page_size` (NULL = sin paginar, para que `GET /api/reservas` siga
  devolviendo el listado completo de DataContext). Nuevo endpoint
  `GET /api/reservas/historial` → `{ pagina, limite, totalRegistros,
  totalPaginas, datos }` (mismo formato que `/api/visitas/historial`); el
  controlador limpia los `total_registros`/`total_paginas` que repite el SP
  por fila. La pestaña "Historial" de `ReservasPage` replica los controles de
  paginación de Visitas (debounce, contador de peticiones, `Anterior/páginas/
  Siguiente`, registros por página 25/50/100 y rango de fechas).

### 5.5 Pagos de alquiler (Mis Contratos + Gestión de Pagos)

- Inquilino: "Mis Contratos" (`GET /api/contratos/mis-contratos` y
  `/api/contratos/:id/pagos` → consultas directas a `Contrato`/`Pago` porque
  `sp_Contrato_Listar` solo permite Administrador). Paga con pasarela simulada
  (monto = `monto_mensual` ± 0.01; métodos `tarjeta`/`efectivo`/`sinpe` →
  `Tarjeta`/`Efectivo`/`Transferencia`).
- Admin: "Gestión de Pagos" con métricas, filtros, paginación y categoría
  calculada (`Reserva`/`Contrato`/`Administrativo`); pago manual; reporte PDF
  (`sp_ReportePagos`). El pago NO cambia el estado del contrato.
- Notificación `PAGO_CONTRATO` a todos los administradores (best-effort, sin
  símbolo `₡` en el mensaje: `@mensaje` es VARCHAR y `₡` se volvería `?`).

### 5.6 Dashboard del Admin

- Un solo SP `sp_Dashboard_ObtenerDatos` con 4 result sets; si falla, devuelve
  el dashboard vacío (no cae).
- "Actividad reciente" = seguimiento LOCAL del admin (localStorage por usuario,
  máx. 50 ítems), no la bitácora global: registra crear/editar contratos,
  residentes, personal, deptos, áreas, pagos manuales y exportaciones de PDF.

### 5.7 Reportes

- 4 reportes (pagos, visitas, contratos, reservas) con el mismo estándar:
  rutas protegidas, descarga con token, rango de fechas en el nombre del
  archivo.
- `PdfService` resuelve cada celda por **alias** (`obtenerCampo`), porque los
  SPs/vistas nombran las columnas distinto según la instancia (p. ej.
  `fecha_pago` vs `fecha`, `nombre_visitante` vs `nombre_completo`).
- **Rango de fechas:** pagos y visitas comparan `CAST(fecha AS DATE) <=
  @fecha_fin` (inclusivo por fecha) → NO sumar 1 día; contratos/reservas
  devuelven `VARCHAR(10)` sin desfase de zona.

### 5.8 Áreas comunes (imágenes)

- Subida de imagen estilo perfil: `backend/uploads/areas/`, MIME whitelist
  (JPG/PNG/GIF/WEBP), 2 MB, magic bytes validados, rutas relativas
  (`/uploads/areas/...`), borrado seguro con `basename`, PUT sin imagen
  preserva la actual (enviar `''`/`NULL` la elimina).

---

## 6. Actualización automática (scheduler + polling)

La app se actualiza sola en dos niveles: un **scheduler en el backend** para
avisos que dependen del paso del tiempo, y **polling en el frontend** (cada
30 s y al volver a enfocar la ventana) para que los datos cambien sin recargar.

### 6.1 Scheduler en el backend — recordatorio de cancelación de reservas

`backend/src/services/recordatorioReservaService.ts` — ciclo cada **60 s**:

- Busca reservas **ACTIVAS** (excluye `Cancelado`/`Completado`/`Finalizado`/
  `Cancelada`) que inician en **30–35 min** y que aún NO tienen una notificación
  `RECORDATORIO_CANCELACION` con su `id_referencia` → avisa **una sola vez**
  aunque el servicio se reinicie (ventana de tolerancia para no perder el aviso
  si el proceso corre tarde).
- Por cada una crea la notificación del inquilino con `sp_CrearNotificacion`:
  "Tu reserva de {área} comienza en 30 minutos. Puedes cancelarla desde Mis
  Reservas."
- Arranca con el servidor (`iniciarRecordatoriosReserva()`, primer ciclo
  inmediato) y se detiene limpio en SIGINT/SIGTERM. Un error del ciclo se
  registra y se reintenta al minuto siguiente; nunca tumba el servidor.
- Se eligió un scheduler y no un trigger porque la tabla `Notificacion` se
  llena con triggers de eventos, pero un trigger no puede avisar por el *paso
  del tiempo*.

### 6.2 Polling en el frontend (cada 30 s + al enfocar la ventana)

Todas usan el mismo patrón: `setInterval` de 30 s + listener `window.focus`,
en modo **silencioso** (no activa "Cargando…" ni pisa el banner de error) y
**respetando la búsqueda/filtro vigentes**. Un contador de peticiones descarta
respuestas viejas para que una carga anterior no pise a la más reciente.

| Módulo | Qué se refresca |
|---|---|
| Notificaciones (`DataContext`) | Polling cada 30 s mientras hay sesión + al volver a la pestaña (`visibilitychange`); el dropdown refresca los tiempos relativos al abrirse |
| Visitas "Hoy" (admin, `VisitasPage`) | La lista del día: decisiones del guardia y pendientes nuevas |
| Reservas "Hoy" (admin, `ReservasPage`) | Las reservas del día (cancelaciones/creaciones del inquilino); filtro con fecha local (`getLocalDateString`, no UTC) |
| Dashboard del Guardia (`GuardiaDashboard`) | KPIs y próximas visitas |
| Visitas del Guardia (`GuardiaVisitas`) | La pestaña activa (visitas esperadas / historial del día) |
| Mis Visitantes (inquilino, `MisVisitantesPage`) | El estado de las solicitudes (Autorizado/Rechazado) |

---

## 7. Otros cambios relevantes (una línea cada uno)

- **Diálogos**: se reemplazó `alert()`/`confirm()` nativos por
  `AlertProvider`/`useAlert()` (`showAlert`, `confirmar` → Promise).
- **Enter en auth**: Login/Sign Up ahora son `<form onSubmit>`; botones
  `type="submit"`.
- **Recuperación**: página `/recuperar` nueva (lee `?token=`), enlace en el
  correo; `ForgotPasswordPage` pasó de demo a API real.
- **Registrar Visitante** ya no redirige a "Mis Visitantes" (solo limpia el
  formulario + toast).
- **Horas de notificaciones**: el "hace X min/h" se ancla al reloj del
  servidor SQL. El backend devuelve `SYSDATETIME()` como `ahora_bd` junto a
  las notificaciones (`{ ahora_bd, datos }`) y el frontend calcula la edad con
  `timestampAncladoABD()`: `hora_de_pared(fecha_envio) − (hora_de_pared(ahora_bd)
  − Date.now())`. Así el desfase de zona/reloj del servidor ya no corre la
  edad de ninguna notificación en los 3 paneles (el dropdown de la campana es
  compartido por Admin/Guarda/Inquilino). Sin `ahora_bd` cae al
  comportamiento anterior.
- **Fechas sin 'Z' (fix capa de aplicación)**: la BD guarda la hora local
  correcta con `SYSDATETIME()` (UTC-6: 13:32 local = 19:32 UTC); el único
  punto del pipeline donde la fecha "parecía" UTC era el driver mssql, que
  serializa los DATETIME2 con 'Z' ("...T13:32:07.063Z"). El backend ahora
  envía `fecha_envio` y `ahora_bd` como strings LOCALES sin la 'Z'
  (`fechaLocalSinZ()`, usa getUTC* porque el driver conserva los componentes).
  La DB NO se toca (ni triggers ni DEFAULT). El parser del frontend acepta
  ambos formatos (test de regresión: ISO sin 'Z' ≈ ahora).
- **Limpieza de mocks**: eliminado `src/data/sampleData.ts` y todas las
  referencias; los únicos mocks restantes son los de pruebas unitarias y la
  pasarela de pago simulada (característica del producto).

---

## 8. Verificación

- `npx tsc -b` (frontend) y `npx tsc --noEmit` (backend) pasan.
- `npm test` → 86 tests (vitest).
- Los SPs de visitas (§3) se verificaron en BD: la visita pendiente de HOY
  aparece en `sp_ListarVisitasDelDia`; `sp_ListarHistorialVisitantes` devuelve
  0 filas para HOY aunque se pida `@FechaFin = hoy`.
