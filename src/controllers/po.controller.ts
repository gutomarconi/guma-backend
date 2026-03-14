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
  const { companyId } = req.query;
  const where = companyId ? { companyId: Number(companyId) } : {};

  const pos = await prisma.pO.findMany({ where, orderBy: { createdAt: 'asc' } });
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
    const { startDate, endDate } = req.body;
    const { id } = req.params;
    const { companyId } = req.user;

    if (!startDate || !endDate || !id) {
        return res.status(400).json({ error: 'Date filters and/or machine id are missing' });
    }

    try {
      const result = await prisma.$queryRaw<{
        id: number;
        dailyCapacity: number,
        unityCost: number,
        capacityUnity: string,
        totalDone: number,
        itemMetric: number,
        itemSquareMeter: number,
      }[]>`
        select m.id, m.capacity AS "dailyCapacity",
          m.unity_cost AS "unityCost",
          m.capacity_unity AS "capacityUnity",
		      count(ih.id) as "totalDone",
          sum(i.square_meter) as "itemSquareMeter",
		      sum(CASE
            WHEN m.capacity_unity = 'M2' THEN i.square_meter
            WHEN m.capacity_unity = 'M3' THEN i.cubic_meter
            WHEN m.capacity_unity = 'M'  THEN i.linear_meter
            ELSE 1
          END) AS "itemMetric"
          from public."ItemHistory" ih 
          inner join public."Item" i on i.id = ih."itemId"
          inner join public."Machine" m on m.id = ih."machineId"
          where ih."readDate" >= ${startDate}::date
AND ih."readDate" < (${endDate}::date + interval '1 day')
          and m."poId" = ${Number(id)} 
          and m."companyId" = ${Number(companyId)} 
          and i."companyId" = ${Number(companyId)} 
          group by m.id
      `;

      const totals = result.reduce(
        (acc, m) => {
          acc.dailyCapacity += m.dailyCapacity
          acc.totalDone = BigInt(acc.totalDone) + BigInt(m.totalDone)
          acc.itemMetric += m.itemMetric
          acc.unitCost += m.unityCost
          acc.capacityUnity = m.capacityUnity,
          acc.itemSquareMeter = m.itemSquareMeter
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
      }

      res.status(200).json(response);
    } catch(err:any) {
        console.log(err)
        res.status(500).json({ error: 'Erro ao tentar buscar pedidos' });
    }
};

