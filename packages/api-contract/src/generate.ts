import { z } from 'zod';

export const generateRunSchema = z.object({
  action: z.string(),
  args: z.record(z.any()),
});

export type GenerateRunParams = z.infer<typeof generateRunSchema>;
