import { ToolItem } from './components';
import Container from './components/Container';
import useUpload from './hooks/useUpload';
import * as Icons from './icons';
import { ToolTypes } from './types/Drawing';
import { generateUUID } from './utils/drawing';

export enum Tools {
  TOOL = 'tool',
  LAYERS_CONTROL = 'layers-control',
  PROMPT = 'prompt',
  FLEXIBLE = 'flexible',
}

export interface DrawingProps {
  size: { width: number; height: number };
  tools: Tools[];
  canvasWidth?: number;
  canvasHeight?: number;
}

export { default as Drawing } from './Drawing';
export { default as imageManager } from './utils/imageManager';
export { useDrawingStore } from './store/useDrawing';
export { Container, generateUUID, Icons, ToolItem, ToolTypes, useUpload };
