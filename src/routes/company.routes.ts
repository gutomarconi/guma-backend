import { Router } from 'express';
import {
  getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany
} from '../controllers/company.controller';

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
router.get('/', getCompanies);
router.get('/:id', getCompanyById);
router.post('/', createCompany);
router.patch('/:id', updateCompany);
router.delete('/:id', deleteCompany);

export default router;