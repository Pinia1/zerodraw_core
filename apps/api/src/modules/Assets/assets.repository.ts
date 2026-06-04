import {
  and,
  assetBrush,
  assetColor,
  assetImage,
  assetPalette,
  assetPrompt,
  desc,
  eq,
  sql,
} from '@zeroDraw/db';
import { db } from '../../db';

const colorFields = {
  id: assetColor.id,
  hex: assetColor.hex,
  name: assetColor.name,
  projectId: assetColor.projectId,
  createdAt: sql<number>`UNIX_TIMESTAMP(${assetColor.createdAt}) * 1000`,
};

const paletteFields = {
  id: assetPalette.id,
  name: assetPalette.name,
  colors: assetPalette.colors,
  projectId: assetPalette.projectId,
  createdAt: sql<number>`UNIX_TIMESTAMP(${assetPalette.createdAt}) * 1000`,
  updatedAt: sql<number>`UNIX_TIMESTAMP(${assetPalette.updatedAt}) * 1000`,
};

const imageFields = {
  id: assetImage.id,
  name: assetImage.name,
  fileId: assetImage.fileId,
  url: assetImage.url,
  width: assetImage.width,
  height: assetImage.height,
  projectId: assetImage.projectId,
  createdAt: sql<number>`UNIX_TIMESTAMP(${assetImage.createdAt}) * 1000`,
};

const promptFields = {
  id: assetPrompt.id,
  title: assetPrompt.title,
  content: assetPrompt.content,
  tags: assetPrompt.tags,
  isFavorite: assetPrompt.isFavorite,
  projectId: assetPrompt.projectId,
  createdAt: sql<number>`UNIX_TIMESTAMP(${assetPrompt.createdAt}) * 1000`,
  updatedAt: sql<number>`UNIX_TIMESTAMP(${assetPrompt.updatedAt}) * 1000`,
};

const brushFields = {
  id: assetBrush.id,
  name: assetBrush.name,
  config: assetBrush.config,
  thumbnail: assetBrush.thumbnail,
  projectId: assetBrush.projectId,
  createdAt: sql<number>`UNIX_TIMESTAMP(${assetBrush.createdAt}) * 1000`,
  updatedAt: sql<number>`UNIX_TIMESTAMP(${assetBrush.updatedAt}) * 1000`,
};

function baseConditions(
  table: { userId: any; projectId: any },
  userId: number,
  projectId?: string
) {
  const conds = [eq(table.userId, userId)];
  if (projectId !== undefined) conds.push(eq(table.projectId, projectId));
  return conds;
}

class AssetsRepository {
  async findColors(userId: number, page: number, pageSize: number, projectId?: string) {
    return db
      .select(colorFields)
      .from(assetColor)
      .where(and(...baseConditions(assetColor, userId, projectId)))
      .orderBy(desc(assetColor.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  }

  async countColors(userId: number, projectId?: string) {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assetColor)
      .where(and(...baseConditions(assetColor, userId, projectId)));
    return Number(row?.count ?? 0);
  }

  async findColorById(id: string) {
    const [row] = await db.select(colorFields).from(assetColor).where(eq(assetColor.id, id));
    return row ?? null;
  }

  async createColor(data: {
    id: string;
    userId: number;
    hex: string;
    name?: string;
    projectId?: string;
  }) {
    await db.insert(assetColor).values(data);
    return this.findColorById(data.id);
  }

  async updateColor(id: string, fields: Record<string, unknown>) {
    await db.update(assetColor).set(fields).where(eq(assetColor.id, id));
    return this.findColorById(id);
  }

  async deleteColor(id: string) {
    await db.delete(assetColor).where(eq(assetColor.id, id));
  }

  // --- Palettes ---

  async findPalettes(userId: number, page: number, pageSize: number, projectId?: string) {
    return db
      .select(paletteFields)
      .from(assetPalette)
      .where(and(...baseConditions(assetPalette, userId, projectId)))
      .orderBy(desc(assetPalette.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  }

  async countPalettes(userId: number, projectId?: string) {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assetPalette)
      .where(and(...baseConditions(assetPalette, userId, projectId)));
    return Number(row?.count ?? 0);
  }

  async findPaletteById(id: string) {
    const [row] = await db.select(paletteFields).from(assetPalette).where(eq(assetPalette.id, id));
    return row ?? null;
  }

  async createPalette(data: {
    id: string;
    userId: number;
    name: string;
    colors: string[];
    projectId?: string;
  }) {
    await db.insert(assetPalette).values(data);
    return this.findPaletteById(data.id);
  }

  async updatePalette(id: string, fields: Record<string, unknown>) {
    await db.update(assetPalette).set(fields).where(eq(assetPalette.id, id));
  }

  async deletePalette(id: string) {
    await db.delete(assetPalette).where(eq(assetPalette.id, id));
  }

  // --- Images ---

  async findImages(userId: number, page: number, pageSize: number, projectId?: string) {
    return db
      .select(imageFields)
      .from(assetImage)
      .where(and(...baseConditions(assetImage, userId, projectId)))
      .orderBy(desc(assetImage.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  }

  async countImages(userId: number, projectId?: string) {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assetImage)
      .where(and(...baseConditions(assetImage, userId, projectId)));
    return Number(row?.count ?? 0);
  }

  async findImageById(id: string) {
    const [row] = await db.select(imageFields).from(assetImage).where(eq(assetImage.id, id));
    return row ?? null;
  }

  async createImage(data: {
    id: string;
    userId: number;
    name: string;
    url: string;
    fileId?: string;
    width?: number;
    height?: number;
    projectId?: string;
  }) {
    await db.insert(assetImage).values(data);
    return this.findImageById(data.id);
  }

  async deleteImage(id: string) {
    await db.delete(assetImage).where(eq(assetImage.id, id));
  }

  // --- Prompts ---

  async findPrompts(userId: number, page: number, pageSize: number, projectId?: string) {
    return db
      .select(promptFields)
      .from(assetPrompt)
      .where(and(...baseConditions(assetPrompt, userId, projectId)))
      .orderBy(desc(assetPrompt.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  }

  async countPrompts(userId: number, projectId?: string) {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assetPrompt)
      .where(and(...baseConditions(assetPrompt, userId, projectId)));
    return Number(row?.count ?? 0);
  }

  async findPromptById(id: string) {
    const [row] = await db.select(promptFields).from(assetPrompt).where(eq(assetPrompt.id, id));
    return row ?? null;
  }

  async createPrompt(data: {
    id: string;
    userId: number;
    title: string;
    content: string;
    tags: string[];
    projectId?: string;
  }) {
    await db.insert(assetPrompt).values(data);
    return this.findPromptById(data.id);
  }

  async updatePrompt(id: string, fields: Record<string, unknown>) {
    await db.update(assetPrompt).set(fields).where(eq(assetPrompt.id, id));
  }

  async toggleFavoritePrompt(id: string, isFavorite: boolean) {
    await db
      .update(assetPrompt)
      .set({ isFavorite: isFavorite ? 1 : 0 })
      .where(eq(assetPrompt.id, id));
  }

  async deletePrompt(id: string) {
    await db.delete(assetPrompt).where(eq(assetPrompt.id, id));
  }

  // --- Brushes ---

  async findBrushes(userId: number, page: number, pageSize: number, projectId?: string) {
    return db
      .select(brushFields)
      .from(assetBrush)
      .where(and(...baseConditions(assetBrush, userId, projectId)))
      .orderBy(desc(assetBrush.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  }

  async countBrushes(userId: number, projectId?: string) {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assetBrush)
      .where(and(...baseConditions(assetBrush, userId, projectId)));
    return Number(row?.count ?? 0);
  }

  async findBrushById(id: string) {
    const [row] = await db.select(brushFields).from(assetBrush).where(eq(assetBrush.id, id));
    return row ?? null;
  }

  async createBrush(data: {
    id: string;
    userId: number;
    name: string;
    config: Record<string, unknown>;
    thumbnail?: string;
    projectId?: string;
  }) {
    await db.insert(assetBrush).values(data);
    return this.findBrushById(data.id);
  }

  async updateBrush(id: string, fields: Record<string, unknown>) {
    await db.update(assetBrush).set(fields).where(eq(assetBrush.id, id));
  }

  async deleteBrush(id: string) {
    await db.delete(assetBrush).where(eq(assetBrush.id, id));
  }

  // --- Ownership helpers (shared pattern) ---

  async findColorOwner(id: string) {
    const [row] = await db
      .select({ userId: assetColor.userId })
      .from(assetColor)
      .where(eq(assetColor.id, id));
    return row ?? null;
  }

  async findPaletteOwner(id: string) {
    const [row] = await db
      .select({ userId: assetPalette.userId })
      .from(assetPalette)
      .where(eq(assetPalette.id, id));
    return row ?? null;
  }

  async findImageOwner(id: string) {
    const [row] = await db
      .select({ userId: assetImage.userId })
      .from(assetImage)
      .where(eq(assetImage.id, id));
    return row ?? null;
  }

  async findPromptOwner(id: string) {
    const [row] = await db
      .select({ userId: assetPrompt.userId })
      .from(assetPrompt)
      .where(eq(assetPrompt.id, id));
    return row ?? null;
  }

  async findBrushOwner(id: string) {
    const [row] = await db
      .select({ userId: assetBrush.userId })
      .from(assetBrush)
      .where(eq(assetBrush.id, id));
    return row ?? null;
  }
}

export const assetsRepository = new AssetsRepository();
