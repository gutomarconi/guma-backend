import { z } from 'zod';

export const createApiKeySchema = z.object({
  description: z.string().optional(),
  companyId: z.number().int(),
  secret: z.string()
});

export const updateApiKeySchema = z.object({
  description: z.string().optional(),
  active: z.boolean().optional(),
  secret: z.string(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;