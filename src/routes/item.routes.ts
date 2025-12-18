import { Router } from 'express';
import { getItems, createItem, updateItem, createItems } from '../controllers/item.controller';

const router = Router();

/**
 * @swagger
 * /items:
 *   get:
 *     summary: Lista itens com filtro
 *     tags: [Items]
 */
router.get('/', getItems);
router.post('/', createItem);
router.post('/create-items', createItems);
router.patch('/:id', updateItem);

export default router;