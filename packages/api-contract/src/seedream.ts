import { z } from 'zod';

export const seedreamGenerateSchema = z.object({
  action: z.enum(['SEEDDREAM_IMAGE']),
  args: z.object({
    prompt: z.string(),
    size: z.string(),
    image: z.string().optional(),
    seed: z.number().min(-1).max(2147483647).optional(),
    sequential_image_generation: z.enum(['auto', 'disabled']).default('disabled'),
    stream: z.boolean().optional().default(false),
    response_format: z.enum(['url', 'base64']).optional().default('url'),
    watermark: z.boolean().optional().default(false),
    optimize_prompt_optionsnew: z.enum(['standard', 'fast']).default('standard'),
  }),
});

export type SeedreamGenerateParams = z.infer<typeof seedreamGenerateSchema>;

export const seedreamGetTaskResponseSchema = z.object({
  id: z.string(),
});

export type SeedreamGetTaskResponse = z.infer<typeof seedreamGetTaskResponseSchema>;
