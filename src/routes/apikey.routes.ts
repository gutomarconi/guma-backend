import { Router } from 'express';
import { getApiKeys, createApiKey, updateApiKey, deleteApiKey } from '../controllers/apikey.controller';

const router = Router();

/**
 * @swagger
 * /api-keys:
 *   get:
 *     summary: Lista chaves por empresa
 *     tags: [ApiKeys]
 *     parameters:
 *       - in: query
 *         name: companyId
 */
router.get('/', getApiKeys);
router.post('/', createApiKey);
router.patch('/:id', updateApiKey);
router.delete('/:id', deleteApiKey);

export default router;