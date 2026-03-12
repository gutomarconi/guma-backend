import { Request, Response } from 'express';
import { Prisma, prisma } from '../prisma';
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
  const { barcode, machineId, readDate } = req.body;

  if (!barcode || !machineId) return res.status(400).json({ errors: "Dados inválidos" });

  const item = await getItemByBarcode(barcode as string);

  try {
    const history = await prisma.itemHistory.create({ data: {
      machineId: Number(machineId),
      itemId: Number(item?.id),
      companyId: Number(req.user?.companyId),
      readDate
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
        if (item?.id) {
          createdHistories.push({
            machineId: Number(machineId),
            itemId: Number(item?.id),
            companyId: Number(req.user?.companyId),
            readDate: itemHistory.readDate
          })
        }
      }
    }
    await prisma.itemHistory.createMany({ data: createdHistories, skipDuplicates: true, });
    const itemIds = [...new Set(createdHistories.map(r => r.itemId))]
    await prisma.$executeRaw`
      UPDATE "OrderStats" os
      SET items_done = os.items_done + sub.count_done,
          last_read_date = NOW()
      FROM (
        SELECT
          i."companyId" AS company_id,
          i.order_number,
          COUNT(DISTINCT ih."itemId") AS count_done
        FROM "ItemHistory" ih
        JOIN "Item" i ON i.id = ih."itemId"
        WHERE ih."itemId" = ANY(${itemIds})
        GROUP BY i."companyId", i.order_number
      ) sub
      WHERE os."companyId" = sub.company_id
      AND os.order_number = sub.order_number
    `
    res.status(201).json(createdHistories);
  } catch (error: unknown) {
      res.status(500).json({ error: 'Erro ao registrar históricos' });
  }
};