import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layers } from '../types/Layers';
import { generateUUID } from '../utils/drawing';

interface LayerState {
  layers: Layers[];
  getLayers: () => Layers[];
  setLayers: (layers: Layers[]) => void;

  //drawingLayer
  drawingLayer: Layers | null;
  getDrawingLayer: () => Layers | null;
  setDrawingLayer: (drawingLayer: Layers) => void;
}

const useLayerStore = create<LayerState>()(
  persist(
    (set, get) => ({
      layers: [],
      getLayers: () => get().layers,
      setLayers: (layers) => set({ layers }),
      //
      drawingLayer: {
        id: generateUUID(),
        opacity: 100,
        diagrams: [],
        lines: [],
        eraserLines: [],
        rects: [],
        ellipses: [],
        paths: [],
        fills: [],
      },
      getDrawingLayer: () => get().drawingLayer,
      setDrawingLayer: (drawingLayer) => set({ drawingLayer: drawingLayer }),
    }),
    {
      name: 'drawing-layers-storage',
      partialize: (state) => ({}),
    }
  )
);
export default useLayerStore;
