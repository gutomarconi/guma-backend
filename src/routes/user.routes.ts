import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';

const router = Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lista usuários com filtro
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: companyId
 *       - in: query
 *         name: email
 */
router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;