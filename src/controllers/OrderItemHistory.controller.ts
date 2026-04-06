import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { getOrderItemByBarcode } from '../services/itemService';
import { ICreateItemHistory, IOrderItemHistoryModel, ReadingType } from '../types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const updateOrderStats = async (ids: number[]) => {
 await prisma.$executeRaw`
    UPDATE "OrderProgress" op
        SET
        cutting_done = op.cutting_done + sub.cutting_done,
        drilling_done = op.drilling_done + sub.drilling_done,
        border_done = op.border_done + sub.border_done,
        packaging_done = op.packaging_done + sub.packaging_done,
        items_started = op.items_started + sub.items_started,
        items_finished = op.items_finished + sub.items_finished,
        last_read_date = NOW()
        FROM (
        SELECT
            oi.order_id,

            COUNT(*) FILTER (WHERE h.po_id = 1) AS cutting_done,
            COUNT(*) FILTER (WHERE h.po_id = 2) AS border_done,
            COUNT(*) FILTER (WHERE h.po_id = 3) AS drilling_done,
            COUNT(*) FILTER (WHERE h.po_id = 4) AS packaging_done,

            COUNT(*) FILTER (WHERE pr.sequence = 1) AS items_started,
            COUNT(*) FILTER (
            WHERE pr.sequence = last_seq.max_sequence
            ) AS items_finished

        FROM "OrderItemHistory" h
        JOIN "OrderItem" oi ON oi.id = h.order_item_id
        JOIN "ProductRoute" pr
            ON pr.product_id = oi.product_id
            AND pr.po_id = h.po_id
        JOIN (
            SELECT product_id, MAX(sequence) AS max_sequence
            FROM "ProductRoute"
            GROUP BY product_id
        ) last_seq ON last_seq.product_id = oi.product_id

        WHERE h.order_item_id = ANY(${ids})

        GROUP BY oi.order_id
        ) sub
        WHERE op.order_id = sub.order_id
        `;
}
export const createOrderItemHistory = async (req: Request, res: Response) => {
  const { barcode, machineId, readDate } = req.body;

  if (!barcode || !machineId) return res.status(400).json({ errors: "Dados inválidos" });

  const orderItem = await getOrderItemByBarcode(barcode);
  const machine = await prisma.machine.findFirst({
    where: {
      id: Number(machineId)
    }
  })
  if (orderItem.id && machine.id) {
    try {
      const history = await prisma.orderItemHistory.create({ data: {
        machine_id: Number(machineId),
        product_id: Number(orderItem?.product_id),
        company_id: Number(req.user?.companyId),
        read_date: readDate,
        po_id: machine.poId,
        order_item_id: orderItem.id
      } });
      await updateOrderStats([orderItem.id])

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

export const createOrderItemHistories = async (req: Request, res: Response) => {
  const itemHistories: ICreateItemHistory[] = req.body;

  if (!itemHistories || itemHistories.length === 0) return res.status(400).json({ errors: "Dados inválidos" });

  try {
    const createdHistories: IOrderItemHistoryModel[] = [];
    const invalidHistories = [];
    for (const itemHistory of itemHistories) {
      const { barcode, machineId } = itemHistory;
      if (barcode && machineId) {
        const orderItem = await getOrderItemByBarcode(barcode);
        const machine = await prisma.machine.findFirst({
          where: {
            id: Number(machineId)
          }
        })
        if (orderItem?.id && machine.id) {
            const existentReading = await prisma.orderItemHistory.findFirst({ where: { order_item_id: orderItem.id, machine_id: Number(machineId) }, orderBy: { read_date: 'desc' } });
            let diff = 0;
            if (existentReading) {
                diff = dayjs.utc(itemHistory.readDate).diff(dayjs.utc(existentReading.read_date), 'minute');
            }
            if ((existentReading && diff > 10) || !existentReading)  {
                createdHistories.push({
                    machine_id: Number(machineId),
                    product_id: Number(orderItem?.product_id),
                    company_id: Number(req.user?.companyId),
                    read_date: dayjs(itemHistory.readDate).toISOString(),
                    po_id: machine.poId,
                    order_item_id: orderItem.id,
                    reading_type: diff > 10 ? ReadingType.Retrabalho : ReadingType.Normal
                })
            }
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
      await prisma.orderItemHistory.createMany({ data: createdHistories, skipDuplicates: true, });
      const itemIds = [...new Set(createdHistories.map(r => r.order_item_id))]
      await updateOrderStats(itemIds)
    }
    res.status(201).json(createdHistories);
  } catch (error: unknown) {
      res.status(500).json({ error: 'Erro ao registrar históricos' });
  }
};