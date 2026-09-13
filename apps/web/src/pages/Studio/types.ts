import type { Edge } from '@xyflow/react';

export type StudioFlowState = {
  nodes: StudioNode[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
};
