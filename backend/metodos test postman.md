===================AREAS COMUNES=====================
Para ver en la DB SELECT * FROM dbo.AreaComun
 
Para ver todas las areas
GET http://localhost:4000/api/areas?id_usuario_actual=1

para insertar datos
POST http://localhost:4000/api/areas

{
  "nombre": "Gimnasio Principal",
  "capacidad_max": 15,
  "descripcion": "Gimnasio equipado con pesas y máquinas de cardio",
  "costo_por_hora": 2500.00,
  "hora_apertura": "06:00",
  "hora_cierre": "22:00",
  "max_reservas_semana": 3,
  "foto_principal": "https://ejemplo.com/imagenes/gimnasio.jpg"
}

Modificar
PUT http://localhost:4000/api/areas/ ID AREA




Borrar/desactivar
PAHT http://localhost:4000/api/areas/ ID DEL AREA /desactivar

{
    "id_usuario_actual": 2
}

=========================================================


PARA VISITAS:
http://localhost:4000/api/visitantes
==================================================================


para pagos
get http://localhost:4000/api/pagos?id_usuario_actual=1

EXEC sp_ListarPagos;

POST http://localhost:4000/api/pagos


para hacer pagos

para pagos de cualquier otro servicio
{
  "residente": "María Fernández",
  "concepto": "Cuota de Mantenimiento Agosto 2026",
  "monto": 45000,
  "fecha_pago": "2026-08-01T15:00:00.000Z",
  "tipo_pago": "SINPE Móvil",
  "estado": "Pagado",
  "id_reserva": null
}

para pagos de reserva
{
  "residente": "Alejandro Gómez",
  "concepto": "Reserva Sala de video juegos (2 horas)",
  "monto": 20000,
  "fecha_pago": "2026-08-01T11:20:00.000Z",
  "tipo_pago": "Transferencia",
  "estado": "Pendiente",
  "id_reserva": 6
}