import { z } from 'zod';

export const idParam = z.object({ id: z.string() });
export const favoriteBody = z.object({ isFavorite: z.boolean() });
