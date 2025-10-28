import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createCompanySchema, updateCompanySchema } from '../schemas/company.schema';

/**
 * @swagger
 * tags:
 *   name: Companies
 */
export const getCompanies = async (req: Request, res: Response) => {
  const { page = 1, limit = 10, name } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = name
    ? {
        name: {
          contains: name as string,
          mode: 'insensitive' as const,
        },
      }
    : {};

  const [companies, total] = await Promise.all([
    prisma.company.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
    prisma.company.count({ where }),
  ]);

  res.json({ data: companies, total, page: Number(page), limit: Number(limit) });
};

/**
 * @swagger
 * /companies/{id}:
 *   get:
 *     summary: Busca empresa por ID
 *     tags: [Companies]
 */
export const getCompanyById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const company = await prisma.company.findUnique({
    where: { id: Number(id) },
    include: { users: true, apiKeys: true },
  });
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json(company);
};

export const createCompany = async (req: Request, res: Response) => {
  const result = createCompanySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  const company = await prisma.company.create({ data: result.data });
  res.status(201).json(company);
};

export const updateCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = updateCompanySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  try {
    const company = await prisma.company.update({
      where: { id: Number(id) },
      data: result.data,
    });
    res.json(company);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
    res.status(500).json({ error: 'Erro ao atualizar' });
  }
};

export const deleteCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.company.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
    res.status(500).json({ error: 'Erro ao deletar' });
  }
};