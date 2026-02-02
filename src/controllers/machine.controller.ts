import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createMachineSchema, updateMachineSchema } from '../schemas/machine.schema';
import { Prisma } from '@prisma/client';

/**
 * @swagger
 * tags:
 *   name: Machines
 */
export const getMachines = async (req: Request, res: Response) => {
  const { companyId, poId } = req.query;
  const where: any = {};
  if (companyId) where.companyId = Number(companyId);
  if (poId) where.poId = Number(poId);

  const machines = await prisma.machine.findMany({ where, include: {
    po: {
      select: {
        description: true,
      },
    },
  }, });
  const result = machines.map(m => ({
  ...m,
  poDescription: m.po?.description || null,
}));
  res.json(result);
};

export const createMachine = async (req: Request, res: Response) => {
  const result = createMachineSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  try {
    const machine = await prisma.machine.create({ data: result.data });
    res.status(201).json(machine);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') return res.status(400).json({ error: 'PO ou Company inválida' });
      res.status(500).json({ error: 'Erro ao criar máquina' });
    }
  }
};

export const updateMachine = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = updateMachineSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  try {
    const machine = await prisma.machine.update({ where: { id: Number(id) }, data: result.data });
    res.json(machine);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Máquina não encontrada' });
      res.status(500).json({ error: 'Erro ao atualizar' });
    }
  }
};

export const deleteMachine = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.machine.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
      res.status(500).json({ error: 'Erro ao deletar' });
    }
  }
};

export const getMachineStats = async (req: Request, res: Response) => {
    const { startDate, endDate } = req.body;
    const { id } = req.params;
    const { companyId } = req.user;

    console.log(startDate, endDate, id, companyId)
    if (!startDate || !endDate || !id) {
        return res.status(400).json({ error: 'Date filters and/or machine id are missing' });
    }

    try {
      const result = await prisma.$queryRaw`
        SELECT
          m.capacity AS "dailyCapacity",
          m.unity_cost AS "unityCost",
          m.capacity_unity AS "capacityUnity",

          COUNT(ih.id) AS "totalDone",

          CASE
            WHEN m.capacity_unity = 'M2' THEN i.square_meter
            WHEN m.capacity_unity = 'M3' THEN i.cubic_meter
            WHEN m.capacity_unity = 'M'  THEN i.linear_meter
            ELSE 1
          END AS "itemMetric"

        FROM "Machine" m

        LEFT JOIN "ItemHistory" ih
          ON ih."machineId" = m.id
          AND ih."readDate" BETWEEN ${startDate}::date AND ${endDate}::date

        LEFT JOIN "Item" i
          ON i.id = ih."itemId"

        WHERE m.id = ${Number(id)} and m."companyId" = ${Number(companyId)}

        GROUP BY
          m.capacity,
          m.unity_cost,
          m.capacity_unity,
          i.square_meter,
          i.cubic_meter,
          i.linear_meter;      
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
}