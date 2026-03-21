import { Router } from 'express';
import { createOrderItemHistories, createOrderItemHistory } from '../controllers/OrderItemHistory.controller';

const router = Router();

/**
 * @swagger
 * /item-history:
 *   get:
 *     summary: Histórico de itens
 *     tags: [ItemHistory]
 */
router.post('/', createOrderItemHistory);
router.post('/batch', createOrderItemHistories);

export default router;