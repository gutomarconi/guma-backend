import { z } from 'zod';

export const createItemHistorySchema = z.object({
  itemId: z.number().int(),
  machineId: z.number().int(),
  companyId: z.number().int(),
});

export type CreateItemHistoryInput = z.infer<typeof createItemHistorySchema>;