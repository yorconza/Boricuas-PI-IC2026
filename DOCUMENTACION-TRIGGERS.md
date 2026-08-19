# Triggers de la BD — Propósito y alcance

> **Fecha:** 2026-08-17 · **BD:** `CondominioDB`
>
> Este documento explica para qué sirven los triggers de validación de `Reserva` y
> `AreaComun`, y por qué existen **solo a nivel de base de datos** como red de
> seguridad, cuando la aplicación ya valida esas mismas reglas en el
> procedimiento `sp_CrearReservaPago`.

---

## 1. Resumen ejecutivo

La aplicación **nunca inserta ni modifica reservas directamente**: todo pasa por
el procedimiento almacenado `sp_CrearReservaPago`, que valida cada regla de
negocio **antes** de tocar la tabla (con mensajes amigables para el usuario).

Los triggers de validación sobre `Reserva` existen **únicamente como defensa en
profundidad a nivel de BD**: si en el futuro alguien inserta o actualiza filas
por fuera de la app (script de mantenimiento, migración de datos, otro módulo,
o un error en el SP), la base de datos **rechaza la operación** en lugar de
guardar datos inválidos.

| Capa | Qué valida | Cuándo se dispara | Mensaje al usuario |
|---|---|---|---|
| **App / `sp_CrearReservaPago`** | Todas las reglas | Antes de insertar | Sí, mensaje amigable |
| **Triggers de `Reserva`** | Las mismas reglas | Después del INSERT/UPDATE | No (error genérico de BD) |

En condiciones normales el usuario **nunca ve** el error de un trigger: el SP
bloquea la operación primero. Los triggers son la última línea de defensa.

---

## 2. Mapa: trigger vs. validación del SP

`sp_CrearReservaPago` valida, en orden:

1. Rol del usuario (`Inquilino`).
2. Fecha no pasada.
3. `hora_fin > hora_inicio`.
4. El área existe y está `Disponible`.
5. Horario dentro del rango del área (`hora_apertura`–`hora_cierre`).
6. `cantidad_personas <= capacidad_max`.
7. **Sin traslape** con otras reservas activas (`Reservado`/`Confirmada`).
8. **Sin traslape** con ventanas de mantenimiento (`AreaMantenimiento`).
9. **Límite semanal** por área (`max_reservas_semana`).
10. Método de pago válido.

Cada trigger de validación replica **una** de esas reglas como respaldo:

| Trigger | Tabla / evento | Regla que respalda (duplicada del SP) |
|---|---|---|
| `TRG_Reserva_EvitarTraslape` | `Reserva` AFTER INSERT, UPDATE | Regla 7: no traslape con reservas activas |
| `TRG_Reserva_ValidarHorarioArea` | `Reserva` AFTER INSERT, UPDATE | Regla 5: horario dentro del rango del área |
| `TRG_Reserva_ValidarCapacidad` | `Reserva` AFTER INSERT, UPDATE | Regla 6: no exceder `capacidad_max` |
| `TRG_Reserva_LimiteSemanalPorArea` | `Reserva` AFTER INSERT | Regla 9: límite semanal por área |
| `TRG_Reserva_CancelacionYReembolso` | `Reserva` AFTER UPDATE | Regla extra: al cancelar, calcula reembolso y bloquea cancelar reservas ya iniciadas |
| `TRG_AreaComun_ValidarHorarioUpdate` | `AreaComun` AFTER UPDATE | ⚠️ NO está en el SP — ver sección 4 |

> `TRG_Reserva_CancelacionYReembolso` se dispara cuando una reserva cambia a
> `'Cancelado'`: rechaza la cancelación si la reserva ya inició/finalizó y
> actualiza el estado del pago (`Reembolsado` / `SinReembolso`) según la
> anticipación. La app también hace esto en `sp_CancelarReserva`.

---

## 3. Detalle de cada trigger de validación

### 3.1 `TRG_Reserva_EvitarTraslape`
- **Tabla:** `Reserva` · **Evento:** AFTER INSERT, UPDATE
- **Función:** rechaza (ROLLBACK) cualquier fila cuyo horario se traslape con
  otra reserva activa (`estado IN ('Reservado','Confirmada')`) del mismo área y
  fecha.
- **Estado:** redundante con `sp_CrearReservaPago` (regla 7).

### 3.2 `TRG_Reserva_ValidarHorarioArea`
- **Tabla:** `Reserva` · **Evento:** AFTER INSERT, UPDATE
- **Función:** rechaza reservas fuera del horario de operación del área.
- **Estado:** redundante con `sp_CrearReservaPago` (regla 5).

### 3.3 `TRG_Reserva_ValidarCapacidad`
- **Tabla:** `Reserva` · **Evento:** AFTER INSERT, UPDATE
- **Función:** rechaza reservas cuya `cantidad_personas` excede la
  `capacidad_max` del área.
- **Estado:** redundante con `sp_CrearReservaPago` (regla 6).

### 3.4 `TRG_Reserva_LimiteSemanalPorArea`
- **Tabla:** `Reserva` · **Evento:** AFTER INSERT
- **Función:** rechaza la reserva que supere `max_reservas_semana` del área
  para el mismo usuario en la misma semana.
- **Estado:** redundante con `sp_CrearReservaPago` (regla 9).
- **Nota:** el 2026-08-17 se corrigió para que cuente las reservas en estado
  `'Confirmada'` (las que crea la app) además de `'Reservado'` (cambio
  aplicado directamente en la BD mediante `ALTER TRIGGER`).

### 3.5 `TRG_Reserva_CancelacionYReembolso`
- **Tabla:** `Reserva` · **Evento:** AFTER UPDATE
- **Función:** al pasar una reserva a `'Cancelado'`, bloquea la cancelación si
  ya inició y actualiza el estado del pago (reembolso según anticipación).
- **Estado:** duplica la lógica de `sp_CancelarReserva` (respaldo a nivel BD).

---

## 4. ⚠️ Excepción: `TRG_AreaComun_ValidarHorarioUpdate` — NO está duplicado

Este trigger **no es redundante** con `sp_CrearReservaPago`:

- Se dispara al **actualizar un área** (`AreaComun` AFTER UPDATE), no al crear
  reservas.
- Su función: impide **reducir el horario de un área** (adelantar la apertura o
  atrasar el cierre) si existen reservas futuras activas que quedarían fuera
  del nuevo horario.
- La aplicación **no valida esto en ningún lado** (el backend solo envía los
  datos al SP). Si se borrara, un administrador podría reducir el horario de un
  área y "pisar" reservas ya confirmadas.

**Conclusión: este trigger debe conservarse.** Es la única barrera para esa
regla y se dispara con el flujo normal de la app (editar un área).

---

## 5. Otros triggers de la BD (contexto)

Además de los de validación, la BD tiene dos familias más de triggers:

### 5.1 Triggers de bitácora (`TRG_Bitacora_*`)
- Se disparan en INSERT/UPDATE/DELETE de sus tablas y registran la operación en
  `Bitacora`, usando `fn_UsuarioSesion` (lee el `CONTEXT_INFO` que el backend
  establece por petición).
- **Uso:** el panel de Bitácora de la app lee esos registros
  (`sp_ObtenerBitacora`). No son redundantes: la app **no** escribe la bitácora.

### 5.2 Triggers de notificación (`TRG_Notificacion_*`)
- Se disparan ante eventos de negocio (reserva creada/cancelada, visita
  registrada, pago, etc.) e insertan avisos en `Notificacion`.
- **Uso:** alimentan la campana de notificaciones de la app.
- **Nota:** algunos flujos también crean notificaciones desde la app
  (`sp_CrearNotificacion`), lo que puede generar avisos duplicados en ciertos
  casos — revisar si se observan duplicados.

---

## 6. Conclusión y recomendación

| Trigger | ¿Redundante con la app? | ¿Se puede borrar? |
|---|---|---|
| `TRG_Reserva_EvitarTraslape` | Sí (SP regla 7) | Opcional — red de seguridad |
| `TRG_Reserva_ValidarHorarioArea` | Sí (SP regla 5) | Opcional — red de seguridad |
| `TRG_Reserva_ValidarCapacidad` | Sí (SP regla 6) | Opcional — red de seguridad |
| `TRG_Reserva_LimiteSemanalPorArea` | Sí (SP regla 9) | Opcional — red de seguridad |
| `TRG_Reserva_CancelacionYReembolso` | Sí (`sp_CancelarReserva`) | Opcional — red de seguridad |
| `TRG_AreaComun_ValidarHorarioUpdate` | **No** | **NO borrar** (única barrera) |

**Recomendación:** conservar todos como red de seguridad de la BD. Su costo de
mantenimiento es prácticamente nulo y garantizan la integridad de los datos
aunque alguien escriba por fuera de la aplicación.
