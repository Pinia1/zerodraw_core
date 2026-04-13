import { HistoryManager } from '@zeroDraw/common';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  clearLayersSnapshot,
  loadLayersSnapshot,
  saveLayersSnapshot,
  saveLayersSnapshotNow,
} from '../local/indexDb';
import type { DrawLayer, Layers } from '../types/Layers';
import { generateUUID } from '../utils/drawing';
import imageManager from '../utils/imageManager';

const historyManager = new HistoryManager<Layers[]>({
  maxLength: 30,
  clone: (state) => state,
  cleanFutureCallback: (future) => {
    future.forEach((layers) => {
      layers.forEach((layer) => {
        layer.fills.forEach((fill) => {
          imageManager.deleteImage(fill.id);
        });
      });
    });
  },
  cleanPastCallback: (past) => {
    past.forEach((layers) => {
      layers.forEach((layer) => {
        layer.fills.forEach((fill) => {
          imageManager.deleteImage(fill.id);
        });
      });
    });
  },
});

export const initialDrawingLayer: () => Layers = () => ({
  id: generateUUID(),
  visible: true,
  opacity: 100,
  diagrams: [],
  lines: [],
  eraserLines: [],
  rects: [],
  ellipses: [],
  paths: [],
  fills: [],
  lassos: [],
  eraseLassos: [],
  remove: null,
  image: null,
  thumbnail: null,
  name: 'layer 1',
  order: 0,
  blendMode: 'normal',
  filter: {
    blur: 0,
    brightness: 100,
    contrast: 100,
    saturate: 100,
    hueRotate: 0,
    sepia: 0,
    grayscale: 0,
    invert: 0,
  },
});

export const emptyDrawingLayer: () => Partial<Layers> = () => ({
  fills: [],
  lines: [],
  rects: [],
  ellipses: [],
  paths: [],
  eraserLines: [],
  diagrams: [],
  image: null,
});
const init = initialDrawingLayer();

interface LayerState {
  layers: Layers[];
  setLayers: (layers: Layers[]) => void;

  //drawingLayer
  drawingLayer: DrawLayer | null;
  getDrawingLayer: () => DrawLayer | null;
  setDrawingLayer: (drawingLayer: Layers, version?: DrawLayer['version']) => void;

  // history manager
  history: HistoryManager<Layers[]>;
  canUndo: boolean;
  canRedo: boolean;
  initHistory: () => void;
  pushHistory: (layers: Layers[]) => void;
  replaceCurrentHistory: (layers: Layers[]) => void;
  undoHistory: (version?: DrawLayer['version']) => void;
  redoHistory: (version?: DrawLayer['version']) => void;

  // persistence
  /** 是否正在从 IndexedDB 恢复数据，用于展示 loading */
  hydrating: boolean;
  /** 从 IndexedDB 恢复图层快照，应在应用启动时调用一次 */
  rehydrateFromStorage: () => Promise<void>;
  /** 立即将当前图层写入 IndexedDB（不防抖），适合页面卸载前调用 */
  flushStorageNow: () => Promise<void>;
  /** 清除 IndexedDB 中保存的图层快照 */
  clearStorage: () => Promise<void>;
}

const useLayerStore = create<LayerState>()(
  persist(
    (set, get) => ({
      layers: [init],
      setLayers: (layers) => {
        set({ layers });
        saveLayersSnapshot(layers);
      },

      //
      drawingLayer: { version: generateUUID(), ...init },
      getDrawingLayer: () => get().drawingLayer,
      setDrawingLayer: (layer) => {
        set({
          drawingLayer: layer,
        });
      },
      // history
      history: historyManager,
      canUndo: false,
      canRedo: false,

      initHistory: () => {
        historyManager.setInitial(get().layers);
        set({
          canUndo: historyManager.canUndo,
          canRedo: historyManager.canRedo,
        });
      },

      pushHistory: (layers: Layers[]) => {
        historyManager.push(layers);
        set({
          layers,
          canUndo: historyManager.canUndo,
          canRedo: historyManager.canRedo,
        });
        saveLayersSnapshot(layers);
      },

      replaceCurrentHistory: (layers: Layers[]) => {
        historyManager.replaceCurrent(layers);
        set({
          layers,
          canUndo: historyManager.canUndo,
          canRedo: historyManager.canRedo,
        });
        saveLayersSnapshot(layers);
      },

      undoHistory: (version?: string) => {
        const layers = historyManager.undo();
        if (!layers) return;

        const currentDrawing = get().drawingLayer;
        const nextDrawing = layers[layers.length - 1];

        if (!layers.length || !nextDrawing) {
          const newDrawing = initialDrawingLayer();
          set({
            layers: [newDrawing],
            drawingLayer: { ...newDrawing, version: version ? version : currentDrawing?.version },
            canUndo: historyManager.canUndo,
            canRedo: historyManager.canRedo,
          });
          return;
        }
        const newDrawingLayer = {
          ...nextDrawing,
          version: version ? version : currentDrawing?.version,
        };

        set({
          layers,
          drawingLayer: newDrawingLayer,
          canUndo: historyManager.canUndo,
          canRedo: historyManager.canRedo,
        });
      },

      redoHistory: (version?: string) => {
        const layers = historyManager.redo();

        if (!layers) return;

        const currentDrawing = get().drawingLayer;
        const nextDrawing = layers[layers.length - 1];

        set({
          layers,
          drawingLayer: { ...nextDrawing, version: version ? version : currentDrawing?.version },
          canUndo: historyManager.canUndo,
          canRedo: historyManager.canRedo,
        });
      },

      // ── persistence ──────────────────────────────────────────────────────

      hydrating: false,

      rehydrateFromStorage: async () => {
        set({ hydrating: true });
        try {
          const layers = await loadLayersSnapshot();

          if (!layers?.length) {
            const freshLayer = initialDrawingLayer();
            historyManager.clearAll();
            set({
              layers: [freshLayer],
              drawingLayer: { ...freshLayer, version: generateUUID() },
              canUndo: false,
              canRedo: false,
            });
            return;
          }

          const lastLayer = layers[layers.length - 1];
          historyManager.setInitial(layers);

          set({
            layers,
            drawingLayer: { ...lastLayer, version: generateUUID() },
            canUndo: historyManager.canUndo,
            canRedo: historyManager.canRedo,
          });
        } finally {
          set({ hydrating: false });
        }
      },

      flushStorageNow: async () => {
        await saveLayersSnapshotNow(get().layers);
      },

      clearStorage: async () => {
        await clearLayersSnapshot();
      },
    }),
    {
      name: 'drawing-layers-storage',
      partialize: (state) => ({
        layersMeta: state.layers.map(
          ({ id, name, order, opacity, visible, blendMode, filter }) => ({
            id,
            name,
            order,
            opacity,
            visible,
            blendMode,
            filter,
          })
        ),
        activeLayerId: state.drawingLayer?.id ?? null,
      }),
    }
  )
);
export default useLayerStore;
