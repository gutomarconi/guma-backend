import { z } from 'zod';

export const createPOSchema = z.object({
  description: z.string().min(1),
  companyId: z.number().int(),
});

export const updatePOSchema = createPOSchema.partial();

export type CreatePOInput = z.infer<typeof createPOSchema>;
export type UpdatePOInput = z.infer<typeof updatePOSchema>;