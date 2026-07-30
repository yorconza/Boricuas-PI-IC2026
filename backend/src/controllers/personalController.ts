import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';

// 1. Listar personal (Acepta opcionalmente un id_usuario y requiere el id_usuario_actual por seguridad)
export const getPersonal = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, id_usuario } = req.query;

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .input('id_usuario', sql.Int, id_usuario ? Number(id_usuario) : null)
            .execute('sp_Personal_Listar');

        return res.status(200).json(result?.recordset);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 2. Insertar nuevo personal
export const createPersonal = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, nombre_completo, correo, contrasena_hash, telefono, cedula, foto_perfil } = req.body;

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, id_usuario_actual)
            .input('nombre_completo', sql.VarChar, nombre_completo)
            .input('correo', sql.VarChar, correo)
            .input('contrasena_hash', sql.VarBinary, Buffer.from(contrasena_hash)) // Ajustar según cómo recibas el hash
            .input('telefono', sql.VarChar, telefono || null)
            .input('cedula', sql.VarChar, cedula || null)
            .input('foto_perfil', sql.VarChar, foto_perfil || null)
            .execute('sp_Personal_Insertar');

        const nuevoId = result?.recordset?.[0]?.id_usuario_nuevo;

        return res.status(201).json({ 
            message: "Personal registrado exitosamente", 
            id_usuario_nuevo: nuevoId 
        });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 3. Actualizar personal existente
export const updatePersonal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // ID del empleado a modificar por la URL
        const { id_usuario_actual, nombre_completo, correo, telefono, cedula, foto_perfil } = req.body;

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, id_usuario_actual)
            .input('id_usuario', sql.Int, Number(id))
            .input('nombre_completo', sql.VarChar, nombre_completo)
            .input('correo', sql.VarChar, correo)
            .input('telefono', sql.VarChar, telefono || null)
            .input('cedula', sql.VarChar, cedula || null)
            .input('foto_perfil', sql.VarChar, foto_perfil || null)
            .execute('sp_Personal_Actualizar');

        return res.status(200).json({ message: "Personal actualizado exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }   
};

// 4. Desactivar personal (cambiar activo a 0)
export const deactivatePersonal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_usuario_actual } = req.body;

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, id_usuario_actual)
            .input('id_usuario', sql.Int, Number(id))
            .execute('sp_Personal_Desactivar');

        return res.status(200).json({ message: "Personal desactivado exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 5. Reactivar personal (cambiar activo a 1)
export const reactivatePersonal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_usuario_actual } = req.body;

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, id_usuario_actual)
            .input('id_usuario', sql.Int, Number(id))
            .execute('sp_Personal_Reactivar');

        return res.status(200).json({ message: "Personal reactivado exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};