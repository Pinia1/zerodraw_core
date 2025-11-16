import Konva from 'konva';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  EraserConfigTypes,
  GraphConfigTypes,
  LassoConfigTypes,
  LassoMode,
  LayerConfigTypes,
  LineConfigTypes,
  Point2D,
  StageConfigTypes,
} from '../types/Drawing';

const defaultBrushDetailConfPosition = { visible: false, position: { x: 0, y: 0 } };

interface DrawingState {
  stageRef: React.RefObject<Konva.Stage> | null;
  bindRef: (ref: React.RefObject<Konva.Stage>) => void;
  stageConfig: StageConfigTypes;
  setStageConfig: (config: StageConfigTypes) => void;
  layerConfig: LayerConfigTypes;
  setLayerConfig: (config: LayerConfigTypes) => void;
  lineConfig: LineConfigTypes;
  setLineConfig: (config: LineConfigTypes) => void;
  eraserConfig: EraserConfigTypes;
  setEraserConfig: (config: EraserConfigTypes) => void;
  graphConfig: GraphConfigTypes;
  setGraphConfig: (config: GraphConfigTypes) => void;
  lassoConfig: LassoConfigTypes;
  setLassoConfig: (config: LassoConfigTypes) => void;
  brushDetailConfPosition: { visible: boolean; position: Point2D };
  setBrushDetailConfPosition: (brushDetailConfPosition: {
    visible: boolean;
    position: Point2D;
  }) => void;
  fillColor: string;
  setFillColor: (color: string) => void;
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
        hardness: 0, //0 - 1
        pressure: [0],
        suppress: false,
        stabilizer: 2, //0 - 4
        fill: true,
      },
      setLineConfig: (config: LineConfigTypes) => set({ lineConfig: config }),
      //eraser config
      eraserConfig: {
        strokeWidth: 10,
        opacity: 1,
        fill: false,
        freehand: false,
      },
      setEraserConfig: (config: EraserConfigTypes) => set({ eraserConfig: config }),
      //fill color
      fillColor: '#000',
      setFillColor: (color: string) => set({ fillColor: color }),
      //graph config
      graphConfig: {
        strokeWidth: 8,
        opacity: 1,
      },
      setGraphConfig: (config: GraphConfigTypes) => set({ graphConfig: config }),
      //lasso config
      lassoConfig: {
        type: LassoMode.ADD,
      },
      setLassoConfig: (config: LassoConfigTypes) => set({ lassoConfig: config }),
      //brush detail conf position
      brushDetailConfPosition: defaultBrushDetailConfPosition,
      setBrushDetailConfPosition: (brushDetailConfPosition: {
        visible: boolean;
        position: Point2D;
      }) => set({ brushDetailConfPosition: brushDetailConfPosition }),
    }),
    {
      name: 'drawing-storage',
      partialize: (state) => ({
        ...state,
        brushDetailConfPosition: defaultBrushDetailConfPosition,
      }),
    }
  )
);
