/**
 * storageWorker.ts
 *
 * Web Worker 内联脚本 + 主线程通信客户端。
 *
 * Worker 线程职责（完全脱离主线程）：
 *   - 写入 drawing-layers-db（图层矢量数据快照），按 snapshotKey 隔离
 *   - 读取 drawing-layers-db + drawing-image-db（图片二进制数据）
 *   - 清除指定 snapshotKey 的快照
 *
 * 主线程职责：
 *   - 序列化 layers（剥离 HTMLImageElement）后 postMessage 给 Worker
 *   - 收到 Worker 返回的二进制数据后，在主线程创建 blob URL → HTMLImageElement
 */

import type { SerializedLayer } from './types';

// ─── Worker 内联脚本 ──────────────────────────────────────────────────────────

const WORKER_SCRIPT = /* js */ `
'use strict';

var LAYERS_DB_NAME = 'drawing-layers-db';
var LAYERS_STORE  = 'snapshots';
var LAYERS_DB_VER = 1;

var IMAGES_DB_NAME = 'drawing-image-db';
var IMAGES_STORE   = 'images';
var IMAGES_DB_VER  = 1;

var layersDb = null;
var imagesDb = null;

function openDB(name, version, storeName, keyPath, indexName) {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(name, version);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        var store = db.createObjectStore(storeName, { keyPath: keyPath });
        if (indexName) store.createIndex(indexName, indexName, { unique: false });
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror   = function () { reject(req.error); };
  });
}

function getLayersDB() {
  if (layersDb) return Promise.resolve(layersDb);
  return openDB(LAYERS_DB_NAME, LAYERS_DB_VER, LAYERS_STORE, 'key', null)
    .then(function (db) { layersDb = db; return db; });
}

function getImagesDB() {
  if (imagesDb) return Promise.resolve(imagesDb);
  return openDB(IMAGES_DB_NAME, IMAGES_DB_VER, IMAGES_STORE, 'id', 'createdAt')
    .then(function (db) { imagesDb = db; return db; });
}

/* ── save ─────────────────────────────────────────────────── */

function saveLayers(snapshotKey, layers) {
  return getLayersDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx    = db.transaction(LAYERS_STORE, 'readwrite');
      var store = tx.objectStore(LAYERS_STORE);
      store.put({ key: snapshotKey, layers: layers, savedAt: Date.now() });
      tx.oncomplete = function () { resolve(); };
      tx.onerror    = function () { reject(tx.error); };
      tx.onabort    = function () { reject(tx.error); };
    });
  });
}

/* ── load ─────────────────────────────────────────────────── */

function loadLayers(snapshotKey) {
  return getLayersDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx    = db.transaction(LAYERS_STORE, 'readonly');
      var store = tx.objectStore(LAYERS_STORE);
      var req   = store.get(snapshotKey);
      req.onsuccess = function () {
        var r = req.result;
        resolve(r ? r.layers : null);
      };
      req.onerror = function () { reject(req.error); };
    });
  });
}

function collectFillIds(layers) {
  var ids = {};
  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    var fills = layer.fills || [];
    for (var j = 0; j < fills.length; j++) ids[fills[j].id] = 1;
    if (layer.image)     ids[layer.image.id] = 1;
    if (layer.thumbnail) ids[layer.thumbnail.id] = 1;
  }
  return Object.keys(ids);
}

function getImage(db, id) {
  return new Promise(function (resolve, reject) {
    var tx    = db.transaction(IMAGES_STORE, 'readonly');
    var store = tx.objectStore(IMAGES_STORE);
    var req   = store.get(id);
    req.onsuccess = function () { resolve(req.result || null); };
    req.onerror   = function () { reject(req.error); };
  });
}

function loadLayersWithImages(snapshotKey) {
  return loadLayers(snapshotKey).then(function (layers) {
    if (!layers) return { layers: null, images: {} };

    return getImagesDB().then(function (db) {
      var fillIds = collectFillIds(layers);
      var images  = {};
      var transferables = [];

      var tasks = fillIds.map(function (id) {
        return getImage(db, id).then(function (record) {
          if (record && record.buffer) {
            images[id] = { buffer: record.buffer, mimeType: record.mimeType };
            transferables.push(record.buffer);
          }
        }).catch(function () { /* skip missing */ });
      });

      return Promise.all(tasks).then(function () {
        return { layers: layers, images: images, transferables: transferables };
      });
    });
  });
}

/* ── clear ────────────────────────────────────────────────── */

function clearLayers(snapshotKey) {
  return getLayersDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx    = db.transaction(LAYERS_STORE, 'readwrite');
      var store = tx.objectStore(LAYERS_STORE);
      store.delete(snapshotKey);
      tx.oncomplete = function () { resolve(); };
      tx.onerror    = function () { reject(tx.error); };
      tx.onabort    = function () { reject(tx.error); };
    });
  });
}

/* ── message handler ──────────────────────────────────────── */

onmessage = function (e) {
  var msg  = e.data;
  var type = msg.type;
  var id   = msg.id;
  var snapshotKey = msg.snapshotKey || 'default';

  var fail = function (err) {
    postMessage({ id: id, type: 'error', error: err && err.message ? err.message : String(err) });
  };

  switch (type) {
    case 'save':
      saveLayers(snapshotKey, msg.layers)
        .then(function () { postMessage({ id: id, type: 'saved' }); })
        .catch(fail);
      break;
    case 'load':
      loadLayersWithImages(snapshotKey)
        .then(function (result) {
          postMessage(
            { id: id, type: 'loaded', layers: result.layers, images: result.images },
            result.transferables || []
          );
        })
        .catch(fail);
      break;
    case 'clear':
      clearLayers(snapshotKey)
        .then(function () { postMessage({ id: id, type: 'cleared' }); })
        .catch(fail);
      break;
    default:
      fail(new Error('Unknown type: ' + type));
  }
};
`;

// ─── 消息类型 ─────────────────────────────────────────────────────────────────

interface ImageBuffer {
  buffer: ArrayBuffer;
  mimeType: string;
}

interface WorkerLoadResult {
  type: 'loaded';
  layers: SerializedLayer[] | null;
  images: Record<string, ImageBuffer>;
}

// ─── 主线程客户端 ─────────────────────────────────────────────────────────────

let counter = 0;
function nextId(): string {
  return `msg_${++counter}_${Date.now()}`;
}

export interface StorageWorkerLoadResult {
  layers: SerializedLayer[] | null;
  images: Record<string, ImageBuffer>;
}

export class StorageWorkerClient {
  private worker: Worker | null = null;
  private pending = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url);

    this.worker.onmessage = (e: MessageEvent) => {
      const { id, type, ...rest } = e.data;
      const entry = this.pending.get(id);
      if (!entry) return;
      this.pending.delete(id);

      if (type === 'error') {
        entry.reject(new Error(rest.error ?? 'Worker error'));
      } else {
        entry.resolve(rest);
      }
    };

    this.worker.onerror = (e: ErrorEvent) => {
      console.error('[StorageWorker] error:', e.message);
    };

    return this.worker;
  }

  private send<T>(type: string, payload?: Record<string, unknown>): Promise<T> {
    const id = nextId();
    const w = this.ensureWorker();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      w.postMessage({ type, id, ...payload });
    });
  }

  save(layers: SerializedLayer[], snapshotKey: string): Promise<void> {
    return this.send('save', { layers, snapshotKey });
  }

  load(snapshotKey: string): Promise<StorageWorkerLoadResult> {
    return this.send<WorkerLoadResult>('load', { snapshotKey }).then((res) => ({
      layers: res.layers,
      images: res.images,
    }));
  }

  clear(snapshotKey: string): Promise<void> {
    return this.send('clear', { snapshotKey });
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const entry of this.pending.values()) {
      entry.reject(new Error('Worker destroyed'));
    }
    this.pending.clear();
  }
}
