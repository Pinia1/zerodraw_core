import { HistoryManager } from '@monorepo/common';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layers } from '../types/Layers';
import { generateUUID } from '../utils/drawing';

const historyManager = new HistoryManager<Layers[]>({
  maxLength: 70,
  clone: (state) => state,
});

const initialDrawingLayer: () => Layers = () => ({
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
});
const init = initialDrawingLayer();

interface LayerState {
  layers: Layers[];
  setLayers: (layers: Layers[]) => void;

  //drawingLayer
  drawingLayer: Layers | null;
  getDrawingLayer: () => Layers | null;
  setDrawingLayer: (drawingLayer: Layers) => void;

  // history manager（单例实例）
  history: HistoryManager<Layers[]>;
  canUndo: boolean;
  canRedo: boolean;
  initHistory: (initialLayers: Layers[]) => void;
  pushHistory: (layers: Layers[]) => void;
  undoHistory: () => void;
  redoHistory: () => void;
}

const useLayerStore = create<LayerState>()(
  persist(
    (set, get) => ({
      layers: [init],
      setLayers: (layers) => set({ layers }),
      drawingLayer: init,
      getDrawingLayer: () => get().drawingLayer,
      setDrawingLayer: (drawingLayer) => set({ drawingLayer }),

      // history
      history: historyManager,
      canUndo: false,
      canRedo: false,

      initHistory: (initialLayers: Layers[]) => {
        historyManager.setInitial(initialLayers);
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
      },

      undoHistory: () => {
        const layers = historyManager.undo();
        if (!layers) return;

        const currentDrawing = get().drawingLayer;
        const nextDrawing =
          (currentDrawing && layers.find((l) => l.id === currentDrawing.id)) || layers[0] || null;

        if (!layers.length || !nextDrawing) {
          const newDrawing = initialDrawingLayer();
          set({
            layers: [newDrawing],
            drawingLayer: newDrawing,
            canUndo: historyManager.canUndo,
            canRedo: historyManager.canRedo,
          });
          return;
        }

        set({
          layers,
          drawingLayer: nextDrawing,
          canUndo: historyManager.canUndo,
          canRedo: historyManager.canRedo,
        });
      },

      redoHistory: () => {
        const layers = historyManager.redo();
        if (!layers) return;

        const currentDrawing = get().drawingLayer;
        const nextDrawing =
          (currentDrawing && layers.find((l) => l.id === currentDrawing.id)) || layers[0] || null;

        set({
          layers,
          drawingLayer: nextDrawing,
          canUndo: historyManager.canUndo,
          canRedo: historyManager.canRedo,
        });
      },
    }),
    {
      name: 'drawing-layers-storage',
      partialize: (state) => ({}),
    }
  )
);
export default useLayerStore;
