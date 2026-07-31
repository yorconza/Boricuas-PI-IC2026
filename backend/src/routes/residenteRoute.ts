import { Router } from 'express';
import { 
    getResidentes, 
    createResidente, 
    updateResidente, 
    changeEstadoResidente
} from '../controllers/residentesControllers.js';

const residente: Router = Router();

residente.get('/', getResidentes);
residente.post('/', createResidente);
residente.put('/:id', updateResidente);
residente.patch('/:id/changeEstadoResidente', changeEstadoResidente);


export default residente;