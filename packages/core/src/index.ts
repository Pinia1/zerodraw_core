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
export {
  DRAW_TOOL_MODES,
  getDrawToolMode,
  setDrawToolMode,
} from './store/drawToolMode';
export type { DrawToolMode } from './store/drawToolMode';
export { default as useLayerStore } from './store/useLayer';
export { default as imageManager } from './utils/imageManager';
export { AgentChatProvider, useAgentChatComponent } from './contexts/AgentChatContext';
export type { AgentChatComponent } from './contexts/AgentChatContext';
export {
  useAgentFrontendToolsConfig,
  AgentFrontendToolsProvider,
} from './contexts/AgentFrontendToolsContext';
export {
  createFrontendToolRegistry,
  dispatchFrontendToolFromSse,
  useFrontendToolDispatcher,
} from './features/agent/tools';
export type {
  AgentFrontendToolsConfig,
  FrontendToolContext,
  FrontendToolDefinition,
  FrontendToolRegistry,
} from './features/agent/tools';
export { useAgentChatRuntime } from './components/Prompt/components/Chat/useAgentChatRuntime';
export type {
  AgentChatImage,
  UseAgentChatRuntimeOptions,
  UseAgentChatRuntimeReturn,
} from './components/Prompt/components/Chat/useAgentChatRuntime';
export { default as PromptEditor } from './components/Compile';
export type {
  EditorValue,
  PromptEditorProps,
  PromptEditorRef,
} from './components/Compile';
export { default as Fetch } from './fetch';
export { addImageLayerFromSrc } from './utils/addImageLayerFromSrc';
export type {
  AddImageLayerFromSrcOptions,
  AddImageLayerFromSrcResult,
} from './utils/addImageLayerFromSrc';
export { addSvgPathsToLayer } from './utils/addSvgPathsToLayer';
export type {
  AddSvgPathsToLayerOptions,
  AddSvgPathsToLayerResult,
} from './utils/addSvgPathsToLayer';
export { parseSvgToVectorPaths } from './utils/svgToVectorPaths';
export type {
  ParseSvgToPathsOptions,
  ParseSvgToPathsResult,
  SvgLayout,
} from './utils/svgToVectorPaths';
export { Container, generateUUID, Icons, ToolItem, ToolTypes, useUpload };
