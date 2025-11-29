export { default as Drawing } from './Drawing';

export enum Tools {
  TOOL = 'tool',
  LAYERS_CONTROL = 'layers-control',
  PROMPT = 'prompt',
  FLEXIBLE = 'flexible',
}

export interface DrawingProps {
  size: { width: number; height: number };
  tools: Tools[];
}
