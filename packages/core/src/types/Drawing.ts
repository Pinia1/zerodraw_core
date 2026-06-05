import type { BrushJSON } from '@zeroDraw/wasm';
import type { Line } from './Layers';
export type LineConfigTypes = Pick<
  Line,
  | 'strokeWidth'
  | 'stroke'
  | 'opacity'
  | 'tension'
  | 'eraser'
  | 'hardness'
  | 'pressure'
  | 'suppress'
  | 'stabilizer'
> & {
  fill?: boolean;
  amendment?: boolean;
  brushName?: string;
  brushConfig?: BrushJSON;
};

export type EraserConfigTypes = Pick<Line, 'strokeWidth' | 'opacity'> & {
  fill: boolean;
  freehand: boolean;
};

export type GraphConfigTypes = Pick<Line, 'strokeWidth' | 'opacity' | 'fill'> & {};

export type LassoConfigTypes = {
  type: LassoMode;
  shape: 'default' | 'rect' | 'ellipse';
};

export interface Point2D {
  x: number;
  y: number;
}

export interface StageConfigTypes extends Point2D {
  scale: number;
}

export interface LayerConfigTypes extends Point2D {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundVisible: boolean;
}

export enum LassoMode {
  ADD = 'add',
  REMOVE = 'remove',
}

export type GroupPos = {
  x: number;
  y: number;
  width: number;
  height: number;
  relativePos: { x: number; y: number };
  pixelRatio: number;
  imageData: ImageData;
};

export enum Actions {
  ADD = 'add',
  ROPE = 'rope',
  PEN = 'pen',
  BRUSH = 'brush',
  FILL = 'fill',
  ERASER = 'eraser',
  REMOVE = 'remove',
  COLOR = 'color',
  LASSO = 'lasso',
  GRAPH = 'graph',
  None = 'none',
  RECT = 'rect',
  ELLIPSE = 'ellipse',
  LINE = 'line',
  SYMMETRY = 'symmetry',
}

export enum ToolTypes {
  ACTION = 'action',
  STATE = 'state',
  DIVIDER = 'divider',
}
