import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConnection } from './src/config/confDB.js';
import personalRoute from './src/routes/personalRoute.js';
import residente from './src/routes/residenteRoute.js';
import contratoRoute from './src/routes/contratoRoute.js'
import reservaRoutes from './src/routes/reservaRoute.js';
import authRoutes from './src/routes/authRoutes.js';
import guardRoute from './src/routes/guardRoute.js';
import perfilRoute from './src/routes/perfilRoute.js';
import departamentoRoute from './src/routes/departamentoRoute.js';
import bitacoraRoute from './src/routes/bitacoraRoute.js';
dotenv.config();

// __dirname en ESM (el backend usa "type": "module")
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Application = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales

app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}))
app.use(express.urlencoded({ extended: true }));
// Servir los avatares subidos (la ruta guardada en foto_perfil es /uploads/...)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Ruta de prueba para verificar que el servidor y la BD responden
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

// Registrar las rutas del módulo de personal
app.use('/api/personal', personalRoute);
app.use('/api/residentes', residente);
app.use('/api/contratos', contratoRoute)
app.use('/api/reservas', reservaRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/guard', guardRoute)
app.use('/api/perfil', perfilRoute)
app.use('/api/departamentos', departamentoRoute)
// Módulo de Bitácora (auditoría): GET /api/bitacora, solo rol Administrador
app.use('/api/bitacora', bitacoraRoute)


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto http://localhost:${PORT}`);
});