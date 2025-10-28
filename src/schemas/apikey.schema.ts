import { z } from 'zod';

export const createApiKeySchema = z.object({
  description: z.string().optional(),
  companyId: z.number().int(),
});

export const updateApiKeySchema = z.object({
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;