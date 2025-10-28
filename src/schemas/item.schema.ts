import { z } from 'zod';

export const createItemSchema = z.object({
  order_number: z.number().int(),
  batch_number: z.number().int(),
  box_number: z.number().int().optional(),
  barcode: z.string(),
  order_date: z.coerce.date(),
  rawData: z.record(z.string(), z.any()),
  companyId: z.number().int(),
});

export const updateItemSchema = createItemSchema.partial();

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;