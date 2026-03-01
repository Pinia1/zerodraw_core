import { z } from 'zod';

export const nanobananaGenerateSchema = z.object({
  action: z.enum(['GRAAI_NANO_BANANA']),
  s3Key: z.array(z.string()).optional(),
  args: z
    .object({
      model: z.enum(['nano-banana-2', 'nano-banana-fast', 'nano-banana', 'nano-banana-pro']),
      prompt: z.string(),
      aspectRatio: z.enum([
        'auto',
        '1:1',
        '16:9',
        '9:16',
        '4:3',
        '3:4',
        '3:2',
        '2:3',
        '5:4',
        '4:5',
        '21:9',
      ]),
      imageSize: z.enum(['1K', '2K', '4K']),
      webHook: z.enum(['-1']),
      shutProgress: z.boolean().optional(),
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
