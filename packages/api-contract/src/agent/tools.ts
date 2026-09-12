import { z } from 'zod';

/** 由浏览器执行、服务端 deferred 挂起的工具名 */
export const FRONTEND_TOOL_NAMES = ['get_canvas_state', 'switch_draw_tool'] as const;

export const drawToolModeSchema = z.enum(['pen', 'brush', 'fill']);

export type DrawToolMode = z.infer<typeof drawToolModeSchema>;

export type FrontendToolName = (typeof FRONTEND_TOOL_NAMES)[number];

export function isFrontendToolName(name: string): name is FrontendToolName {
  return (FRONTEND_TOOL_NAMES as readonly string[]).includes(name);
}

/** get_canvas_state：读取当前画布图层摘要（只读） */
export const getCanvasStateArgsSchema = z.object({});

export type GetCanvasStateArgs = z.infer<typeof getCanvasStateArgsSchema>;

export const getCanvasStateResultSchema = z.object({
  projectId: z.string().nullable(),
  layerCount: z.number().int().nonnegative(),
  layers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      visible: z.boolean(),
      opacity: z.number(),
      order: z.number().optional(),
    }),
  ),
});

export type GetCanvasStateResult = z.infer<typeof getCanvasStateResultSchema>;

/** switch_draw_tool：切换画笔工具组形态（钢笔 / 毛刷 / 填充） */
export const switchDrawToolArgsSchema = z.object({
  mode: drawToolModeSchema,
});

export type SwitchDrawToolArgs = z.infer<typeof switchDrawToolArgsSchema>;

export const switchDrawToolResultSchema = z.object({
  previousMode: drawToolModeSchema.nullable(),
  currentMode: drawToolModeSchema,
});

export type SwitchDrawToolResult = z.infer<typeof switchDrawToolResultSchema>;

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
