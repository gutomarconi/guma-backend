import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { number } from 'zod';
// import dayjs from 'dayjs';
/**
 * @swagger
 * tags:
 *   name: Items
 */
export const getOrdersTotals = async (req: Request, res: Response) => {
  const { companyId, barcode, order_number } = req.query;
  const where = {
    companyId: Number(companyId),
    ...(barcode ? { barcode: { contains: barcode as string } } : {}),
    ...(order_number ? { order_number: Number(order_number) } : {}),
  }

  const items = await prisma.item.findMany({
    where,
    // include: { itemHistory: { include: { machine: true } } },
    orderBy: { order_date: 'desc' },
  });
  res.json(items);
};

export const getOrdersSummary = async (req: Request, res: Response) => {
  const { companyId } = req.body;
    if (!companyId) {
        return res.status(400).json({ error: 'Company id missing' });
    }
      try {
        const result = await prisma.$queryRaw`
            SELECT 
              json_build_object(
                'activeOrdersCount', COUNT(*),
                'finishedOrdersCount', COUNT(*) FILTER (WHERE order_status = 'DONE'),
                'pendingOrdersCount',COUNT(*) FILTER (WHERE order_status = 'PENDING'),
                'lateOrdersCount',COUNT(*) FILTER (WHERE order_delivery_date <= ${new Date().toISOString()}::date)
              ) AS stats
            FROM public.vw_order_machine_detail
            WHERE company_id = ${companyId};
        `;
        res.status(200).json(result);
    } catch(err:any) {
        console.log(err)
        res.status(500).json({ error: 'Erro ao tentar buscar summary ' });
    }

}

type GetOrderDetailsBody = {
  startDate: string;
  endDate: string;
  companyId: number;

  orderNumber?: number;
  batchNumber?: number;
  status?: string[];
  searchItem?: string;
  poStatus?: Record<string, string[]>;
};

const getOperationField = (id: number): string => {
  if (id === 1) return 'cutting';
  if (id === 2) return 'border';
  if (id === 3) return 'drilling';
  return 'packing';
}

const getOperation = (status: string): string => {
  return status.toLowerCase() === 'pending' ? '>' : '=';
}

const poStatusToMap = (
  poStatus?: Record<string, string[]>
): Map<number, string[]> => {
  const map = new Map<number, string[]>();

  if (!poStatus) return map;

  for (const [key, value] of Object.entries(poStatus)) {
    const numericKey = Number(key);

    if (!Number.isNaN(numericKey)) {
      map.set(numericKey, value);
    }
  }

  return map;
};

export const getOrderDetails = async (req: Request<{}, {}, GetOrderDetailsBody>, res: Response) => {
  const { startDate, endDate, status, companyId, orderNumber, batchNumber, searchItem, poStatus } = req.body;
    if (!startDate || !endDate || !companyId) {
        return res.status(400).json({ error: 'Date filters are missing' });
    }

    try {
      const filters: Array<Prisma.Sql> = new Array<Prisma.Sql>()
      if (orderNumber) {
        filters.push(Prisma.sql`AND order_number = ${Number(orderNumber)}`);
      }

      if (batchNumber) {
        filters.push(Prisma.sql`AND batch_number = ${Number(batchNumber)}`);
      }

      if (searchItem) {
        filters.push(Prisma.sql`AND items::text ILIKE ${'%' + searchItem + '%'}`);
      }

      if (status && status.length > 0) {
        const statusValues = status.map(s => Prisma.sql`${s}`); 
        const inClause = Prisma.join(statusValues, ', ');
        filters.push(
          Prisma.sql`AND "order_status" IN (${inClause})`
        );        
      }

      if (poStatus) {
        const poStatusMap = poStatusToMap(poStatus);

        for (const [machineId, poStatusList] of poStatusMap) {
          if (poStatusList.length === 1) {
            const [filteredStatus] = poStatusList;

            filters.push(
              Prisma.sql`
                AND ${Prisma.raw(getOperationField(machineId))}_total
                ${Prisma.raw(getOperation(filteredStatus))}
                ${Prisma.raw(getOperationField(machineId))}_done
              `
            );
          }
        }
      }

      const result = await prisma.$queryRaw`
          SELECT *
          FROM public.vw_order_machine_detail
          WHERE company_id = ${companyId}
          AND order_date BETWEEN ${startDate}::date AND ${endDate}::date
          ${filters.length ? Prisma.join(filters, `\n`) : Prisma.empty}
          ORDER BY order_date DESC;
      `;
      const parsed = JSON.parse(
          JSON.stringify(result, (_, value) =>
          typeof value === 'bigint' ? Number(value) : value
          )
      );
      res.status(200).json(parsed);
    } catch(err:any) {
        console.log(err)
        res.status(500).json({ error: 'Erro ao tentar buscar pedidos' });
    }
};

