import { LassoMode, type Point2D } from './Drawing';

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'color-dodge';

export interface LayerFilter {
  /** px */
  blur?: number;
  /** percent, 100 means no-op */
  brightness?: number;
  /** percent, 100 means no-op */
  contrast?: number;
  /** percent, 100 means no-op */
  saturate?: number;
  /** degrees */
  hueRotate?: number;
  /** percent */
  sepia?: number;
  /** percent */
  grayscale?: number;
  /** percent */
  invert?: number;
}

export interface Layers {
  id: string;
  name?: string;
  order: number;
  opacity: number;
  visible: boolean;
  diagrams: Diagram[];
  lines: Line[];
  eraserLines: Line[];
  rects: Rect[];
  ellipses: Ellipse[];
  paths: Line[];
  fills: Fill[];
  lassos: Lasso[];
  eraseLassos: Lasso[];
  image: Fill | null;
  imageFull?: boolean;
  blendMode: BlendMode;
  filter?: LayerFilter;
}

export interface DrawLayer extends Layers {
  version?: string;
}

export interface Diagram {
  id: string;
  type:
    | 'line'
    | 'eraserLine'
    | 'rect'
    | 'ellipse'
    | 'circle'
    | 'triangle'
    | 'polygon'
    | 'star'
    | 'heart'
    | 'diamond'
    | 'arrow'
    | 'text'
    | 'image'
    | 'shape'
    | 'path'
    | 'fill'
    | 'image'
    | 'lasso'
    | 'eraseLasso';
}

export interface Line {
  id: string;
  points: number[];
  strokeWidth: number;
  stroke: string;
  opacity: number;
  tension: number;
  eraser: boolean;
  pressure: number[];
  suppress: boolean;
  hardness: number; //硬度 0 - 1
  stabilizer: number; //平滑度 0 - 4
  scale: number;
  fill: boolean;
}

export interface Lasso {
  id: string;
  points: number[];
  stroke: string;
  scale: number;
  /** 套索选区的布尔操作类型 */
  mode: LassoMode;
}

export interface Fill {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
  img?: HTMLImageElement;
  src?: string;
  rotation?: number;
  maxWidth?: number;
  maxHeight?: number;
  visible: boolean;
}

export type DiagramPropsMap = {
  line: Line;
  eraserLine: Line;
  rect: Rect;
  ellipse: Ellipse;
  circle: Circle;
  triangle: Triangle;
  polygon: Polygon;
  star: Star;
  heart: Heart;
  diamond: Diamond;
  arrow: Arrow;
  text: Text;
  image: Image;
  shape: Shape;
  path: Line;
  fill: Fill;
  lasso: Lasso;
  eraseLasso: Lasso;
};
export interface Rect extends Point2D {
  width: number;
  height: number;
  id: string;
  strokeWidth: number;
  stroke: string;
  opacity: number;
  fill: string;
}
export interface Ellipse extends Point2D {
  id: string;
  stroke?: string;
  strokeWidth: number;
  rotation?: number;
  width: number;
  height: number;
  opacity?: number;
  listening?: boolean;
  mouseX: number;
  mouseY: number;
  fill: string;
}
export interface Circle extends Point2D {}
export interface Triangle extends Point2D {}
export interface Polygon extends Point2D {}
export interface Star extends Point2D {}
export interface Heart extends Point2D {}
export interface Diamond extends Point2D {}
export interface Arrow extends Point2D {}
export interface Text extends Point2D {}
export interface Image extends Point2D {}
export interface Shape extends Point2D {}
