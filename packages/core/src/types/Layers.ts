import type { Point2D } from './Drawing';

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'color-dodge';

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
  image: Fill | null;
  imageFull?: boolean;
  blendMode: BlendMode;
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
    | 'image';
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
