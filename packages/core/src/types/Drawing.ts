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
>;
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
}

export enum Actions {
  ADD = 'add',
  ROPE = 'rope',
  PEN = 'pen',
  ERASER = 'eraser',
  COLOR = 'color',
  LASSO = 'lasso',
  GRAPH = 'graph',
  None = 'none',
}

export enum ToolTypes {
  ACTION = 'action',
  STATE = 'state',
  DIVIDER = 'divider',
}
