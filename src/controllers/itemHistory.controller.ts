import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { getItemByBarcode } from '../services/itemService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ICreateItemHistory } from '../types';

/**
 * @swagger
 * tags:
 *   name: ItemHistory
 */
export const getItemHistory = async (req: Request, res: Response) => {
  const { itemId, companyId } = req.query;
    const where = {
    companyId: Number(companyId),
    ...(itemId ? { itemId: Number(itemId) } : {}),
    ...(companyId ? { companyId: Number(companyId) } : {}),
  }

  const history = await prisma.itemHistory.findMany({
    where,
    // include: { item: true, machine: true },
    orderBy: { id: 'desc' },
  });
  res.json(history);
};

export const createItemHistory = async (req: Request, res: Response) => {
  const { barcode, machineId } = req.body;

  if (!barcode || !machineId) return res.status(400).json({ errors: "Dados inválidos" });

  const item = await getItemByBarcode(barcode as string);

  try {
    const history = await prisma.itemHistory.create({ data: {
      machineId: Number(machineId),
      itemId: Number(item?.id),
      companyId: Number(req.user?.companyId)

    } });
    res.status(201).json(history);
  } catch (error: unknown) {
    // if (error instanceof PrismaClientKnownRequestError) {
      // if (error.code === 'P2003') return res.status(400).json({ error: 'Item ou Máquina inválida' });
      res.status(500).json({ error: 'Erro ao registrar histórico' });
    // }
  }
};

export const createItemHistories = async (req: Request, res: Response) => {
  const itemHistories: ICreateItemHistory[] = req.body;

  if (!itemHistories || itemHistories.length === 0) return res.status(400).json({ errors: "Dados inválidos" });
  try {
    const createdHistories = [];
    for (const itemHistory of itemHistories) {
      const { barcode, machineId } = itemHistory;
      if (barcode && machineId) {
        const item = await getItemByBarcode(barcode);
        const history = await prisma.itemHistory.create({ data: {
          machineId: Number(machineId),
          itemId: Number(item?.id),
          companyId: Number(req.user?.companyId)
        }});
        createdHistories.push(history);
      }
    }
    res.status(201).json(createdHistories);
  } catch (error: unknown) {
      res.status(500).json({ error: 'Erro ao registrar históricos' });
  }
};