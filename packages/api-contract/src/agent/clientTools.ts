import { z } from 'zod';

/** 前端在 createSession 时注册的 deferred 工具定义（JSON Schema 供 LLM function calling） */
export const clientToolDefinitionSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9_]{0,63}$/, 'tool name must be snake_case'),
  description: z.string().min(1).max(2000),
  label: z.string().min(1).max(128),
  /** JSON Schema object（与 pi-ai Type.* 输出形态兼容） */
  parameters: z.record(z.string(), z.unknown()),
  requiresApproval: z.boolean().optional(),
  timeoutMs: z.number().int().positive().max(600_000).optional(),
});

export type ClientToolDefinition = z.infer<typeof clientToolDefinitionSchema>;

export const clientToolsSchema = z
  .array(clientToolDefinitionSchema)
  .max(32, 'at most 32 client tools per session');
