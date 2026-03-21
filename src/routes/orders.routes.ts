import { Router } from 'express';
import {
  getOrderDetailsV2, getOrderReadingsByPO, getOrdersSummary
} from '../controllers/orders.controller';

const router = Router();

router.post('/orders-summary', getOrdersSummary)
router.post('/orders-detailsv2', getOrderDetailsV2)
router.post('/po-readings', getOrderReadingsByPO)
export default router;