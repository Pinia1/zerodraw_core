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
};

export type EraserConfigTypes = Pick<Line, 'strokeWidth' | 'opacity'> & {
  fill: boolean;
  freehand: boolean;
};

export type GraphConfigTypes = Pick<Line, 'strokeWidth' | 'opacity' | 'fill'> & {};

export type LassoConfigTypes = {
  type: LassoMode;
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

export enum Actions {
  ADD = 'add',
  ROPE = 'rope',
  PEN = 'pen',
  FILL = 'fill',
  ERASER = 'eraser',
  COLOR = 'color',
  LASSO = 'lasso',
  GRAPH = 'graph',
  None = 'none',
  RECT = 'rect',
  ELLIPSE = 'ellipse',
  LINE = 'line',
}

export enum ToolTypes {
  ACTION = 'action',
  STATE = 'state',
  DIVIDER = 'divider',
}
