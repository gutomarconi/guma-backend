import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

/**
 * @swagger
 * tags:
 *   name: Users
 */
export const getUsers = async (req: Request, res: Response) => {
  const { companyId, email } = req.query;
  const where: any = {};
  if (companyId) where.companyId = Number(companyId);
  if (email) where.email = { contains: email as string, mode: 'insensitive' };
  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, companyId: true, createdAt: true },
  });
  res.json(users);
};

export const createUser = async (req: Request, res: Response) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  const { senha, ...data } = result.data;
  const hashed = await bcrypt.hash(senha, 10);

  try {
    const user = await prisma.user.create({
      data: { ...data, senha: hashed },
      select: { id: true, name: true, email: true, role: true, companyId: true },
    });
    res.status(201).json(user);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return res.status(409).json({ error: 'Email já existe' });
      res.status(500).json({ error: error });
    }
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = updateUserSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.format() });

  const data: any = { ...result.data };
  if (data.senha) data.senha = await bcrypt.hash(data.senha, 10);

  try {
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data,
      select: { id: true, name: true, email: true, role: true, companyId: true },
    });
    res.json(user);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Usuário não encontrado' });
      res.status(500).json({ error: 'Erro ao atualizar' });
    }
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Não encontrado' });
      res.status(500).json({ error: 'Erro ao deletar' });
    }
  }
};