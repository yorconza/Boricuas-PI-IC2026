# Documentación técnica — Condominio

> Referencia rápida de gotchas, objetos de BD, seguridad y reglas de negocio.
> **BD:** `CondominioDB` · **Scripts SQL:** aplicados directamente en la BD (no están en el repo).

---

## 1. Gotchas críticos

### Fechas y el driver `mssql`
- **Enviar fechas a SQL:** usar `sql.VarChar` con formato ISO (`'2026-08-14T00:00:00'`). **Nunca** `sql.DateTime2` ni objetos `Date` (el driver los desplaza por zona horaria local).
- **Recibir DATETIME2:** el driver serializa como UTC (`...T01:16:13.443Z`). Usar `toDateOnly`/`toTimeOnly` o parsear con regex; **nunca** `new Date(iso).getHours()`.
- **Comparar fechas:** hacerlo en SQL Server con `SYSDATETIME()`, no en Node.

### Convenciones de API
- Paginación: `{ pagina, limite, totalRegistros, totalPaginas, datos }`
- `id_usuario_actual` siempre del JWT (`req.user`), nunca del cliente.
- Cadena de middlewares: JWT → 2FA → sesión + `SET CONTEXT_INFO` → `authorizeRole`.
- Moneda: `₡1.235` (sin decimales). Nunca usar `$`.

---

## 2. Objetos de BD

| Módulo | SPs / Objetos principales |
|--------|---------------------------|
| Auth | `sp_LoginUsuario`, `sp_RegistrarInquilino`, `sp_GenerarCodigo2FA`, `sp_VerificarCodigo2FA`, `sp_CrearSesion`, `sp_CerrarSesion` |
| Contratos | `sp_Contrato_Insertar` (por cédula + n.º depto), `sp_Contrato_Listar`, `sp_Contrato_AutoFinalizar`, `VW_Contratos`, `TRG_Contrato_ActualizarDepartamento` |
| Reservas | `sp_CrearReservaPago` (calcula monto), `sp_CancelarReserva` (solo dueño + reembolso), `sp_FinalizarReservasVencidas` |
| Visitas | `sp_ListarVisitasDelDia`, `sp_ListarHistorialVisitantes`, `sp_RegistrarIngresoVisitante`, `VW_VisitanteDetalle` |
| Pagos | `sp_RegistrarPago`, `sp_ListarPagos`, `sp_ObtenerMetricasPagos`, `sp_ReportePagos`, `VW_AdministracionPagos` |
| Notificaciones | `sp_ListarNotificaciones`, `sp_MarcarNotificacionLeida`, `sp_CrearNotificacion` + triggers automáticos |
| Dashboard | `sp_Dashboard_ObtenerDatos` (4 result sets en 1 ejecución) |
| Reportes | `sp_ReportePagos`, `sp_ReporteVisitas`, `sp_ObtenerReporteContratos`, `sp_ObtenerReporteReservas` |

---

## 3. Seguridad

- **Login:** JWT temporal → 2FA por correo (6 dígitos, 5 min, 3 intentos) → JWT definitivo.
- **Recuperación:** token de 10 min, uso único, respuesta siempre genérica (anti-enumeración).
- **Sesión:** inactividad máx. 30 min. `SET CONTEXT_INFO` en pool `max: 1` para bitácora.
- **Roles:** Admin, Guarda, Inquilino. PDFs protegidos con fetch + token (no `window.open`).

---

## 4. Reglas de negocio clave

- **Contratos:** asignación por n.º de departamento; solo finalizan por `fecha_fin`; depto Ocupado no se deshabilita.
- **Reservas:** solo el inquilino dueño cancela; monto = horas × costo_por_hora; auto-finalización lazy antes de cada listado.
- **Visitas:** "Hoy" incluye Pendiente; historial excluye HOY y futuras.
- **Pagos:** inquilino paga monto_mensual ± 0.01; admin registra manualmente; notificación a todos los admins.
- **Notificaciones:** caducidad 24 h; polling cada 30 s + al enfocar ventana.

---

## 5. Auto-actualización

- **Backend:** scheduler cada 60 s para recordatorios de cancelación de reservas (30 min antes).
- **Frontend:** polling cada 30 s + `visibilitychange` en visitas, reservas, dashboard y notificaciones. Modo silencioso (sin "Cargando…").
