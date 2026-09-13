import { z } from 'zod';

/** 创建项目 */
export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(255).default('Untitled'),
  canvasWidth: z.number().int().min(1).default(800),
  canvasHeight: z.number().int().min(1).default(600),
  backgroundColor: z.string().default('#ffffff'),
  backgroundVisible: z.boolean().default(false),
  thumbnailKey: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/** 更新项目元数据 */
export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  thumbnailKey: z.string().optional(),
  canvasWidth: z.number().int().min(1).optional(),
  canvasHeight: z.number().int().min(1).optional(),
  backgroundColor: z.string().optional(),
  backgroundVisible: z.boolean().optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/** 项目列表查询参数 */
export const listProjectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  deleted: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

export type ListProjectQuery = z.infer<typeof listProjectQuerySchema>;

export const projectIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;

/** Studio 画布持久化快照 */
export const projectFlowViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

export const projectFlowStateSchema = z.object({
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.record(z.string(), z.unknown())),
  viewport: projectFlowViewportSchema,
});

export type ProjectFlowState = z.infer<typeof projectFlowStateSchema>;

export const saveProjectFlowSchema = projectFlowStateSchema;

export type SaveProjectFlowInput = z.infer<typeof saveProjectFlowSchema>;

export interface ProjectItem {
  id: string;
  name: string;
  thumbnailKey: string | null;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  backgroundVisible: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectDetail extends ProjectItem {
  flowState: ProjectFlowState | null;
}

export interface ProjectListResponse {
  list: ProjectItem[];
  total: number;
  page: number;
  pageSize: number;
}
