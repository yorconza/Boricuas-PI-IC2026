import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getConnection } from './src/config/confDB.js';
import personalRoute from './src/routes/personalRoute.js';
import residente from './src/routes/residenteRoute.js';
import contratoRoute from './src/routes/contratoRoute.js'
import reservaRoutes from './src/routes/reservaRoute.js';
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173'
}))
app.use(express.urlencoded({ extended: true }));
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


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto http://localhost:${PORT}`);
});