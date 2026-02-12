import { z } from 'zod';

/** 分页查询参数 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** 输出列表项 */
export const outputItemSchema = z.object({
  id: z.string(),
  action: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  s3Key: z.string(),
  args: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});

export type OutputItem = z.infer<typeof outputItemSchema>;

export const outputListResponseSchema = z.object({
  list: z.array(outputItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type OutputListResponse = z.infer<typeof outputListResponseSchema>;
