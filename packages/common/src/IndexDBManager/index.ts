// 简单的 IndexedDB 管理器，用于按 uuid 存取二进制图片数据（ArrayBuffer）
// 在浏览器环境下工作，Node / SSR 环境请先判断 window.indexedDB 是否存在

export interface StoredImage {
  id: string;
  buffer: ArrayBuffer;
  mimeType: string;
  createdAt: number;
}

type DBInstance = IDBDatabase | null;

const DEFAULT_DB_NAME = 'drawing-image-db';
const DEFAULT_STORE_NAME = 'images';
const DEFAULT_VERSION = 1;

export class IndexDBManager {
  private static _instance: IndexDBManager | null = null;

  static getInstance(): IndexDBManager {
    if (!IndexDBManager._instance) {
      IndexDBManager._instance = new IndexDBManager();
    }
    return IndexDBManager._instance;
  }

  private db: DBInstance = null;
  private readonly dbName: string;
  private readonly storeName: string;
  private readonly version: number;

  constructor(options?: { dbName?: string; storeName?: string; version?: number }) {
    this.dbName = options?.dbName ?? DEFAULT_DB_NAME;
    this.storeName = options?.storeName ?? DEFAULT_STORE_NAME;
    this.version = options?.version ?? DEFAULT_VERSION;
  }

  /**
   * 初始化数据库，返回一个 Promise。
   * 请在应用启动时或第一次使用前调用一次。
   */
  init(): Promise<IDBDatabase | null> {
    if (this.db) {
      return Promise.resolve(this.db);
    }

    if (typeof indexedDB === 'undefined') {
      // 非浏览器环境下直接返回 null
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 保存图片二进制数据（ArrayBuffer），使用 uuid 作为主键。
   */
  async saveImage(id: string, buffer: ArrayBuffer, mimeType = 'image/png'): Promise<void> {
    const db = await this.init();
    if (!db) return;

    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);

    const record: StoredImage = {
      id,
      buffer,
      mimeType,
      createdAt: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  /**
   * 根据 uuid 读取图片数据（ArrayBuffer）。
   */
  async getImage(id: string): Promise<StoredImage | null> {
    const db = await this.init();
    if (!db) return null;

    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);

    const result = await new Promise<StoredImage | null>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => {
        resolve((req.result as StoredImage) ?? null);
      };
      req.onerror = () => reject(req.error);
    });

    return result;
  }

  /**
   * 删除指定 uuid 的图片数据。
   */
  async deleteImage(id: string): Promise<void> {
    const db = await this.init();
    if (!db) return;

    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);

    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * 清空所有图片数据。
   */
  async clearAllImages(): Promise<void> {
    const db = await this.init();
    if (!db) return;

    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);

    await new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
