import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
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
                'pendingOrdersCount',COUNT(*) FILTER (WHERE order_status = 'PENDING')
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
};

export const getOrderDetails = async (req: Request<{}, {}, GetOrderDetailsBody>, res: Response) => {
  const { startDate, endDate, status, companyId, orderNumber, batchNumber, searchItem } = req.body;
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

