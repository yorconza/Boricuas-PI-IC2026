import sql from 'mssql';
import dotenv from 'dotenv';

// Carga las variables de entorno desde el archivo .env
dotenv.config();

// Configuración de la conexión a SQL Server
const dbSettings: sql.config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Parda99*',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'CondomioDB',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433,
    options: {
        encrypt: false, // Cambiar a true si usas Azure
        trustServerCertificate: true // Necesario para entornos de desarrollo locales con certificados autofirmados
    },
    pool: {
        // Una sola conexión física: garantiza que SET CONTEXT_INFO (auditoría del
        // módulo de autenticación) persista en todas las consultas de la misma petición.
        max: 1
    }
};

// Función para obtener y reutilizar la conexión
export const getConnection = async () => {
    try {
        const pool = await sql.connect(dbSettings);
        return pool;
    } catch (error) {
        console.error("Error al conectar a la Base de Datos:", error);
        throw error;
    }
};