import type { AgentSseFrame } from '@zeroDraw/api-contract';
import { useMemoizedFn } from '@zeroDraw/common';
import { useMemo, useRef } from 'react';
import { dispatchFrontendToolFromSse } from './dispatcher';
import { createFrontendToolRegistry } from './registry';
import type { AgentFrontendToolsConfig } from './types';

export interface UseFrontendToolDispatcherOptions {
  sessionId: string | null;
  config?: AgentFrontendToolsConfig;
}

export function useFrontendToolDispatcher({ sessionId, config }: UseFrontendToolDispatcherOptions) {
  const inFlightRef = useRef(new Set<string>());

  const registry = useMemo(
    () => (config ? createFrontendToolRegistry(config.tools) : null),
    [config],
  );

  const handleSseFrame = useMemoizedFn(async (frame: AgentSseFrame) => {
    if (!sessionId || !config || !registry) return;
    if (frame.type !== 'tool_start') return;

    const toolCallId = String((frame as { toolCallId?: string }).toolCallId ?? '');
    if (!toolCallId || inFlightRef.current.has(toolCallId)) return;

    inFlightRef.current.add(toolCallId);
    try {
      await dispatchFrontendToolFromSse({ sessionId, frame, config, registry });
    } finally {
      inFlightRef.current.delete(toolCallId);
    }
  });

  return { handleSseFrame, registry };
}
