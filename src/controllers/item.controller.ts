import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createItemSchema, updateItemSchema } from '../schemas/item.schema';

/**
 * @swagger
 * tags:
 *   name: Items
 */
export const getItems = async (req: Request, res: Response) => {
  const { companyId, barcode, order_number } = req.query;
  const where: any = { companyId: Number(companyId) };
  if (barcode) where.barcode = { contains: barcode as string };
  if (order_number) where.order_number = Number(order_number);

  const items = await prisma.item.findMany({
    where,
    // include: { itemHistory: { include: { machine: true } } },
    orderBy: { order_date: 'desc' },
  });
  res.json(items);
};

export const createItem = async (req: Request, res: Response) => {
  const result = createItemSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  const item = await prisma.item.create({ data: result.data });
  res.status(201).json(item);
};

export const updateItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = updateItemSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  try {
    const item = await prisma.item.update({ where: { id: Number(id) }, data: result.data });
    res.json(item);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Item não encontrado' });
    res.status(500).json({ error: 'Erro ao atualizar' });
  }
};