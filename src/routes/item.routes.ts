import { Router } from 'express';
import { getItems, createItem, updateItem } from '../controllers/item.controller';

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
router.patch('/:id', updateItem);

export default router;