import { HistoryManager } from '@monorepo/common';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DrawLayer, Layers } from '../types/Layers';
import { generateUUID } from '../utils/drawing';
import imageManager from '../utils/imageManager';

const historyManager = new HistoryManager<Layers[]>({
  maxLength: 50,
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
  image: null,
  name: 'layer 1',
  order: 0,
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
  undoHistory: (version?: DrawLayer['version']) => void;
  redoHistory: (version?: DrawLayer['version']) => void;
}

const useLayerStore = create<LayerState>()(
  persist(
    (set, get) => ({
      layers: [init],
      setLayers: (layers) => set({ layers }),

      //
      drawingLayer: { version: generateUUID(), ...init },
      getDrawingLayer: () => get().drawingLayer,
      setDrawingLayer: (drawingLayer, version?: string) =>
        set({
          drawingLayer: {
            ...drawingLayer,
            version: version ? version : get().drawingLayer?.version!,
          },
        }),
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
      },

      undoHistory: (version?: string) => {
        const layers = historyManager.undo();
        if (!layers) return;

        const currentDrawing = get().drawingLayer;
        const nextDrawing =
          (currentDrawing && layers.find((l) => l.id === currentDrawing.id)) || layers[0] || null;

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
        const nextDrawing =
          (currentDrawing && layers.find((l) => l.id === currentDrawing.id)) || layers[0] || null;

        set({
          layers,
          drawingLayer: { ...nextDrawing, version: version ? version : currentDrawing?.version },
          canUndo: historyManager.canUndo,
          canRedo: historyManager.canRedo,
        });
      },
    }),
    {
      name: 'drawing-layers-storage',
      partialize: (state) => ({
        // layers: state.layers,
        // drawingLayer: state.drawingLayer,
      }),
    }
  )
);
export default useLayerStore;
