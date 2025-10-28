import { z } from 'zod';

export const createMachineSchema = z.object({
  description: z.string().min(1),
  companyId: z.number().int(),
  poId: z.number().int(),
  capacity: z.number(),
  capacity_unity: z.enum(['M2', 'UN']).optional(),
  unity_cost: z.number(),
});

export const updateMachineSchema = createMachineSchema.partial();

export type CreateMachineInput = z.infer<typeof createMachineSchema>;
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;