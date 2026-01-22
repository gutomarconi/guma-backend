import { Router } from 'express';
import {
  getOrderDetails, getOrdersSummary, getOrdersTotals
} from '../controllers/orders.controller';

const router = Router();

/**
 * @swagger
 * /companies:
 *   get:
 *     summary: Lista empresas com paginação e filtro
 *     tags: [Companies]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: name
 *         schema: { type: string }
 */
router.post('/orders-details', getOrderDetails);
router.get('/orders-totals/', getOrdersTotals);
router.post('/orders-summary', getOrdersSummary)

export default router;