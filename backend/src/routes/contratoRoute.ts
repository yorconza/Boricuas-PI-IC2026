import {Router} from 'express';
import{
    getContratos,
    createContrato,
    updateContrato,
    finalizarContrato
} from '../controllers/contractoController.js';

const contrato: Router = Router();

contrato.get('/', getContratos);
contrato.post('/', createContrato);
contrato.put('/:id', updateContrato);
contrato.patch('/:id', finalizarContrato);

export default contrato;