import { httpSaveProjectFlow } from '@/services/project';
import type { ProjectFlowState } from '@zeroDraw/api-contract';
import { useEffect, useRef } from 'react';
import type { StudioFlowState } from '../types';

const SAVE_DEBOUNCE_MS = 800;

export function usePersistFlowState(projectId: string | undefined, state: StudioFlowState) {
  const hydratedRef = useRef(false);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;
    skipNextSaveRef.current = true;
  }, [projectId]);

  useEffect(() => {
    hydratedRef.current = true;
  }, [state.nodes, state.edges]);

  useEffect(() => {
    if (!projectId || !hydratedRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      const payload: ProjectFlowState = {
        nodes: state.nodes as ProjectFlowState['nodes'],
        edges: state.edges as ProjectFlowState['edges'],
        viewport: state.viewport,
      };
      void httpSaveProjectFlow(projectId, payload).catch(() => {});
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [projectId, state]);
}
