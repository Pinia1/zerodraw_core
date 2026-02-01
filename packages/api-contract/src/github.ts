import { z } from 'zod';

export const githubCallbackSchema = z.object({
  code: z.string(),
});
