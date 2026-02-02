import { Router } from 'express';
import { getMachines, createMachine, updateMachine, deleteMachine, getMachineStats } from '../controllers/machine.controller';

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
router.post('/:id/stats', getMachineStats);
router.patch('/:id', updateMachine);
router.delete('/:id', deleteMachine);

export default router;