import { z } from 'zod';

// ----------------------------------------------------------------
// Common
// ----------------------------------------------------------------

export const assetListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  projectId: z.string().uuid().optional(),
});
export type AssetListQuery = z.infer<typeof assetListQuerySchema>;

const idParamSchema = z.object({ id: z.string() });
export type IdParam = z.infer<typeof idParamSchema>;

// ----------------------------------------------------------------
// Colors
// ----------------------------------------------------------------

export const createColorSchema = z.object({
  hex: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Invalid hex color'),
  name: z.string().max(100).optional(),
  projectId: z.string().uuid().optional(),
});
export type CreateColorInput = z.infer<typeof createColorSchema>;

export const updateColorSchema = z.object({
  hex: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Invalid hex color').optional(),
  name: z.string().max(100).optional(),
});
export type UpdateColorInput = z.infer<typeof updateColorSchema>;

export interface ColorItem {
  id: string;
  hex: string;
  name: string | null;
  projectId: string | null;
  createdAt: number;
}

// ----------------------------------------------------------------
// Palettes
// ----------------------------------------------------------------

export const createPaletteSchema = z.object({
  name: z.string().trim().min(1).max(100).default('Untitled'),
  colors: z.array(z.string().regex(/^#[0-9a-fA-F]{3,8}$/)).default([]),
  projectId: z.string().uuid().optional(),
});
export type CreatePaletteInput = z.infer<typeof createPaletteSchema>;

export const updatePaletteSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  colors: z.array(z.string().regex(/^#[0-9a-fA-F]{3,8}$/)).optional(),
});
export type UpdatePaletteInput = z.infer<typeof updatePaletteSchema>;

export interface PaletteItem {
  id: string;
  name: string;
  colors: string[];
  projectId: string | null;
  createdAt: number;
  updatedAt: number;
}

// ----------------------------------------------------------------
// Images
// ----------------------------------------------------------------

export const createImageSchema = z.object({
  name: z.string().trim().min(1).max(255),
  fileId: z.string().optional(),
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  projectId: z.string().uuid().optional(),
});
export type CreateImageInput = z.infer<typeof createImageSchema>;

export interface ImageItem {
  id: string;
  name: string;
  fileId: string | null;
  url: string;
  width: number | null;
  height: number | null;
  projectId: string | null;
  createdAt: number;
}

// ----------------------------------------------------------------
// Prompts
// ----------------------------------------------------------------

export const createPromptSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(5000),
  tags: z.array(z.string().max(50)).default([]),
  projectId: z.string().uuid().optional(),
});
export type CreatePromptInput = z.infer<typeof createPromptSchema>;

export const updatePromptSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  tags: z.array(z.string().max(50)).optional(),
});
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;

export interface PromptItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  projectId: string | null;
  createdAt: number;
  updatedAt: number;
}

// ----------------------------------------------------------------
// Brushes
// ----------------------------------------------------------------

export const createBrushSchema = z.object({
  name: z.string().trim().min(1).max(100),
  config: z.record(z.string(), z.unknown()),
  thumbnail: z.string().optional(),
  projectId: z.string().uuid().optional(),
});
export type CreateBrushInput = z.infer<typeof createBrushSchema>;

export const updateBrushSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  thumbnail: z.string().optional(),
});
export type UpdateBrushInput = z.infer<typeof updateBrushSchema>;

export interface BrushItem {
  id: string;
  name: string;
  config: Record<string, unknown>;
  thumbnail: string | null;
  projectId: string | null;
  createdAt: number;
  updatedAt: number;
}

// ----------------------------------------------------------------
// Paginated response
// ----------------------------------------------------------------

export interface AssetListResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AssetListAllResult {
  colors: AssetListResult<ColorItem>;
  palettes: AssetListResult<PaletteItem>;
  images: AssetListResult<ImageItem>;
  prompts: AssetListResult<PromptItem>;
}
