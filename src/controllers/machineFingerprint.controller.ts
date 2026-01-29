import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createMachineFingerprintSchema, updateMachineFingerprintSchema } from '../schemas/machineFingerprint';
import { Prisma } from '@prisma/client';

/**
 * @swagger
 * tags:
 *   name: Machines
 */
export const getMachineFingerprint = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { companyId } = req.user;
  const where: any = {};
  if (companyId) where.companyId = Number(companyId);
  if (id) where.id = Number(id);
console.log(companyId, id)
  const result = await prisma.machineFingerprint.findFirst({ where });
  console.log(result)
  res.json(result);
};

export const createMachineFingerprint = async (req: Request, res: Response) => {
  const result = createMachineFingerprintSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  try {
    const machine = await prisma.machineFingerprint.create({ data: result.data });
    res.status(201).json(machine);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') return res.status(400).json({ error: 'Empresa inválida' });
      res.status(500).json({ error: 'Erro ao criar fingerprint da máquina' });
    }
  }
};

export const updateMachineFingerprint = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = updateMachineFingerprintSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  try {
    const machine = await prisma.machineFingerprint.update({ where: { id: Number(id) }, data: result.data });
    res.json(machine);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Máquina não encontrada' });
      res.status(500).json({ error: 'Erro ao atualizar' });
    }
  }
};

export const deleteMachineFingerprint = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.machineFingerprint.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
      res.status(500).json({ error: 'Erro ao deletar' });
    }
  }
};