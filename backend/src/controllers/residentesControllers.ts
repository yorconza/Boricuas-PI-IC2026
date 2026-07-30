import { type Request, type Response } from 'express';
import { getConnection } from '../config/confDB.js';
import sql from 'mssql';

// 1. Listar residentes (GET)
export const getResidentes = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, id_usuario, nombre, departamento, estado_contrato, activo } = req.query;

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual))
            .input('id_usuario', sql.Int, id_usuario ? Number(id_usuario) : null)
            .input('nombre', sql.VarChar, nombre ? String(nombre) : null)
            .input('departamento', sql.VarChar, departamento ? String(departamento) : null)
            .input('estado_contrato', sql.VarChar, estado_contrato ? String(estado_contrato) : null)
            .input('activo', sql.Bit, activo !== undefined ? Number(activo) : null)
            .execute('sp_Residente_Listar');

        return res.status(200).json(result?.recordset);
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};

// 2. Insertar nuevo residente (POST) - CORREGIDO PARA EL SP REAL
export const createResidente = async (req: Request, res: Response) => {
    try {
        const { id_usuario_actual, nombre_completo, correo, contrasena_hash, telefono, cedula, foto_perfil } = req.body;

        // Convertir el string de la contraseña a Buffer para que coincida con VARBINARY(256)
        const passwordBuffer = Buffer.from(contrasena_hash || 'temporal123', 'utf-8');

        const pool = await getConnection();
        const result = await pool?.request()
            .input('id_usuario_actual', sql.Int, Number(id_usuario_actual) || 1003)
            .input('nombre_completo', sql.VarChar(150), nombre_completo)
            .input('correo', sql.VarChar(150), correo)
            .input('contrasena_hash', sql.VarBinary(256), passwordBuffer)
            .input('telefono', sql.VarChar(20), telefono || null)
            .input('cedula', sql.VarChar(30), cedula || null)
            .input('foto_perfil', sql.VarChar(255), foto_perfil || null)
            .execute('sp_Residente_Insertar');

        const nuevoId = result?.recordset?.[0]?.id_usuario_nuevo;

        return res.status(201).json({ 
            message: "Residente registrado exitosamente", 
            id_usuario_nuevo: nuevoId 
        });
    } catch (error: unknown) {
        console.error("Error al insertar residente en SQL Server:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error al registrar residente" });
    }
};

// 3. Actualizar residente existente (PUT / PATCH)
export const updateResidente = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // ID del residente a modificar por la URL
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
            .execute('sp_Residente_Actualizar');

        return res.status(200).json({ message: "Residente actualizado exitosamente" });
    } catch (error: unknown) {
        console.error("Error:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }   
};

// 4. Cambiar estado de residente (Desactivar / Reactivar) - CORREGIDO
export const changeEstadoResidente = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_usuario_actual } = req.body;
        
        // Si no viene "activo" en el body, lo deducimos por el endpoint de la URL
        let estadoActivo = req.body.activo;
        if (estadoActivo === undefined) {
            estadoActivo = req.path.endsWith('/reactivar');
        }

        const pool = await getConnection();
        await pool?.request()
            .input('id_usuario_actual', sql.Int, id_usuario_actual)
            .input('id_usuario', sql.Int, Number(id))
            .input('activo', sql.Bit, estadoActivo ? 1 : 0)
            .execute('sp_Residente_CambiarEstado');

        const mensajeAccion = estadoActivo ? "reactivado" : "desactivado";
        return res.status(200).json({ message: `Residente ${mensajeAccion} exitosamente` });
    } catch (error: unknown) {
        console.error("Error cambiando estado de residente:", error);
        const err = error as Error;
        return res.status(400).json({ message: err.message || "Error interno del servidor" });
    }
};