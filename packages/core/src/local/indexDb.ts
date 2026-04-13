/**
 * indexDb.ts — 图层持久化公开 API（DI 容器）
 *
 * 职责：
 *   1. 持有当前 StorageProvider 实例，支持运行时切换
 *   2. 跟踪当前 projectId，不同项目的数据隔离存储
 *   3. 序列化 / 反序列化（与具体 Provider 无关）
 *   4. 防抖写入策略
 *   5. 图片资源恢复（buffer → blob URL / url 直连 → HTMLImageElement）
 *
 * 使用方式：
 *   // 设置当前项目（Drawing 挂载时调用）
 *   import { setCurrentProject } from '../local/indexDb';
 *   setCurrentProject(projectId);
 *
 *   // 切换为服务端 Provider
 *   import { setStorageProvider } from '../local/indexDb';
 *   setStorageProvider(new ServerStorageProvider({ apiUrl }));
 */

import type { Fill, Layers } from '../types/Layers';
import { IndexedDBStorageProvider } from './indexedDBProvider';
import type { ImageResource, SerializedFill, SerializedLayer, StorageProvider } from './types';

// re-export types
export type { ImageResource, SerializedFill, SerializedLayer, StorageLoadResult, StorageProvider } from './types';

// ─── DI 容器 ──────────────────────────────────────────────────────────────────

let _provider: StorageProvider = new IndexedDBStorageProvider();
let _currentProjectId = 'default';

/**
 * 设置当前项目 ID。
 * 应在 Drawing 组件挂载时（rehydrate 之前）调用。
 * 不同 projectId 的数据在 IndexedDB 中独立存储（key 隔离）。
 * 传 null 或不传时回退到 'default'。
 */
export function setCurrentProject(projectId: string | null | undefined): void {
  _currentProjectId = projectId ?? 'default';
}

/** 获取当前项目 ID */
export function getCurrentProject(): string {
  return _currentProjectId;
}

/**
 * 切换存储 Provider。
 * 调用后会销毁旧 Provider 的资源（Worker、连接等），并重置防抖定时器。
 */
export function setStorageProvider(provider: StorageProvider): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  _provider.destroy?.();
  _provider = provider;
}

/** 获取当前激活的 Provider（调试用） */
export function getStorageProvider(): StorageProvider {
  return _provider;
}

// ─── Serialize（与 Provider 无关） ────────────────────────────────────────────

function serializeFill({ img: _img, ...rest }: Fill): SerializedFill {
  return rest;
}

export function serializeLayers(layers: Layers[]): SerializedLayer[] {
  return layers.map((layer) => ({
    ...layer,
    fills: layer.fills.map(serializeFill),
    image: layer.image ? serializeFill(layer.image) : null,
    thumbnail: layer.thumbnail ? serializeFill(layer.thumbnail) : null,
  }));
}

// ─── Deserialize（统一处理 buffer / url 两种图片来源） ─────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // 非 blob/data URL 需要 CORS 属性，否则渲染到 canvas 后会被标记为 tainted
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'Anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 60)}`));
    img.src = src;
  });
}

async function restoreFill(
  fill: SerializedFill,
  images: Record<string, ImageResource>,
): Promise<Fill> {
  const resource = images[fill.id];

  if (resource?.buffer) {
    try {
      const blob = new Blob([resource.buffer], { type: resource.mimeType });
      const blobUrl = URL.createObjectURL(blob);
      const img = await loadImage(blobUrl);
      return { ...fill, img };
    } catch {
      // blob 加载失败，继续尝试其他来源
    }
  }

  if (resource?.url) {
    try {
      const img = await loadImage(resource.url);
      return { ...fill, img, src: resource.url };
    } catch {
      // URL 加载失败
    }
  }

  if (fill.src) {
    try {
      const img = await loadImage(fill.src);
      return { ...fill, img };
    } catch {
      // 全部失败
    }
  }

  return { ...fill };
}

async function deserializeLayers(
  serialized: SerializedLayer[],
  images: Record<string, ImageResource>,
): Promise<Layers[]> {
  return Promise.all(
    serialized.map(async (layer) => ({
      ...layer,
      fills: await Promise.all(layer.fills.map((f) => restoreFill(f, images))),
      image: layer.image ? await restoreFill(layer.image, images) : null,
      thumbnail: layer.thumbnail ? await restoreFill(layer.thumbnail, images) : null,
    })),
  );
}

// ─── Debounced save ───────────────────────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * debounce 时捕获 projectId（闭包），避免延迟执行时 projectId 已切换。
 */
function debouncedSave(layers: SerializedLayer[], projectId: string, delay = 800): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    _provider.save(layers, projectId).catch(console.error);
    saveTimer = null;
  }, delay);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * 防抖存储图层快照（800ms），自动绑定当前 projectId。
 */
export function saveLayersSnapshot(layers: Layers[]): void {
  const serialized = serializeLayers(layers);
  debouncedSave(serialized, _currentProjectId);
}

/**
 * 立即存储（不防抖），适合 beforeunload / visibilitychange。
 */
export async function saveLayersSnapshotNow(layers: Layers[]): Promise<void> {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const serialized = serializeLayers(layers);
  const pid = _currentProjectId;
  if (_provider.saveImmediate) {
    await _provider.saveImmediate(serialized, pid);
  } else {
    await _provider.save(serialized, pid);
  }
}

/**
 * 从当前 Provider 加载当前项目的图层快照并重建 HTMLImageElement。
 * 返回 null 表示没有已保存的快照。
 */
export async function loadLayersSnapshot(): Promise<Layers[] | null> {
  const result = await _provider.load(_currentProjectId);
  if (!result?.layers?.length) return null;
  return deserializeLayers(result.layers, result.images);
}

/**
 * 清除当前项目的图层快照。
 */
export async function clearLayersSnapshot(): Promise<void> {
  await _provider.clear(_currentProjectId);
}

// ─── Cover（项目封面快照） ───────────────────────────────────────────────────

let coverTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 防抖保存项目封面快照（2s），自动绑定当前 projectId。
 * 由 Drawing 组件在图层变更时调用。
 */
export function saveStageCover(buffer: ArrayBuffer, mimeType = 'image/webp'): void {
  const pid = _currentProjectId;
  if (coverTimer !== null) clearTimeout(coverTimer);
  coverTimer = setTimeout(() => {
    _provider.saveCover?.(pid, buffer, mimeType).catch(console.error);
    coverTimer = null;
  }, 2000);
}

/**
 * 加载指定项目的封面快照。
 * 返回 blob URL（调用方使用后应 revoke），无封面时返回 null。
 */
export async function loadStageCover(projectId: string): Promise<string | null> {
  return _provider.loadCover?.(projectId) ?? null;
}
