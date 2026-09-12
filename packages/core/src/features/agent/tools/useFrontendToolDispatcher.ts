import type { AgentSseFrame } from '@zeroDraw/api-contract';
import { useMemoizedFn } from '@zeroDraw/common';
import { useMemo, useRef } from 'react';
import { dispatchFrontendToolFromSse } from './dispatcher';
import { createFrontendToolRegistry } from './registry';
import type { AgentFrontendToolsConfig } from './types';

export interface UseFrontendToolDispatcherOptions {
  sessionId: string | null;
  config?: AgentFrontendToolsConfig;
  /** complete() 落库成功但服务端已找不到挂起上下文时触发（如服务重启），提示用户重新发送消息 */
  onUndelivered?: (toolName: string) => void;
}

export function useFrontendToolDispatcher({
  sessionId,
  config,
  onUndelivered,
}: UseFrontendToolDispatcherOptions) {
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
      const result = await dispatchFrontendToolFromSse({ sessionId, frame, config, registry });
      if (result.dispatched && result.delivered === false) {
        const toolName = String((frame as { toolName?: string }).toolName ?? '');
        onUndelivered?.(toolName);
      }
    } finally {
      inFlightRef.current.delete(toolCallId);
    }
  });

  return { handleSseFrame, registry };
}
