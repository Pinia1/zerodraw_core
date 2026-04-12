import { z } from 'zod';

// ─── Layer Content Schemas ────────────────────────────────────────────────────
// 对应前端 Fill，去掉无法序列化的 HTMLImageElement
const serializableFillSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  src: z.string().optional(),
  rotation: z.number().optional(),
  maxWidth: z.number().optional(),
  maxHeight: z.number().optional(),
  visible: z.boolean(),
});

const lineSchema = z.object({
  id: z.string(),
  points: z.array(z.number()),
  strokeWidth: z.number(),
  stroke: z.string(),
  opacity: z.number(),
  tension: z.number(),
  eraser: z.boolean(),
  pressure: z.array(z.number()),
  suppress: z.boolean(),
  hardness: z.number(),
  stabilizer: z.number(),
  scale: z.number(),
  fill: z.boolean(),
});

const rectSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  strokeWidth: z.number(),
  stroke: z.string(),
  opacity: z.number(),
  fill: z.string(),
});

const ellipseSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  stroke: z.string().optional(),
  strokeWidth: z.number(),
  rotation: z.number().optional(),
  width: z.number(),
  height: z.number(),
  opacity: z.number().optional(),
  listening: z.boolean().optional(),
  mouseX: z.number(),
  mouseY: z.number(),
  fill: z.string(),
});

const lassoSchema = z.object({
  id: z.string(),
  points: z.array(z.number()),
  stroke: z.string(),
  scale: z.number(),
  mode: z.enum(['add', 'remove']),
});

const diagramSchema = z.object({
  id: z.string(),
  type: z.string(),
});

const layerFilterSchema = z.object({
  blur: z.number().optional(),
  brightness: z.number().optional(),
  contrast: z.number().optional(),
  saturate: z.number().optional(),
  hueRotate: z.number().optional(),
  sepia: z.number().optional(),
  grayscale: z.number().optional(),
  invert: z.number().optional(),
});

// 图层绘画内容（存入 content JSON 列的部分）
const layerContentSchema = z.object({
  lines: z.array(lineSchema).default([]),
  eraserLines: z.array(lineSchema).default([]),
  rects: z.array(rectSchema).default([]),
  ellipses: z.array(ellipseSchema).default([]),
  paths: z.array(lineSchema).default([]),
  fills: z.array(serializableFillSchema).default([]),
  lassos: z.array(lassoSchema).default([]),
  eraseLassos: z.array(lassoSchema).default([]),
  diagrams: z.array(diagramSchema).default([]),
  remove: lineSchema.nullable().default(null),
  image: serializableFillSchema.nullable().default(null),
  thumbnail: serializableFillSchema.nullable().default(null),
  imageFull: z.boolean().optional(),
});

export type LayerContent = z.infer<typeof layerContentSchema>;
export type SerializableFill = z.infer<typeof serializableFillSchema>;
export type LayerFilter = z.infer<typeof layerFilterSchema>;

// ─── Project Schemas ──────────────────────────────────────────────────────────

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
  /** true = Trash 视图，false/undefined = 正常视图 */
  deleted: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

export type ListProjectQuery = z.infer<typeof listProjectQuerySchema>;

/** 项目 ID 路径参数 */
export const projectIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;

// ─── Layer Schemas ────────────────────────────────────────────────────────────

/** 单个图层保存体（批量保存时数组中的一项） */
export const saveLayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(255).default('layer 1'),
  order: z.number().int().min(0),
  opacity: z.number().int().min(0).max(100),
  visible: z.boolean(),
  blendMode: z.string().default('normal'),
  filter: layerFilterSchema.nullable().optional(),
  content: layerContentSchema,
});

export type SaveLayerInput = z.infer<typeof saveLayerSchema>;

/** 批量保存图层（全量替换） */
export const saveLayersSchema = z.object({
  layers: z.array(saveLayerSchema).min(1),
});

export type SaveLayersInput = z.infer<typeof saveLayersSchema>;

// ─── Response Types ───────────────────────────────────────────────────────────

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

export interface ProjectLayerDetail {
  id: string;
  name: string;
  order: number;
  opacity: number;
  visible: boolean;
  blendMode: string;
  filter: LayerFilter | null;
  content: LayerContent;
}

export interface ProjectDetail extends ProjectItem {
  layers: ProjectLayerDetail[];
}

export interface ProjectListResponse {
  list: ProjectItem[];
  total: number;
  page: number;
  pageSize: number;
}
