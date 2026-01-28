import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createApiKeySchema, updateApiKeySchema } from '../schemas/apikey.schema';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

/**
 * @swagger
 * tags:
 *   name: ApiKeys
 */
export const getApiKeys = async (req: Request, res: Response) => {
  const { companyId } = req.query;
  const where = companyId ? { companyId: Number(companyId) } : {};

  const apiKeys = await prisma.apiKey.findMany({
    where,
    select: { id: true, key: true, description: true, active: true, createdAt: true },
  });
  res.json(apiKeys);
};

export const createApiKey = async (req: Request, res: Response) => {
  const result = createApiKeySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });
  const { companyId } = result.data;
  const envSecret = process.env.API_KEY_SECRET ?? '';
  if (envSecret !== result.data.secret) {
    res.status(400).json({ errors: ['Secret does not match'] });    
  }
  const company = await prisma.company.findFirst({ where: { id: companyId } });
  if (!company) {
    res.status(400).json({ errors: ['Company does not exist'] });
  }

  const key = randomUUID();

  try {
    const apiKey = await prisma.apiKey.create({
      data: { ...result.data, key },
      select: { id: true, key: true, description: true, active: true },
    });
    res.status(201).json(apiKey);
  } catch (error: unknown) {
    console.log(error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') return res.status(400).json({ error: 'Company não existe' });
      res.status(500).json({ error: 'Erro ao criar chave' });
    }
  }
};

export const updateApiKey = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = updateApiKeySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  try {
    const apiKey = await prisma.apiKey.update({
      where: { id: Number(id) },
      data: result.data,
      select: { id: true, key: true, description: true, active: true },
    });
    res.json(apiKey);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Chave não encontrada' });
      res.status(500).json({ error: 'Erro ao atualizar' });
    }
  }
};

export const deleteApiKey = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.apiKey.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Não encontrada' });
      res.status(500).json({ error: 'Erro ao deletar' });
    }
  }
};