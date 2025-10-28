import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createPOSchema, updatePOSchema } from '../schemas/po.schema';

/**
 * @swagger
 * tags:
 *   name: POs
 */
export const getPOs = async (req: Request, res: Response) => {
  const { companyId } = req.query;
  const where = companyId ? { companyId: Number(companyId) } : {};

  const pos = await prisma.pO.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(pos);
};

export const createPO = async (req: Request, res: Response) => {
  const result = createPOSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  const po = await prisma.pO.create({ data: result.data });
  res.status(201).json(po);
};

export const updatePO = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = updatePOSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  try {
    const po = await prisma.pO.update({ where: { id: Number(id) }, data: result.data });
    res.json(po);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'PO não encontrada' });
    res.status(500).json({ error: 'Erro ao atualizar' });
  }
};

export const deletePO = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.pO.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
    res.status(500).json({ error: 'Erro ao deletar' });
  }
};