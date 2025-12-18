import { z } from 'zod';

export const createItemSchema = z.object({
  order_number: z.number().int(),
  batch_number: z.number().int(),
  box_number: z.number().int().optional(),
  barcode: z.string(),
  order_date: z.coerce.date(),
  rawData: z.record(z.string(), z.any()),
  companyId: z.number().int(),
  load_number: z.string(),
  item_code: z.string(),
  buy_order: z.string(),
  order_delivery_date: z.coerce.date(),
  has_cutting_po: z.boolean(),
  has_bordering_po: z.boolean(),
  has_drilling_po: z.boolean(),
  has_packaging_po: z.boolean(),
  description: z.string().optional(),
  quantity: z.number()
});

export const updateItemSchema = createItemSchema.partial();

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;