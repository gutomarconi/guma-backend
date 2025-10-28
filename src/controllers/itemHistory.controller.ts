import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createItemHistorySchema } from '../schemas/itemHistory.schema';

/**
 * @swagger
 * tags:
 *   name: ItemHistory
 */
export const getItemHistory = async (req: Request, res: Response) => {
  const { itemId, companyId } = req.query;
  const where: any = {};
  if (itemId) where.itemId = Number(itemId);
  if (companyId) where.companyId = Number(companyId);

  const history = await prisma.itemHistory.findMany({
    where,
    // include: { item: true, machine: true },
    orderBy: { id: 'desc' },
  });
  res.json(history);
};

export const createItemHistory = async (req: Request, res: Response) => {
  const result = createItemHistorySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  try {
    const history = await prisma.itemHistory.create({ data: result.data });
    res.status(201).json(history);
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'Item ou Máquina inválida' });
    res.status(500).json({ error: 'Erro ao registrar histórico' });
  }
};