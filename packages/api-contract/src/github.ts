import { z } from 'zod';

export const githubCallbackSchema = z.object({
  code: z.string(),
});

export type GithubCallbackResponse = z.infer<typeof githubCallbackSchema>;
