import type {
  AssetListQuery,
  AssetListAllResult,
  BrushItem,
  ColorItem,
  CreateBrushInput,
  CreateColorInput,
  CreateImageInput,
  CreatePaletteInput,
  CreatePromptInput,
  ImageItem,
  PaletteItem,
  PromptItem,
  UpdateBrushInput,
  UpdateColorInput,
  UpdatePaletteInput,
  UpdatePromptInput,
} from '@zeroDraw/api-contract';
import { randomUUID } from 'crypto';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { assetsRepository } from './assets.repository';

class AssetsService {
  private async checkOwner(
    findOwner: (id: string) => Promise<{ userId: number } | null>,
    id: string,
    userId: number
  ) {
    const owner = await findOwner(id);
    if (!owner) throw new NotFoundError('资源不存在');
    if (owner.userId !== userId) throw new ForbiddenError('无权操作');
  }

  async listColors({ userId, page, pageSize, projectId }: { userId: number } & AssetListQuery) {
    const [list, total] = await Promise.all([
      assetsRepository.findColors(userId, page, pageSize, projectId),
      assetsRepository.countColors(userId, projectId),
    ]);
    return { list: list as ColorItem[], total, page, pageSize };
  }

  async listAll(params: { userId: number } & AssetListQuery): Promise<AssetListAllResult> {
    const [colors, palettes, images, prompts] = await Promise.all([
      this.listColors(params),
      this.listPalettes(params),
      this.listImages(params),
      this.listPrompts(params),
    ]);

    return { colors, palettes, images, prompts };
  }

  async createColor({ userId, hex, name, projectId }: { userId: number } & CreateColorInput) {
    const id = randomUUID();
    const row = await assetsRepository.createColor({ id, userId, hex, name, projectId });
    return row as ColorItem;
  }

  async updateColor({
    id,
    userId,
    hex,
    name,
  }: { id: string; userId: number } & UpdateColorInput) {
    await this.checkOwner(assetsRepository.findColorOwner.bind(assetsRepository), id, userId);
    const updates: Record<string, unknown> = {};
    if (hex !== undefined) updates.hex = hex;
    if (name !== undefined) updates.name = name;
    const row = await assetsRepository.updateColor(id, updates);
    return row as ColorItem;
  }

  async deleteColor({ id, userId }: { id: string; userId: number }) {
    await this.checkOwner(assetsRepository.findColorOwner.bind(assetsRepository), id, userId);
    await assetsRepository.deleteColor(id);
  }

  async listPalettes({ userId, page, pageSize, projectId }: { userId: number } & AssetListQuery) {
    const [list, total] = await Promise.all([
      assetsRepository.findPalettes(userId, page, pageSize, projectId),
      assetsRepository.countPalettes(userId, projectId),
    ]);
    return { list: list as PaletteItem[], total, page, pageSize };
  }

  async createPalette({
    userId,
    name,
    colors,
    projectId,
  }: { userId: number } & CreatePaletteInput) {
    const id = randomUUID();
    const row = await assetsRepository.createPalette({ id, userId, name, colors, projectId });
    return row as PaletteItem;
  }

  async updatePalette({
    id,
    userId,
    name,
    colors,
  }: { id: string; userId: number } & UpdatePaletteInput) {
    await this.checkOwner(assetsRepository.findPaletteOwner.bind(assetsRepository), id, userId);
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (colors !== undefined) updates.colors = colors;
    await assetsRepository.updatePalette(id, updates);
  }

  async deletePalette({ id, userId }: { id: string; userId: number }) {
    await this.checkOwner(assetsRepository.findPaletteOwner.bind(assetsRepository), id, userId);
    await assetsRepository.deletePalette(id);
  }

  async listImages({ userId, page, pageSize, projectId }: { userId: number } & AssetListQuery) {
    const [list, total] = await Promise.all([
      assetsRepository.findImages(userId, page, pageSize, projectId),
      assetsRepository.countImages(userId, projectId),
    ]);
    return { list: list as ImageItem[], total, page, pageSize };
  }

  async createImage({
    userId,
    name,
    url,
    fileId,
    width,
    height,
    projectId,
  }: { userId: number } & CreateImageInput) {
    const id = randomUUID();
    const row = await assetsRepository.createImage({
      id,
      userId,
      name,
      url,
      fileId,
      width,
      height,
      projectId,
    });
    return row as ImageItem;
  }

  async deleteImage({ id, userId }: { id: string; userId: number }) {
    await this.checkOwner(assetsRepository.findImageOwner.bind(assetsRepository), id, userId);
    await assetsRepository.deleteImage(id);
  }

  async listPrompts({ userId, page, pageSize, projectId }: { userId: number } & AssetListQuery) {
    const [list, total] = await Promise.all([
      assetsRepository.findPrompts(userId, page, pageSize, projectId),
      assetsRepository.countPrompts(userId, projectId),
    ]);
    return {
      list: list.map((p) => ({ ...p, isFavorite: p.isFavorite === 1 })) as PromptItem[],
      total,
      page,
      pageSize,
    };
  }

  async createPrompt({
    userId,
    title,
    content,
    tags,
    projectId,
  }: { userId: number } & CreatePromptInput) {
    const id = randomUUID();
    const row = await assetsRepository.createPrompt({
      id,
      userId,
      title,
      content,
      tags,
      projectId,
    });
    return { ...row, isFavorite: row!.isFavorite === 1 } as PromptItem;
  }

  async updatePrompt({
    id,
    userId,
    title,
    content,
    tags,
  }: { id: string; userId: number } & UpdatePromptInput) {
    await this.checkOwner(assetsRepository.findPromptOwner.bind(assetsRepository), id, userId);
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = tags;
    await assetsRepository.updatePrompt(id, updates);
  }

  async toggleFavoritePrompt({
    id,
    userId,
    isFavorite,
  }: {
    id: string;
    userId: number;
    isFavorite: boolean;
  }) {
    await this.checkOwner(assetsRepository.findPromptOwner.bind(assetsRepository), id, userId);
    await assetsRepository.toggleFavoritePrompt(id, isFavorite);
  }

  async deletePrompt({ id, userId }: { id: string; userId: number }) {
    await this.checkOwner(assetsRepository.findPromptOwner.bind(assetsRepository), id, userId);
    await assetsRepository.deletePrompt(id);
  }

  // ----------------------------------------------------------------
  // Brushes
  // ----------------------------------------------------------------

  async listBrushes({ userId, page, pageSize, projectId }: { userId: number } & AssetListQuery) {
    const [list, total] = await Promise.all([
      assetsRepository.findBrushes(userId, page, pageSize, projectId),
      assetsRepository.countBrushes(userId, projectId),
    ]);
    return { list: list as BrushItem[], total, page, pageSize };
  }

  async createBrush({
    userId,
    name,
    config,
    thumbnail,
    projectId,
  }: { userId: number } & CreateBrushInput) {
    const id = randomUUID();
    const row = await assetsRepository.createBrush({
      id,
      userId,
      name,
      config,
      thumbnail,
      projectId,
    });
    return row as BrushItem;
  }

  async updateBrush({
    id,
    userId,
    name,
    config,
    thumbnail,
  }: { id: string; userId: number } & UpdateBrushInput) {
    await this.checkOwner(assetsRepository.findBrushOwner.bind(assetsRepository), id, userId);
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (config !== undefined) updates.config = config;
    if (thumbnail !== undefined) updates.thumbnail = thumbnail;
    await assetsRepository.updateBrush(id, updates);
  }

  async deleteBrush({ id, userId }: { id: string; userId: number }) {
    await this.checkOwner(assetsRepository.findBrushOwner.bind(assetsRepository), id, userId);
    await assetsRepository.deleteBrush(id);
  }
}

export const assetsService = new AssetsService();
