/**
 * IndexedDB 存储 Provider。
 *
 * - save：通过 Web Worker 异步写入 drawing-layers-db，不阻塞主线程
 * - load：Worker 读取 drawing-layers-db + drawing-image-db，返回二进制 ArrayBuffer
 * - saveImmediate：主线程直写 IndexedDB（beforeunload 保底）
 *
 * 所有方法通过 projectId 参数隔离不同项目的数据。
 */

import { StorageWorkerClient } from './storageWorker';
import type { SerializedLayer, StorageLoadResult, StorageProvider } from './types';

// ─── 主线程直写 IndexedDB（beforeunload 保底） ───────────────────────────────

const LAYERS_DB_NAME = 'drawing-layers-db';
const LAYERS_STORE_NAME = 'snapshots';
const LAYERS_DB_VERSION = 1;

function directSave(layers: SerializedLayer[], snapshotKey: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LAYERS_DB_NAME, LAYERS_DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LAYERS_STORE_NAME)) {
        db.createObjectStore(LAYERS_STORE_NAME, { keyPath: 'key' });
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(LAYERS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(LAYERS_STORE_NAME);
      store.put({ key: snapshotKey, layers, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    };

    req.onerror = () => reject(req.error);
  });
}

// ─── Provider 实现 ────────────────────────────────────────────────────────────

export class IndexedDBStorageProvider implements StorageProvider {
  readonly name = 'indexedDB';
  private client = new StorageWorkerClient();

  async save(layers: SerializedLayer[], projectId: string): Promise<void> {
    await this.client.save(layers, projectId);
  }

  async load(projectId: string): Promise<StorageLoadResult | null> {
    const result = await this.client.load(projectId);
    if (!result.layers?.length) return null;
    return {
      layers: result.layers,
      images: result.images,
    };
  }

  async clear(projectId: string): Promise<void> {
    await this.client.clear(projectId);
  }

  async saveImmediate(layers: SerializedLayer[], projectId: string): Promise<void> {
    await directSave(layers, projectId);
  }

  destroy(): void {
    this.client.destroy();
  }
}
