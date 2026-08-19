# 🐳 Guía: SQL Server en Docker — Zona Horaria

## El problema

La imagen `mcr.microsoft.com/mssql/server:latest` usa **UTC por defecto**. Si tu equipo está en America/Costa_Rica (UTC-6), hay un desfase de 6 horas que causa:

- ❌ No se pueden registrar visitantes en horas futuras
- ❌ Las reservas del día no aparecen
- ❌ La auto-finalización de reservas se ejecuta en el momento incorrecto
- ❌ Los filtros "de HOY" muestran datos del día anterior



---

## Solución: Configurar la zona horaria en Docker

### Opción 1: Docker CLI (recomendada para desarrollo)

```bash
docker run -e "ACCEPT_EULA=Y" \
           -e "SA_PASSWORD=TuContraseña123!" \
           -e "TZ=America/Costa_Rica" \
           -p 1433:1433 \
           --name sqlserver-condominio \
           -d mcr.microsoft.com/mssql/server:latest
```

### Opción 2: docker-compose.yml (recomendada para el equipo)

Crear un archivo `docker-compose.yml` en la raíz del proyecto:

```yaml
version: '3.8'

services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:latest
    container_name: sqlserver-condominio
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=TuContraseña123!
      - TZ=America/Costa_Rica    # ← ¡CLAVE! Ajustar a tu zona horaria
    ports:
      - "1433:1433"
    volumes:
      - sqlserver-data:/var/opt/mssql

volumes:
  sqlserver-data:
```

Luego ejecutar:

```bash
docker-compose up -d
```

### Opción 3: Modificar el Dockerfile existente

Si ya tienen un Dockerfile:

```dockerfile
FROM mcr.microsoft.com/mssql/server:latest

# Configurar zona horaria
ENV TZ=America/Costa_Rica
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Resto del Dockerfile...
```

---

## Zonas horarias comunes en Latinoamérica

| País | Zona horaria | Variable TZ |
|------|-------------|-------------|
| Costa Rica | UTC-6 | `America/Costa_Rica` |
| Colombia | UTC-5 | `America/Bogota` |
| México (CDMX) | UTC-6 | `America/Mexico_City` |
| Perú | UTC-5 | `America/Lima` |
| Chile | UTC-3/-4 | `America/Santiago` |
| Argentina | UTC-3 | `America/Argentina/Buenos_Aires` |
| Ecuador | UTC-5 | `America/Guayaquil` |
| Panamá | UTC-5 | `America/Panama` |
| Guatemala | UTC-6 | `America/Guatemala` |
| Honduras | UTC-6 | `America/Tegucigalpa` |
| El Salvador | UTC-6 | `America/El_Salvador` |
| Nicaragua | UTC-6 | `America/Managua` |
| Uruguay | UTC-3 | `America/Montevideo` |
| Venezuela | UTC-4 | `America/Caracas` |

---

## Verificar que funciona

### 1. Verificar la zona horaria en Docker

```bash
# Entrar al contenedor
docker exec -it sqlserver-condominio bash

# Ver zona horaria
date
# Debe mostrar la hora local, NO UTC

# Ver zona horaria de SQL Server
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -Q "SELECT SYSDATETIME() AS fecha_actual"
```

### 2. Verificar desde el backend

Al iniciar el servidor Node, debería mostrar:

```
✅ Reloj de la BD sincronizado con este servidor (desfase 0 min).
```

Si muestra `⚠️ Reloj de la BD desfasado ...`, significa que la zona horaria no está configurada correctamente.

### 3. Verificar en la consola del navegador

Los errores de "no se pueden registrar visitantes en horas futuras" deberían desaparecer.

---

## Si no pueden cambiar la zona horaria de Docker

Si por alguna razón no pueden configurar `TZ` en Docker, existe una alternativa en el backend:

1. Crear un archivo `.env` en la raíz del backend:

```env
DB_TIMEZONE=UTC
```

Esto le dice al backend que use UTC al construir fechas, igualando lo que SQL Server en Docker devuelve. **Nota:** Esto solo funciona si el frontend también envía fechas en UTC.

---

## Diagnóstico rápido

Si un compañero tiene problemas, pedirle que:

1. **Abra la consola del backend** y busque la línea:
   - `✅ Reloj de la BD sincronizado` → Todo bien
   - `⚠️ Reloj de la BD desfasado` → Problema de zona horaria

2. **Ejecute en Docker**:
   ```bash
   docker exec -it sqlserver-condominio date
   ```
   Si muestra hora UTC (ej: `18 ago 2026 21:00:00`) en vez de hora local (ej: `18 ago 2026 15:00:00`), falta configurar `TZ`.

3. **Verifique el archivo `.env`** del backend tenga `DB_TIMEZONE` configurado (opcional pero recomendado).

---

## Resumen para el equipo

```bash
# 1. Parar el contenedor actual
docker stop sqlserver-condominio
docker rm sqlserver-condominio

# 2. Levantar con timezone correcta
docker run -e "ACCEPT_EULA=Y" \
           -e "SA_PASSWORD=TuContraseña123!" \
           -e "TZ=America/Costa_Rica" \
           -p 1433:1433 \
           --name sqlserver-condominio \
           -d mcr.microsoft.com/mssql/server:latest

# 3. Recrear la base de datos (si es necesario)
# O ejecutar el script de inicialización

# 4. Iniciar el backend
cd backend && npm run dev
```

¡Listo! Las horas deberían funcionar correctamente. 🎉
