import { z } from "zod";

// Schema para o conteúdo do campo "mappings"
// Exemplo válido: { orderNumber: "A", batchNumber: "B", dateColumn: "C" }
const mappingEntrySchema = z.object(
  z.string().min(1, "O nome da coluna não pode ser vazio")
);

// Schema completo de criação
export const createFileMappingSchema = z.object({
  companyId: z.number().int().positive(),
  mappings: mappingEntrySchema,
});

// Schema de atualização parcial
export const updateFileMappingSchema = createFileMappingSchema.partial();

// Schema de resposta (usado no controller)
export const fileMappingResponseSchema = createFileMappingSchema.extend({
  id: z.number(),
  createdAt: z.string().datetime(),
});

// Tipos TypeScript inferidos automaticamente
export type CreateFileMappingInput = z.infer<typeof createFileMappingSchema>;
export type UpdateFileMappingInput = z.infer<typeof updateFileMappingSchema>;
export type FileMappingResponse = z.infer<typeof fileMappingResponseSchema>;
