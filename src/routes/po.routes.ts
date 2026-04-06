import { Router } from 'express';
import { getPOs, createPO, updatePO, deletePO, getPOStats, getPackagingPendingBarcodes } from '../controllers/po.controller';

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
router.post('/:id/stats', getPOStats);
router.get('/packaging/queue', getPackagingPendingBarcodes);


export default router;