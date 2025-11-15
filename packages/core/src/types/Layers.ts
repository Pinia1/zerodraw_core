import type { Point2D } from './Drawing';

export interface Layers {
  id: string;
  name?: string;
  diagrams: Diagram[];
  lines: Line[];
}

export interface Diagram {
  id: string;
  type:
    | 'line'
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
    | 'shape';
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
export interface Rect extends Point2D {}
export interface Ellipse extends Point2D {}
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
