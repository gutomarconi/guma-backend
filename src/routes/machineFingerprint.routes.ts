import { Router } from 'express';
import { getMachineFingerprint, createMachineFingerprint, updateMachineFingerprint, deleteMachineFingerprint } from '../controllers/machineFingerprint.controller';

const router = Router();

router.get('/:id', getMachineFingerprint);
router.post('/', createMachineFingerprint);
router.patch('/:id', updateMachineFingerprint);
router.delete('/:id', deleteMachineFingerprint);

export default router;