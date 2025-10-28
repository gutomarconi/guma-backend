import { Router } from 'express';
import { getPOs, createPO, updatePO, deletePO } from '../controllers/po.controller';

const router = Router();

/**
 * @swagger
 * /pos:
 *   get:
 *     summary: Lista POs por empresa
 *     tags: [POs]
 */
router.get('/', getPOs);
router.post('/', createPO);
router.patch('/:id', updatePO);
router.delete('/:id', deletePO);

export default router;