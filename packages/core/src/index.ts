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
  /** 新建项目时传入的初始图片文件，仅在无历史记录时自动创建为图层 */
  initialImageFile?: File;
}

export { default as Drawing } from './Drawing';
export { default as imageManager } from './utils/imageManager';
export { useDrawingStore } from './store/useDrawing';
export { default as useLayerStore } from './store/useLayer';
export { setStorageProvider, getStorageProvider, setCurrentProject, getCurrentProject, loadStageCover } from './local/indexDb';
export type { StorageProvider, StorageLoadResult, ImageResource, SerializedLayer, SerializedFill } from './local/types';
export { IndexedDBStorageProvider } from './local/indexedDBProvider';
export { Container, generateUUID, Icons, ToolItem, ToolTypes, useUpload };
