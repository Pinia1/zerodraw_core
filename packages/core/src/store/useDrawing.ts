import Konva from 'konva';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LayerConfigTypes, LineConfigTypes, StageConfigTypes } from '../types/Drawing';

interface DrawingState {
  stageRef: React.RefObject<Konva.Stage> | null;
  bindRef: (ref: React.RefObject<Konva.Stage>) => void;
  stageConfig: StageConfigTypes;
  setStageConfig: (config: StageConfigTypes) => void;
  layerConfig: LayerConfigTypes;
  setLayerConfig: (config: LayerConfigTypes) => void;
  lineConfig: LineConfigTypes;
  setLineConfig: (config: LineConfigTypes) => void;
}

export const useDrawingStore = create<DrawingState>()(
  persist(
    (set, get) => ({
      stageRef: null,
      bindRef: (ref: DrawingState['stageRef']) => set({ stageRef: ref }),

      //stage config
      stageConfig: {
        scale: 1,
        x: 0,
        y: 0,
      },
      setStageConfig: (config: StageConfigTypes) => set({ stageConfig: config }),

      //layer config
      layerConfig: {
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      },
      setLayerConfig: (config: LayerConfigTypes) => set({ layerConfig: config }),

      //line config
      lineConfig: {
        strokeWidth: 5,
        stroke: '#000',
        opacity: 1,
        tension: 0,
        eraser: false,
        hardness: 1,
        pressure: [0],
        suppress: false,
        stabilizer: 0,
      },
      setLineConfig: (config: Partial<LineConfigTypes>) =>
        set({ lineConfig: { ...get().lineConfig, ...config } }),
    }),
    {
      name: 'drawing-storage',
      partialize: (state) => ({}),
    }
  )
);
