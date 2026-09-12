import { z } from 'zod';

/** 创建创作助手会话 */
export const agentCreateSessionSchema = z.object({
  title: z.string().trim().max(255).optional(),
});

export type AgentCreateSessionParams = z.infer<typeof agentCreateSessionSchema>;

/** 会话列表查询 */
export const agentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AgentListQuery = z.infer<typeof agentListQuerySchema>;

/** 会话 id 路径参数 */
export const agentSessionParamsSchema = z.object({
  id: z.string(),
});

export type AgentSessionParams = z.infer<typeof agentSessionParamsSchema>;

export const agentPromptImageSchema = z
  .object({
    data: z.string().min(1).max(20_000_000).optional(),
    mimeType: z.string().min(1).optional(),
    s3Key: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.s3Key) || Boolean(value.data), {
    message: 'image requires s3Key or data',
  });

export type AgentPromptImage = z.infer<typeof agentPromptImageSchema>;

/** 发起创作请求（prompt） */
export const agentPromptSchema = z.object({
  message: z.string().min(1),
  images: z.array(agentPromptImageSchema).max(4).optional(),
});

export type AgentPromptParams = z.infer<typeof agentPromptSchema>;

/** 恢复被挂起的会话（deferred 工具 / 模型 deferred 响应放行） */
export const agentResumeSchema = z.object({
  toolCallId: z.string().optional(),
  decision: z.enum(['approve', 'reject']).default('approve'),
  /** 预留：人工确认类前端工具回传结果 */
  result: z.unknown().optional(),
});

export type AgentResumeParams = z.infer<typeof agentResumeSchema>;

/** 会话详情中的单条 transcript 条目（message 为主，保留 compaction 等类型） */
export const agentTranscriptEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['message', 'compaction', 'branch_summary', 'custom']),
  timestamp: z.number(),
  customType: z.string().optional(),
  message: z.unknown().optional(),
  summary: z.string().optional(),
  data: z.unknown().optional(),
});

export type AgentTranscriptEntry = z.infer<typeof agentTranscriptEntrySchema>;

/** 会话详情（元数据 + 主 lane transcript） */
export const agentSessionDetailSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  status: z.enum(['active', 'suspended', 'closed']),
  createdAt: z.number(),
  transcript: z.array(agentTranscriptEntrySchema),
});

export type AgentSessionDetail = z.infer<typeof agentSessionDetailSchema>;

/** resume 接口响应 */
export const agentResumeResponseSchema = z.object({
  status: z.enum(['completed', 'suspended', 'aborted', 'failed']),
  operationId: z.string().optional(),
});

export type AgentResumeResponse = z.infer<typeof agentResumeResponseSchema>;