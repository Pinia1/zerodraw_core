import { z } from 'zod';

const agentSseBaseSchema = z.object({
  type: z.string(),
});

export const agentSseToolStartSchema = agentSseBaseSchema.extend({
  type: z.literal('tool_start'),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.unknown().optional(),
});

export const agentSseToolUpdateSchema = agentSseBaseSchema.extend({
  type: z.literal('tool_update'),
  toolCallId: z.string(),
  toolName: z.string().optional(),
  text: z.string().optional(),
});

export const agentSseToolEndSchema = agentSseBaseSchema.extend({
  type: z.literal('tool_end'),
  toolCallId: z.string(),
  toolName: z.string().optional(),
  isError: z.boolean().optional(),
  text: z.string().optional(),
});

export const agentSseSuspendedSchema = agentSseBaseSchema.extend({
  type: z.literal('suspended'),
  runId: z.string().optional(),
  operationId: z.string().optional(),
  poll: z.number().optional(),
});

export type AgentSseToolStartFrame = z.infer<typeof agentSseToolStartSchema>;
export type AgentSseToolUpdateFrame = z.infer<typeof agentSseToolUpdateSchema>;
export type AgentSseToolEndFrame = z.infer<typeof agentSseToolEndSchema>;
export type AgentSseSuspendedFrame = z.infer<typeof agentSseSuspendedSchema>;

/** 前端消费 SSE 时的最小已知帧（其余帧保持弱类型扩展） */
export type AgentSseFrame =
  | AgentSseToolStartFrame
  | AgentSseToolUpdateFrame
  | AgentSseToolEndFrame
  | AgentSseSuspendedFrame
  | { type: string; [key: string]: unknown };

export function parseAgentSseToolStart(frame: unknown): AgentSseToolStartFrame | null {
  const parsed = agentSseToolStartSchema.safeParse(frame);
  return parsed.success ? parsed.data : null;
}
