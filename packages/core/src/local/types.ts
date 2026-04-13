/**
 * 图层存储 Provider 接口定义。
 *
 * 通过实现此接口可以对接不同的存储后端：
 *   - IndexedDBStorageProvider（本地，Web Worker 异步写入）
 *   - ServerStorageProvider（服务端，REST / WebSocket）
 *   - CompositeStorageProvider（本地 + 服务端组合策略）
 *
 * 使用方：
 *   import { setStorageProvider } from '@zeroDraw/core';
 *   setStorageProvider(new ServerStorageProvider({ apiUrl, projectId }));
 */

import type { Fill, Layers } from '../types/Layers';

// ─── 序列化类型（所有 Provider 共享） ─────────────────────────────────────────

/** Fill 的可序列化版本，去掉无法 JSON 化的 HTMLImageElement */
export type SerializedFill = Omit<Fill, 'img'>;

export type SerializedLayer = Omit<Layers, 'fills' | 'image' | 'thumbnail'> & {
  fills: SerializedFill[];
  image: SerializedFill | null;
  thumbnail: SerializedFill | null;
};

// ─── 图片资源（不同 Provider 返回不同形式） ──────────────────────────────────

export interface ImageResource {
  /** IndexedDB Provider 返回：二进制数据，主线程转为 blob URL */
  buffer?: ArrayBuffer;
  /** Server Provider 返回：已有的可访问 URL */
  url?: string;
  mimeType: string;
}

// ─── Provider 加载结果 ────────────────────────────────────────────────────────

export interface StorageLoadResult {
  layers: SerializedLayer[];
  /**
   * 图片资源映射 { [fillId]: ImageResource }
   * - 本地 Provider：包含 buffer 字段
   * - 服务端 Provider：包含 url 字段
   * - 两者都存在时优先使用 buffer（离线更快）
   */
  images: Record<string, ImageResource>;
}

// ─── StorageProvider 接口 ────────────────────────────────────────────────────

export interface StorageProvider {
  /** Provider 标识名，用于调试日志 */
  readonly name: string;

  /**
   * 存储图层快照（异步）。
   * 由上层 debounce 控制调用频率，Provider 内部不需要做防抖。
   * @param projectId 项目标识，不同项目的数据隔离存储
   */
  save(layers: SerializedLayer[], projectId: string): Promise<void>;

  /**
   * 加载图层快照 + 关联的图片资源。
   * 返回 null 表示没有已保存的数据。
   * @param projectId 项目标识
   */
  load(projectId: string): Promise<StorageLoadResult | null>;

  /**
   * 清除指定项目的快照。
   * @param projectId 项目标识
   */
  clear(projectId: string): Promise<void>;

  /**
   * 立即存储（可选）。
   * 用于 beforeunload 等场景，需要保证在页面关闭前完成写入。
   * 如未实现，上层会回退到调用 save()。
   * @param projectId 项目标识
   */
  saveImmediate?(layers: SerializedLayer[], projectId: string): Promise<void>;

  /** 释放资源（可选）。如 Worker、WebSocket 连接等。 */
  destroy?(): void;
}
