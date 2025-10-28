import { Router } from 'express';
import { getMachines, createMachine, updateMachine, deleteMachine } from '../controllers/machine.controller';

const router = Router();

/**
 * @swagger
 * /machines:
 *   get:
 *     summary: Lista máquinas com filtro
 *     tags: [Machines]
 */
router.get('/', getMachines);
router.post('/', createMachine);
router.patch('/:id', updateMachine);
router.delete('/:id', deleteMachine);

export default router;