import { z } from 'zod';

export const createMachineFingerprintSchema = z.object({
  companyId: z.number().int(),
  fingerprint: z.string(),
  active: z.boolean(),
  machineId: z.number().int(),
});

export const updateMachineFingerprintSchema = createMachineFingerprintSchema.partial();

export type CreateMachineFingerInput = z.infer<typeof createMachineFingerprintSchema>;
export type UpdateMachineFingerInput = z.infer<typeof updateMachineFingerprintSchema>;