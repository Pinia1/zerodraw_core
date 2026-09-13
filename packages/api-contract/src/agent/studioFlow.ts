import { z } from 'zod';

export const studioNodeTypeSchema = z.enum(['markdown', 'img', 'video']);

export type StudioNodeType = z.infer<typeof studioNodeTypeSchema>;

export const flowPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/** get_flow_state：读取 Studio 画布（含节点内容与连线） */
export const getFlowStateArgsSchema = z.object({
  nodeIds: z.array(z.string().min(1)).max(64).optional(),
  includeContent: z.boolean().optional(),
});

export type GetFlowStateArgs = z.infer<typeof getFlowStateArgsSchema>;

export const flowNodeSummarySchema = z.object({
  id: z.string(),
  type: studioNodeTypeSchema,
  position: flowPositionSchema,
  label: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  content: z.string().nullable().optional(),
  contentTruncated: z.boolean().optional(),
  src: z.string().nullable().optional(),
  s3Key: z.string().nullable().optional(),
  taskId: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

export type FlowNodeSummary = z.infer<typeof flowNodeSummarySchema>;

export const getFlowStateResultSchema = z.object({
  projectId: z.string().nullable(),
  nodeCount: z.number().int().nonnegative(),
  edgeCount: z.number().int().nonnegative(),
  viewport: flowPositionSchema.extend({ zoom: z.number() }),
  nodes: z.array(flowNodeSummarySchema),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
    }),
  ),
});

export type GetFlowStateResult = z.infer<typeof getFlowStateResultSchema>;

/** create_flow_node */
export const createFlowNodeArgsSchema = z.object({
  type: studioNodeTypeSchema,
  id: z.string().min(1).optional(),
  position: flowPositionSchema.optional(),
  label: z.string().optional(),
  content: z.string().optional(),
  src: z.string().min(1).optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  status: z.enum(['empty', 'generating', 'ready', 'failed']).optional(),
});

export type CreateFlowNodeArgs = z.infer<typeof createFlowNodeArgsSchema>;

/** update_flow_node */
export const updateFlowNodeArgsSchema = z.object({
  id: z.string().min(1),
  position: flowPositionSchema.optional(),
  label: z.string().optional(),
  content: z.string().optional(),
  src: z.string().min(1).optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  status: z.enum(['empty', 'generating', 'ready', 'failed']).optional(),
  error: z.string().optional(),
});

export type UpdateFlowNodeArgs = z.infer<typeof updateFlowNodeArgsSchema>;

/** delete_flow_node */
export const deleteFlowNodeArgsSchema = z.object({
  id: z.string().min(1),
});

export type DeleteFlowNodeArgs = z.infer<typeof deleteFlowNodeArgsSchema>;

/** connect_flow_nodes */
export const connectFlowNodesArgsSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  id: z.string().min(1).optional(),
});

export type ConnectFlowNodesArgs = z.infer<typeof connectFlowNodesArgsSchema>;

export const flowMutationResultSchema = z.object({
  ok: z.boolean(),
  message: z.string().optional(),
  nodeId: z.string().optional(),
  edgeId: z.string().optional(),
});

export type FlowMutationResult = z.infer<typeof flowMutationResultSchema>;
