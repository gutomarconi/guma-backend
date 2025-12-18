import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { updateItemSchema } from '../schemas/item.schema';
import { ICreateItemBody } from '../types';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } 
  from '@prisma/client/runtime/library';
import { parseDateDDMMYYYY } from '../utils/dates';
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

export const getOrderDetails = async (req: Request, res: Response) => {
  const { startDate, endDate, status } = req.body;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Date filters are missing' });
    }
    try {

  const result = await prisma.$queryRaw<
  {
    order_number: number;
    batch_number: number;
    box_number: number;
    order_date: string;
    order_delivery_date: string;


    cutting_total: number;
    cutting_done: number;
    cutting_percent: number;

    drilling_total: number;
    drilling_done: number;
    drilling_percent: number;

    border_total: number;
    border_done: number;
    border_percent: number;

    packing_total: number;
    packing_done: number;
    packing_percent: number;
  }[]
>`
SELECT
    i.order_number,
  i.batch_number,
  i.box_number,
  i.order_date,
  i.order_delivery_date,
  SUM(CASE WHEN i.has_cutting_po THEN i.quantity ELSE 0 END) AS cutting_total,
  SUM(CASE 
        WHEN i.has_cutting_po
         AND ih_cut.id IS NOT NULL 
        THEN i.quantity 
        ELSE 0 
      END) AS cutting_done,
  CASE 
    WHEN SUM(CASE WHEN i.has_cutting_po THEN i.quantity ELSE 0 END) = 0
    THEN 0
    ELSE
      (SUM(CASE 
            WHEN i.has_cutting_po 
             AND ih_cut.id IS NOT NULL 
            THEN i.quantity 
            ELSE 0 
          END)
      /
      SUM(CASE WHEN i.has_cutting_po THEN i.quantity ELSE 0 END)) * 100
  END AS cutting_percent,

  SUM(CASE WHEN i.has_drilling_po THEN i.quantity ELSE 0 END) AS drilling_total,
  SUM(CASE 
        WHEN i.has_drilling_po 
         AND ih_dri.id IS NOT NULL 
        THEN i.quantity 
        ELSE 0 
      END) AS drilling_done,
  CASE 
    WHEN SUM(CASE WHEN i.has_drilling_po THEN i.quantity ELSE 0 END) = 0
    THEN 0
    ELSE
      (SUM(CASE 
            WHEN i.has_drilling_po 
             AND ih_dri.id IS NOT NULL 
            THEN i.quantity 
            ELSE 0 
          END)
      /
      SUM(CASE WHEN i.has_drilling_po THEN i.quantity ELSE 0 END)) * 100
  END AS drilling_percent,

  SUM(CASE WHEN i.has_bordering_po THEN i.quantity ELSE 0 END) AS border_total,
  SUM(CASE 
        WHEN i.has_bordering_po
         AND ih_bor.id IS NOT NULL 
        THEN i.quantity 
        ELSE 0 
      END) AS border_done,
  CASE 
    WHEN SUM(CASE WHEN i.has_bordering_po THEN i.quantity ELSE 0 END) = 0
    THEN 0
    ELSE
      (SUM(CASE 
            WHEN i.has_bordering_po 
             AND ih_bor.id IS NOT NULL 
            THEN i.quantity 
            ELSE 0 
          END)
      /
      SUM(CASE WHEN i.has_bordering_po THEN i.quantity ELSE 0 END)) * 100
  END AS border_percent,

  SUM(CASE WHEN i.has_packaging_po THEN i.quantity ELSE 0 END) AS packing_total,
  SUM(CASE 
        WHEN i.has_packaging_po
         AND ih_pack.id IS NOT NULL 
        THEN i.quantity 
        ELSE 0 
      END) AS packing_done,
  CASE 
    WHEN SUM(CASE WHEN i.has_packaging_po THEN i.quantity ELSE 0 END) = 0
    THEN 0
    ELSE
      (SUM(CASE 
            WHEN i.has_packaging_po 
             AND ih_pack.id IS NOT NULL 
            THEN i.quantity 
            ELSE 0 
          END)
      /
      SUM(CASE WHEN i.has_packaging_po THEN i.quantity ELSE 0 END)) * 100
  END AS packing_percent,
    CASE
  WHEN
    (cutting_total = 0 OR cutting_done = cutting_total)
    AND (drilling_total = 0 OR drilling_done = drilling_total)
    AND (border_total = 0 OR border_done = border_total)
    AND (packing_total = 0 OR packing_done = packing_total)
  THEN 'DONE'
  ELSE 'PENDING'
END AS order_status

FROM public."Item" i

LEFT JOIN public."ItemHistory" ih_cut
  ON ih_cut."itemId" = i.id AND ih_cut."machineId" = 1

LEFT JOIN public."ItemHistory" ih_dri
  ON ih_dri."itemId" = i.id AND ih_dri."machineId" = 2

LEFT JOIN public."ItemHistory" ih_bor
  ON ih_bor."itemId" = i.id AND ih_bor."machineId" = 3

LEFT JOIN public."ItemHistory" ih_pack
  ON ih_pack."itemId" = i.id AND ih_pack."machineId" = 4

WHERE order_date >= DATE '${startDate}'
and order_date <= DATE '${endDate}' 
${status.length === 1 
    ? `and order_status = "${(status as Array<'pending' | 'done'>)[0].toUpperCase()}"` 
    : ''}
GROUP BY i.order_number, i.batch_number, i.box_number, i.order_date, i.order_delivery_date
`;
    res.status(200).json(result);
    } catch {
        res.status(500).json({ error: 'Erro ao tentar buscar pedidos' });
    }

};

export const getOrderById = async (req: Request, res: Response) => {
  const { companyId } = req.query;
  const { id } = req.params;
  try {
    console.log(companyId, id)
    if (!companyId || !id) {
        return res.status(400).json({ error: 'Company or order number missing' });
    }

    const result = await prisma.$queryRaw<
  {
    order_number: number;
    batch_number: number;
    box_number: number;
    order_date: string;
    order_delivery_date: string;


    cutting_total: number;
    cutting_done: number;
    cutting_percent: number;

    drilling_total: number;
    drilling_done: number;
    drilling_percent: number;

    border_total: number;
    border_done: number;
    border_percent: number;

    packing_total: number;
    packing_done: number;
    packing_percent: number;
  }[]
>`
SELECT
    i.order_number,
  i.batch_number,
  i.box_number,
  i.order_date,
  i.order_delivery_date,
  SUM(CASE WHEN i.has_cutting_po THEN i.quantity ELSE 0 END) AS cutting_total,
  SUM(CASE 
        WHEN i.has_cutting_po
         AND ih_cut.id IS NOT NULL 
        THEN i.quantity 
        ELSE 0 
      END) AS cutting_done,
  CASE 
    WHEN SUM(CASE WHEN i.has_cutting_po THEN i.quantity ELSE 0 END) = 0
    THEN 0
    ELSE
      (SUM(CASE 
            WHEN i.has_cutting_po 
             AND ih_cut.id IS NOT NULL 
            THEN i.quantity 
            ELSE 0 
          END)
      /
      SUM(CASE WHEN i.has_cutting_po THEN i.quantity ELSE 0 END)) * 100
  END AS cutting_percent,

  SUM(CASE WHEN i.has_drilling_po THEN i.quantity ELSE 0 END) AS drilling_total,
  SUM(CASE 
        WHEN i.has_drilling_po 
         AND ih_dri.id IS NOT NULL 
        THEN i.quantity 
        ELSE 0 
      END) AS drilling_done,
  CASE 
    WHEN SUM(CASE WHEN i.has_drilling_po THEN i.quantity ELSE 0 END) = 0
    THEN 0
    ELSE
      (SUM(CASE 
            WHEN i.has_drilling_po 
             AND ih_dri.id IS NOT NULL 
            THEN i.quantity 
            ELSE 0 
          END)
      /
      SUM(CASE WHEN i.has_drilling_po THEN i.quantity ELSE 0 END)) * 100
  END AS drilling_percent,

  SUM(CASE WHEN i.has_bordering_po THEN i.quantity ELSE 0 END) AS border_total,
  SUM(CASE 
        WHEN i.has_bordering_po
         AND ih_bor.id IS NOT NULL 
        THEN i.quantity 
        ELSE 0 
      END) AS border_done,
  CASE 
    WHEN SUM(CASE WHEN i.has_bordering_po THEN i.quantity ELSE 0 END) = 0
    THEN 0
    ELSE
      (SUM(CASE 
            WHEN i.has_bordering_po 
             AND ih_bor.id IS NOT NULL 
            THEN i.quantity 
            ELSE 0 
          END)
      /
      SUM(CASE WHEN i.has_bordering_po THEN i.quantity ELSE 0 END)) * 100
  END AS border_percent,

  SUM(CASE WHEN i.has_packaging_po THEN i.quantity ELSE 0 END) AS packing_total,
  SUM(CASE 
        WHEN i.has_packaging_po
         AND ih_pack.id IS NOT NULL 
        THEN i.quantity 
        ELSE 0 
      END) AS packing_done,
  CASE 
    WHEN SUM(CASE WHEN i.has_packaging_po THEN i.quantity ELSE 0 END) = 0
    THEN 0
    ELSE
      (SUM(CASE 
            WHEN i.has_packaging_po 
             AND ih_pack.id IS NOT NULL 
            THEN i.quantity 
            ELSE 0 
          END)
      /
      SUM(CASE WHEN i.has_packaging_po THEN i.quantity ELSE 0 END)) * 100
  END AS packing_percent,
  CASE
  WHEN
    (cutting_total = 0 OR cutting_done = cutting_total)
    AND (drilling_total = 0 OR drilling_done = drilling_total)
    AND (border_total = 0 OR border_done = border_total)
    AND (packing_total = 0 OR packing_done = packing_total)
  THEN 'DONE'
  ELSE 'PENDING'
END AS order_status

FROM public."Item" i

LEFT JOIN public."ItemHistory" ih_cut
  ON ih_cut."itemId" = i.id AND ih_cut."machineId" = 1

LEFT JOIN public."ItemHistory" ih_dri
  ON ih_dri."itemId" = i.id AND ih_dri."machineId" = 2

LEFT JOIN public."ItemHistory" ih_bor
  ON ih_bor."itemId" = i.id AND ih_bor."machineId" = 3

LEFT JOIN public."ItemHistory" ih_pack
  ON ih_pack."itemId" = i.id AND ih_pack."machineId" = 4

WHERE order_number = ${id}::integer
GROUP BY i.order_number, i.batch_number, i.box_number, i.order_date, i.order_delivery_date
`;
    // i."companyId" = ${companyId}::integer
  res.status(200).json(result);

  } catch (error: unknown) {
    res.status(500).json({ error: 'Erro ao atualizar' });
  }
};

