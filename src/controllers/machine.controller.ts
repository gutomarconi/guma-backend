import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createMachineSchema, updateMachineSchema } from '../schemas/machine.schema';

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

  const machines = await prisma.machine.findMany({ where });
  res.json(machines);
};

export const createMachine = async (req: Request, res: Response) => {
  const result = createMachineSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  try {
    const machine = await prisma.machine.create({ data: result.data });
    res.status(201).json(machine);
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ error: 'PO ou Company inválida' });
    res.status(500).json({ error: 'Erro ao criar máquina' });
  }
};

export const updateMachine = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = updateMachineSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  try {
    const machine = await prisma.machine.update({ where: { id: Number(id) }, data: result.data });
    res.json(machine);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Máquina não encontrada' });
    res.status(500).json({ error: 'Erro ao atualizar' });
  }
};

export const deleteMachine = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.machine.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
    res.status(500).json({ error: 'Erro ao deletar' });
  }
};