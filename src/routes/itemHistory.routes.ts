import { Router } from 'express';
import { getItemHistory, createItemHistory, createItemHistories } from '../controllers/itemHistory.controller';

const router = Router();

/**
 * @swagger
 * /item-history:
 *   get:
 *     summary: Histórico de itens
 *     tags: [ItemHistory]
 */
router.get('/', getItemHistory);
router.post('/', createItemHistory);
router.post('/batch', createItemHistories);

export default router;