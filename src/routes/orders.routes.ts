import { Router } from 'express';
import {
  getOrderDetails, getOrdersTotals, getOrderById
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
router.get('/:id', getOrderById);
router.get('/orders-totals/', getOrdersTotals);

export default router;