import { z } from 'zod';

export const generateRunSchema = z.object({
  action: z.string(),
  args: z.record(z.any()),
});

export type GenerateRunParams = z.infer<typeof generateRunSchema>;

export const createSeedreamSchema = z.object({
  prompt: z.string(),
  size: z.string(),
  seed: z.number().min(-1).max(2147483647).optional(),
});

export type CreateSeedreamParams = z.infer<typeof createSeedreamSchema>;
