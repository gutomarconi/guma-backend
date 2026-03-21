import { Router } from 'express';
import { createOrderItems, createOrderItem } from '../controllers/OrderItem.controller';

const router = Router();

router.post('/', createOrderItem);
router.post('/create-items', createOrderItems);

export default router;