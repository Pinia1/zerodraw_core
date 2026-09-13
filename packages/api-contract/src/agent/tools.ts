import { z } from 'zod';

/** 由浏览器执行、服务端 deferred 挂起的 Studio 工具名 */
export const FRONTEND_TOOL_NAMES = [
  'get_flow_state',
  'create_flow_node',
  'update_flow_node',
  'delete_flow_node',
  'connect_flow_nodes',
] as const;

export type FrontendToolName = (typeof FRONTEND_TOOL_NAMES)[number];

export function isFrontendToolName(name: string): name is FrontendToolName {
  return (FRONTEND_TOOL_NAMES as readonly string[]).includes(name);
}

/** 前端完成 deferred 工具调用 */
export const agentFrontendToolCompleteSchema = z.object({
  toolCallId: z.string().min(1),
  result: z.unknown().optional(),
  isError: z.boolean().optional(),
  message: z.string().optional(),
});

export type AgentFrontendToolCompleteParams = z.infer<typeof agentFrontendToolCompleteSchema>;

export const agentFrontendToolCompleteResponseSchema = z.object({
  ok: z.literal(true),
  /** false = 结果已落库，但服务端已找不到对应挂起的执行上下文（进程重启等），对话无法自动续接，需重新发送消息 */
  delivered: z.boolean(),
});

export type AgentFrontendToolCompleteResponse = z.infer<
  typeof agentFrontendToolCompleteResponseSchema
>;
