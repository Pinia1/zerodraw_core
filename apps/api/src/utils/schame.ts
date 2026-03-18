import { z } from 'zod';
import { BadRequestError } from './errors';

export const QueryValidation = <T extends z.ZodTypeAny>(schema: T, query: any): z.infer<T> => {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new BadRequestError();
  }
  return result.data;
};
