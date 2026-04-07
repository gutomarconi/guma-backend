import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import crypto from "node:crypto";
import { sendResetEmail } from '../services/EmailService';

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

export function generateResetToken() {
  const token = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 min

  return {
    token,
    tokenHash,
    expiresAt,
  };
}

export async function forgotPassword(req, res) {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Sempre responde igual (anti-enumeração)
  if (!user) {
    console.log( 'nao achou user')
    return res.json({
      message: "Se o email existir, você receberá instruções.",
    });
  }

  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  const { token, tokenHash, expiresAt } = generateResetToken();

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  await sendResetEmail(user.email, token);

  return res.json({
    message: "Se o email existir, você receberá instruções.",
  });
}

export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      userId: true,
      id: true
    }
    // include: { userId: true },
  });

  if (!record) {
    return res.status(400).json({
      message: "Token inválido ou expirado",
    });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: Number(record.userId) },
      data: { senha: passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return res.json({
    message: "Senha redefinida com sucesso",
  });
}

export async function validateResetToken(req, res) {
  const { token } = req.query;

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) {
    return res.status(400).json({ valid: false });
  }

  return res.json({ valid: true });
}

export const updateUserPassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  try {
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { senha: hashed },
    });
    res.json(user);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Usuário não encontrado' });
      res.status(500).json({ error: 'Erro ao atualizar senha' });
    }
  }
};
