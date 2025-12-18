import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().optional(),
  email: z.email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(["superadmin","admin","user","service"]).optional(),
  companyId: z.number().int().optional(),
});

export const updateUserSchema = createUserSchema.partial().omit({ senha: true }).extend({
  senha: z.string().min(6).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;