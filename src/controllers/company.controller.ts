import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createCompanySchema, updateCompanySchema } from '../schemas/company.schema';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createMachineSchema } from '../schemas/machine.schema';
import { sendConfigEmail, sendResetEmail, sendWelcomEmail } from '../services/EmailService';
/**
 * @swagger
 * tags:
 *   name: Companies
 */
export const getCompanies = async (req: Request, res: Response) => {
  const { page = 1, limit = 10, name } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = name
    ? {
        name: {
          contains: name as string,
          mode: 'insensitive' as const,
        },
      }
    : {};

  const [companies, total] = await Promise.all([
    prisma.company.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'asc' } }),
    prisma.company.count({ where }),
  ]);

  res.json({ data: companies, total, page: Number(page), limit: Number(limit) });
};

/**
 * @swagger
 * /companies/{id}:
 *   get:
 *     summary: Busca empresa por ID
 *     tags: [Companies]
 */
export const getCompanyById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const company = await prisma.company.findUnique({
    where: { id: Number(id) },
    include: { users: true, apiKeys: true },
  });
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json(company);
};

export const createCompany = async (req: Request, res: Response) => {
  const result = createCompanySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  const company = await prisma.company.create({ data: result.data });
  res.status(201).json(company);
};

export const updateCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = updateCompanySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  try {
    const company = await prisma.company.update({
      where: { id: Number(id) },
      data: result.data,
    });
    res.json(company);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
      res.status(500).json({ error: 'Erro ao atualizar' });
    }
  }
};

export const deleteCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.company.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
      res.status(500).json({ error: 'Erro ao deletar' });
    }
  }
};

type IOnboardingRequest = {
	amountOfCuttingMachines: number; 
	companyName: string; 
	name: string; 
	email: string; 
	password: string; 
	amountOfBorderMachines: number; 
	amountOfDrillingMachines: number; 
	amountOfPackagingMachines: number; 
}

const isOnboardingInfoValid = (companyInfo: IOnboardingRequest): boolean => {
    const {
      companyName,
      email,
      name,
      password,
      amountOfBorderMachines = 0,
      amountOfCuttingMachines = 0,
      amountOfDrillingMachines = 0,
      amountOfPackagingMachines = 0,
    } = companyInfo;
    const isStep1Ok = !!companyName && !!email && !!name && !!password;
    const isStep2Ok =
      amountOfBorderMachines >= 0 &&
      amountOfCuttingMachines > 0 &&
      amountOfDrillingMachines >= 0 &&
      amountOfPackagingMachines >= 0;
    return isStep1Ok && isStep2Ok;
  };

export const onboarding = async (req: Request, res: Response) => {
  const companyInfo: IOnboardingRequest = req.body;
  if (!isOnboardingInfoValid(companyInfo)) {
      return res.status(400).json({
        message: 'Configurações incompletas',
      });
    }
  try {
    await prisma.$transaction(async (tx) => {
      const company = await prisma.company.create({ data: { name: companyInfo.companyName } });
      const hashed = await bcrypt.hash(companyInfo.password, 10);
      const userPayload = {
        name: companyInfo.name,
        email: companyInfo.email,
        role: 'admin',
        companyId: company.id,
        senha: hashed
      }
      const user = await prisma.user.create({ data: userPayload });
      const machines: string[] = []
      for (let i = 1; i <= companyInfo.amountOfCuttingMachines; i++) {
        const po = await prisma.pO.findFirst({ where: { id: 1 }})
        const machinePayload = {
          description: `Seccionadora ${i}`,
          companyId: company.id,
          poId: po.id,
          capacity: 1,
          capacity_unity: 'M2',
          unity_cost: 1
        }
        const result = createMachineSchema.safeParse(machinePayload);
        if (!result.success) return res.status(400).json({ errors: result.error.format() });
        const machine = await prisma.machine.create({ data: result.data  });
        machines.push(`Seccionadora ${i} -> id: ${machine.id}`)
      }
      for (let i = 1; i <= companyInfo.amountOfBorderMachines; i++) {
        const po = await prisma.pO.findFirst({ where: { id: 2 }})
        const machinePayload = {
          description: `Bordeatriz ${i}`,
          companyId: company.id,
          poId: po.id,
          capacity: 1,
          capacity_unity: 'M',
          unity_cost: 1
        }
        const result = createMachineSchema.safeParse(machinePayload);
        if (!result.success) return res.status(400).json({ errors: result.error.format() });
        const machine = await prisma.machine.create({ data: result.data  });
        machines.push(`Bordeatriz ${i} -> id: ${machine.id}`)
      }
      for (let i = 1; i <= companyInfo.amountOfDrillingMachines; i++) {
        const po = await prisma.pO.findFirst({ where: { id: 3 }})
        const machinePayload = {
          description: `Furadeira ${i}`,
          companyId: company.id,
          poId: po.id,
          capacity: 1,
          capacity_unity: 'UN',
          unity_cost: 1
        }
        const result = createMachineSchema.safeParse(machinePayload);
        if (!result.success) return res.status(400).json({ errors: result.error.format() });
        const machine = await prisma.machine.create({ data: result.data  });
        machines.push(`Furadeira ${i} -> id: ${machine.id}`)
      }
      for (let i = 1; i <= companyInfo.amountOfPackagingMachines; i++) {
        const po = await prisma.pO.findFirst({ where: { id: 4 }})
        const machinePayload = {
          description: `Embaladora ${i}`,
          companyId: company.id,
          poId: po.id,
          capacity: 1,
          capacity_unity: 'UN',
          unity_cost: 1
        }
        const result = createMachineSchema.safeParse(machinePayload);
        if (!result.success) return res.status(400).json({ errors: result.error.format() });
        const machine = await prisma.machine.create({ data: result.data  });
        machines.push(`Embaladora ${i} -> id: ${machine.id}`)
      }
      sendWelcomEmail(companyInfo.email, companyInfo.password)
      sendConfigEmail(company.name, company.id, machines)
    })
    
    res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
      res.status(500).json({ error: 'Erro ao deletar' });
    }
  }
};

