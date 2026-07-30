import { Router } from 'express';
import { 
    getPersonal, 
    createPersonal, 
    updatePersonal, 
    deactivatePersonal, 
    reactivatePersonal 
} from '../controllers/personalController.js';

const personal: Router = Router();

personal.get('/', getPersonal);
personal.post('/', createPersonal);
personal.put('/:id', updatePersonal);
personal.patch('/:id/desactivar', deactivatePersonal);
personal.patch('/:id/reactivar', reactivatePersonal);

export default personal;