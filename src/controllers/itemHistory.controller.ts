import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { getItemByBarcode } from '../services/itemService';
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

const updateOrderStats = async (ids: number[]) => {
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
        WHERE ih."itemId" = ANY(${ids})
        GROUP BY i."companyId", i.order_number
      ) sub
      WHERE os."companyId" = sub.company_id
      AND os.order_number = sub.order_number
    `
}
export const createItemHistory = async (req: Request, res: Response) => {
  const { barcode, machineId, readDate } = req.body;

  if (!barcode || !machineId) return res.status(400).json({ errors: "Dados inválidos" });

  const item = await getItemByBarcode(barcode);
  const machine = await prisma.machine.findFirst({
    where: {
      id: Number(machineId)
    }
  })
  if (item.id && machine.id) {
    try {
      const history = await prisma.itemHistory.create({ data: {
        machineId: Number(machineId),
        itemId: Number(item?.id),
        companyId: Number(req.user?.companyId),
        readDate
      } });
      await updateOrderStats([history.id])

      res.status(201).json(history);
    } catch (error: unknown) {
      // if (error instanceof PrismaClientKnownRequestError) {
        // if (error.code === 'P2003') return res.status(400).json({ error: 'Item ou Máquina inválida' });
        res.status(500).json({ error: 'Erro ao registrar histórico' });
      // }
    }
  } else{
        await prisma.itemHistoryFailed.create({ data: {
          barcode: barcode,
          companyId: Number(req.user?.companyId),
          machineId: machineId,

        }});
        res.status(500).json({ error: 'Erro ao registrar histórico, item ou máquina inválidos' });
  }
};

export const createItemHistories = async (req: Request, res: Response) => {
  const itemHistories: ICreateItemHistory[] = req.body;

  if (!itemHistories || itemHistories.length === 0) return res.status(400).json({ errors: "Dados inválidos" });

  try {
    const createdHistories = [];
    const invalidHistories = [];
    for (const itemHistory of itemHistories) {
      const { barcode, machineId } = itemHistory;
      if (barcode && machineId) {
        const item = await getItemByBarcode(barcode);
        const machine = await prisma.machine.findFirst({
          where: {
            id: Number(machineId)
          }
        })
        if (item?.id && machine.id) {
          createdHistories.push({
            machineId: Number(machineId),
            itemId: Number(item?.id),
            companyId: Number(req.user?.companyId),
            readDate: itemHistory.readDate
          })
        } else {
          invalidHistories.push({
            machineId: Number(machineId),
            barcode: barcode,
            companyId: Number(req.user?.companyId),
            readDate: itemHistory.readDate
          })

        }
      }
    }
    if (invalidHistories.length > 0) {
      await prisma.itemHistoryFailed.createMany({ data: invalidHistories, skipDuplicates: true, });
    }
    if (createdHistories.length > 0) {
      await prisma.itemHistory.createMany({ data: createdHistories, skipDuplicates: true, });
      const itemIds = [...new Set(createdHistories.map(r => r.itemId))]
      await updateOrderStats(itemIds)
    }
    res.status(201).json(createdHistories);
  } catch (error: unknown) {
      res.status(500).json({ error: 'Erro ao registrar históricos' });
  }
};