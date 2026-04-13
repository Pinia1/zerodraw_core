import { WebWorker } from '@zeroDraw/common';
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
const defaultStageConfig: StageConfigTypes = {
  scale: 1,
  x: 0,
  y: 0,
};
const defaultLassoConfig: LassoConfigTypes = {
  type: LassoMode.ADD,
  shape: 'default',
};

const defaultLayerConfig: LayerConfigTypes = {
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  backgroundColor: '#ffffff',
  backgroundVisible: false,
};

interface DrawingState {
  stageRef: React.RefObject<Konva.Stage> | null;
  bindRef: (ref: React.RefObject<Konva.Stage>) => void;
  stageConfig: StageConfigTypes;
  setStageConfig: (config: StageConfigTypes) => void;
  layerConfig: LayerConfigTypes;
  setLayerConfig: (config: LayerConfigTypes) => void;
  resetLayerConfig: () => void;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
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
  drawingId: string | null;
  setDrawingId: (id: string | null) => void;
  workerRef: WebWorker | null;
  bindWorkerRef: (ref: WebWorker | null) => void;
  shrinkTools: boolean;
  setShrinkTools: (shrinkTools: boolean) => void;
  thumbnail: CanvasImageSource | null;
  setThumbnail: (thumbnail: CanvasImageSource | null) => void;
  imageLoadVersion: number;
  bumpImageLoadVersion: () => void;
}

export const useDrawingStore = create<DrawingState>()(
  persist(
    (set) => ({
      stageRef: null,
      bindRef: (ref: DrawingState['stageRef']) => set({ stageRef: ref }),

      //stage config
      stageConfig: defaultStageConfig,
      setStageConfig: (config: StageConfigTypes) => set({ stageConfig: config }),

      //layer config
      layerConfig: defaultLayerConfig,
      setLayerConfig: (config: LayerConfigTypes) => set({ layerConfig: config }),
      resetLayerConfig: () => set({ layerConfig: defaultLayerConfig }),
      currentProjectId: null,
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      //worker ref
      workerRef: null,
      bindWorkerRef: (ref: WebWorker | null) => set({ workerRef: ref }),
      thumbnail: null,
      setThumbnail: (thumbnail: CanvasImageSource | null) => set({ thumbnail: thumbnail }),
      imageLoadVersion: 0,
      bumpImageLoadVersion: () => set((s) => ({ imageLoadVersion: s.imageLoadVersion + 1 })),

      //line config
      lineConfig: {
        strokeWidth: 5,
        stroke: '#000000',
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
      fillColor: '#B3B5DF',
      setFillColor: (color: string) => set({ fillColor: color }),
      //graph config
      graphConfig: {
        strokeWidth: 8,
        opacity: 1,
        fill: false,
        width: 0,
        height: 0,
      },
      setGraphConfig: (config: GraphConfigTypes) => set({ graphConfig: config }),
      //lasso config
      lassoConfig: defaultLassoConfig,
      setLassoConfig: (config: LassoConfigTypes) => set({ lassoConfig: config }),
      //brush detail conf position
      brushDetailConfPosition: defaultBrushDetailConfPosition,
      setBrushDetailConfPosition: (brushDetailConfPosition: {
        visible: boolean;
        position: Point2D;
      }) => set({ brushDetailConfPosition: brushDetailConfPosition }),
      //drawing id
      drawingId: null,
      setDrawingId: (id: string | null) => set({ drawingId: id }),
      //shrink tools
      shrinkTools: false,
      setShrinkTools: (shrinkTools: boolean) => set({ shrinkTools: shrinkTools }),
    }),
    {
      name: 'drawing-storage',
      partialize: (state) => ({
        ...state,
        brushDetailConfPosition: defaultBrushDetailConfPosition,
        stageConfig: defaultStageConfig,
        stageRef: null,
        thumbnail: null,
        imageLoadVersion: 0,
      }),
    }
  )
);
