import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createPOSchema, updatePOSchema } from '../schemas/po.schema';
import { Prisma } from '@prisma/client';

/**
 * @swagger
 * tags:
 *   name: POs
 */
export const getPOs = async (req: Request, res: Response) => {
  const pos = await prisma.pO.findMany({ orderBy: { createdAt: 'asc' } });
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
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'PO não encontrada' });
      res.status(500).json({ error: 'Erro ao atualizar' });
    }
  }
};

export const deletePO = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.pO.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
      res.status(500).json({ error: 'Erro ao deletar' });
    }
  }
};

export const getPOStats = async (req: Request, res: Response) => {
    const { startDate, endDate, machineId } = req.body;
    const { id } = req.params;
    const { companyId } = req.user;

    if (!startDate || !endDate || !id) {
        return res.status(400).json({ error: 'Date filters and/or machine id are missing' });
    }

    try {
      const result = await prisma.$queryRaw<
        {
          id: number;
          dailyCapacity: number;
          unityCost: number;
          capacityUnity: string;
          totalDone: number;
          itemMetric: number;
          itemSquareMeter: number;
        }[]
      >`
        SELECT 
          m.id,
          m.capacity AS "dailyCapacity",
          m.unity_cost AS "unityCost",
          m.capacity_unity AS "capacityUnity",
          COUNT(h.id) AS "totalDone",
          SUM(p.square_meter) AS "itemSquareMeter",
          SUM(
            CASE
              WHEN m.capacity_unity = 'M2' THEN p.square_meter
              WHEN m.capacity_unity = 'M3' THEN p.cubic_meter
              WHEN m.capacity_unity = 'M'  THEN p.linear_meter
              ELSE 1
            END
          ) AS "itemMetric"
        FROM "OrderItemHistory" h
        JOIN "Machine" m ON m.id = h.machine_id
        JOIN "Product" p ON p.id = h.product_id
        WHERE h.read_date >= ${startDate}::date
        AND h.read_date < (${endDate}::date + interval '1 day')
        AND m."poId" = ${Number(id)}
        AND m."companyId" = ${Number(companyId)}
        ${machineId ? Prisma.sql` AND m.id = ${machineId}` : Prisma.empty}
        GROUP BY m.id
      `;

      const totals = result.reduce(
        (acc, m) => {
          acc.dailyCapacity += m.dailyCapacity
          acc.totalDone = BigInt(acc.totalDone) + BigInt(m.totalDone)
          acc.itemMetric += m.itemMetric
          acc.unitCost += m.unityCost
          acc.capacityUnity = m.capacityUnity,
          acc.itemSquareMeter += m.itemSquareMeter
          return acc
        },
        {
          dailyCapacity: 0,
          totalDone: 0n,
          itemMetric: 0,
          unitCost: 0,
          capacityUnity: '',
          itemSquareMeter: 0,
        }
      )

      const response = {
        dailyCapacity: totals.dailyCapacity,
        totalDone: Number(totals.totalDone),
        itemMetric: Number(totals.itemMetric.toFixed(2)),
        unityCost: totals.unitCost,
        capacityUnity: totals.capacityUnity,
        itemSquareMeter: totals.itemSquareMeter
      }

      res.status(200).json(response);
    } catch(err:any) {
        console.log(err)
        res.status(500).json({ error: 'Erro ao tentar buscar pedidos' });
    }
};

export async function getPackagingPendingBarcodes(req: Request, res: Response) {
  try {
    const result = await prisma.$queryRaw<
        {
          barcode: string;
        }[]
      >`
        select barcode from "OrderItem" oi where Not exists (select 1 from "OrderItemHistory" oih where oih.order_item_id = oi.id and oih.po_id = 4)
      `;

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar fila de embalagem" });
  }
}

