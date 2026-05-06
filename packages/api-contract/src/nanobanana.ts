import { z } from 'zod';

export const nanobananaGenerateSchema = z.object({
  action: z.enum(['GRAAI_NANO_BANANA']),
  s3Key: z.array(z.string()).optional(),
  args: z
    .object({
      model: z.enum(['nano-banana-2', 'gpt-image-2', 'nano-banana-pro']),
      prompt: z.string(),
      aspectRatio: z.string(),
      imageSize: z.enum(['512px', '1K', '2K', '4K']),
    })
    .passthrough(),
});

export type NanobananaGenerateParams = z.infer<typeof nanobananaGenerateSchema>;

export const nanabananaQuerySchema = z.object({
  model: z.string(),
  prompt: z.string(),
  aspectRatio: z.string(),
  imageSize: z.enum(['1K', '2K', '4K']),
  urls: z.array(z.string()),
  webHook: z.string(),
  shutProgress: z.boolean().optional(),
});
