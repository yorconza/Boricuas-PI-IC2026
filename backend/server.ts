import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getConnection } from './src/config/confDB.js';

import personalRoute from './src/routes/personalRoute.js';
import residenteRoute from './src/routes/residenteRoute.js';
import contratoRoute from './src/routes/contratoRoute.js';
import reservaRoutes from './src/routes/reservaRoute.js';

import authRoutes from './src/routes/authRoutes.js';
import guardRoute from './src/routes/guardRoute.js';
import visitantesRoutes from './src/routes/visitantesRoutes.js';
import perfilRoute from './src/routes/perfilRoute.js';
import areaRoute from './src/routes/areaRoute.js';
import departamentoRoute from './src/routes/departamentoRoute.js';
import bitacoraRoute from './src/routes/bitacoraRoute.js';
import notificacionRoute from './src/routes/notificacionRoute.js';
import pagosRoute from './src/routes/pagosRoute.js';
import contratoInquilinoRoute from './src/routes/contratoInquilinoRoute.js';
import { iniciarRecordatoriosReserva, detenerRecordatoriosReserva } from './src/services/recordatorioReservaService.js';
import { verificarRelojBD } from './src/services/verificarRelojBD.js';

// Rutas de las Preferencias ---
import preferenciaRoute from './src/routes/preferenciaRoute.js';

// Rutas del módulo de Inquilino
import inquilinoAreaRoute from './src/routes/Inquilinoarearoute.js';
import inquilinoReservaRoute from './src/routes/Inquilinoreservaroute.js';
import inquilinoVisitanteRoute from './src/routes/Inquilinovisitanteroute.js';

// Rutas de reportes y dashboard
import reporteReservaRoute from './src/routes/reservaReporteRoute.js';
import contratoReporteRoutes from './src/routes/contratoReporteRoute.js';
import reporteVisitasRoute from './src/routes/reporteVisitasRoute.js';
import dashboardRoutes from './src/routes/dashboardRoute.js';

dotenv.config();

// __dirname en ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Application = express();
const PORT = process.env.PORT || 4000;

// --- Middlewares Globales ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Endpoint de Health Check ---
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const pool = await getConnection();
    await pool.request().query('SELECT 1 as health_check');

    return res.status(200).json({
      status: 'success',
      message: 'Servidor encendido y conexión a Base de Datos exitosa 🚀'
    });
  } catch (error: unknown) {
    const err = error as Error;

    return res.status(500).json({
      status: 'error',
      message: 'No se pudo conectar a la Base de Datos',
      error: err.message
    });
  }
});

// --- Rutas de la API ---
app.use('/api/auth', authRoutes);

app.use('/api/personal', personalRoute);
app.use('/api/residentes', residenteRoute);
app.use('/api/contratos', contratoRoute);

// --- Módulo "Mis Contratos" (panel Inquilino) ---
// Se monta en el MISMO prefijo /api/contratos que la ruta de administración,
// pero sin colisiones de path (admin: GET /, POST /, PUT /:id; inquilino:
// GET /mis-contratos y GET /:id/pagos).
app.use('/api/contratos', contratoInquilinoRoute);

app.use('/api/reservas', reservaRoutes);

// --- Módulo de Pagos (admin: listado/métricas/manual/reporte; inquilino: pago de contrato) ---
app.use('/api/pagos', pagosRoute);

app.use('/api/guard', guardRoute);

// --- Módulo de Visitas (panel admin) ---
app.use('/api/visitas', visitantesRoutes);

app.use('/api/perfil', perfilRoute);

// --- Áreas Comunes (panel admin, rol Administrador) ---
app.use('/api/areas', areaRoute);

app.use('/api/departamentos', departamentoRoute);
app.use('/api/bitacora', bitacoraRoute);

// --- Módulo de Notificaciones (todos los roles) ---
app.use('/api/notificaciones', notificacionRoute);

// --- Módulo de Inquilino ---
app.use('/api/inquilino/areas', inquilinoAreaRoute);
app.use('/api/inquilino/reservas', inquilinoReservaRoute);
app.use('/api/inquilino/visitantes', inquilinoVisitanteRoute);

// --- Dashboard ---
app.use('/api/dashboard', dashboardRoutes);

// --- Reportes ---
app.use('/api/reportes/reservas', reporteReservaRoute);
app.use('/api/reportes/contratos', contratoReporteRoutes);

// Reporte de visitas (requiere JWT de Administrador; el frontend lo descarga
// con fetch + token, igual que /api/pagos/reporte).
app.use('/api/reportes/visitas', reporteVisitasRoute);

// --- Preferencias ---
app.use('/api/preferencias', preferenciaRoute);

// --- Iniciar Servidor ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);

  // Recordatorio automático de cancelación de reserva (inquilinos): revisa
  // cada minuto las reservas que inician en 30–35 min e inserta la notificación
  // en la BD (sp_CrearNotificacion) sin duplicados.
  iniciarRecordatoriosReserva();

  // Diagnóstico de arranque: compara el reloj del servidor SQL con el de Node.
  // Los filtros "de HOY" se calculan con SYSDATETIME() dentro de los SPs, así
  // que un desfase de zona horaria correría el límite de medianoche.
  void verificarRelojBD();
});

// --- Apagado limpio: detener el scheduler de recordatorios ---
const detenerServidor = () => {
  detenerRecordatoriosReserva();
  process.exit(0);
};
process.on('SIGINT', detenerServidor);
process.on('SIGTERM', detenerServidor);