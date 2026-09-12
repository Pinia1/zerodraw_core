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
  initialImageFile?: File;
}

export { default as Drawing } from './Drawing';
export {
  getCurrentProject,
  getStorageProvider,
  loadStageCover,
  setCurrentProject,
  setStorageProvider,
} from './local/indexDb';
export { IndexedDBStorageProvider } from './local/indexedDBProvider';
export type {
  ImageResource,
  SerializedFill,
  SerializedLayer,
  StorageLoadResult,
  StorageProvider,
} from './local/types';
export { useDrawingStore } from './store/useDrawing';
export { default as useLayerStore } from './store/useLayer';
export { default as imageManager } from './utils/imageManager';
export { AgentChatProvider, useAgentChatComponent } from './contexts/AgentChatContext';
export type { AgentChatComponent } from './contexts/AgentChatContext';
export { useZeroDrawAgentRuntime } from './components/Prompt/components/Chat/useZeroDrawAgentRuntime';
export type {
  UseZeroDrawAgentRuntimeOptions,
  UseZeroDrawAgentRuntimeReturn,
} from './components/Prompt/components/Chat/useZeroDrawAgentRuntime';
export { Container, generateUUID, Icons, ToolItem, ToolTypes, useUpload };
