import type { AgentSessionDetail } from '@zeroDraw/api-contract';
import type { AppendMessage, CreateStartRunConfig, ThreadMessageLike } from '@assistant-ui/react';
import { fromThreadMessageLike, useExternalStoreRuntime } from '@assistant-ui/react';
import { useMemoizedFn } from '@zeroDraw/common';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  httpAgentResume,
  httpCreateAgentSession,
  httpGetAgentSession,
  streamAgentPrompt,
  type AgentSseFrame,
} from '../../../../services/agent';
import {
  applySseToMessages,
  createUserThreadMessage,
  extractTextFromAppendMessage,
  finalizeAllStreams,
  transcriptToThreadMessages,
} from './adapters/messages';
import type { AgentChatPhase } from './types';
import {
  clearStoredSessionId,
  isSseErrorFrame,
  readStoredSessionId,
  writeStoredSessionId,
} from './utils';

export interface UseZeroDrawAgentRuntimeOptions {
  projectId?: string;
}

export interface UseZeroDrawAgentRuntimeReturn {
  runtime: ReturnType<typeof useExternalStoreRuntime<ThreadMessageLike>>;
  phase: AgentChatPhase;
  sessionId: string | null;
  sessionStatus: AgentSessionDetail['status'] | null;
  error: string | null;
  isReady: boolean;
  isSuspended: boolean;
  resume: (decision: 'approve' | 'reject') => Promise<void>;
  startNewSession: () => Promise<void>;
}

export function useZeroDrawAgentRuntime({
  projectId = '',
}: UseZeroDrawAgentRuntimeOptions = {}): UseZeroDrawAgentRuntimeReturn {
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const [phase, setPhase] = useState<AgentChatPhase>('initializing');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<AgentSessionDetail['status'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const phaseRef = useRef<AgentChatPhase>('initializing');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const bindSession = useCallback(
    (detail: AgentSessionDetail) => {
      sessionIdRef.current = detail.id;
      setSessionId(detail.id);
      setSessionStatus(detail.status);
      setMessages(transcriptToThreadMessages(detail.transcript));
      writeStoredSessionId(projectId, detail.id);
    },
    [projectId],
  );

  const loadOrCreateSession = useMemoizedFn(async () => {
    setPhase('initializing');
    setError(null);

    const storedId = readStoredSessionId(projectId);
    if (storedId) {
      try {
        const detail = await httpGetAgentSession(storedId);
        bindSession(detail);
        setPhase(detail.status === 'suspended' ? 'suspended' : 'idle');
        return;
      } catch {
        clearStoredSessionId(projectId);
      }
    }

    const created = await httpCreateAgentSession({});
    const detail = await httpGetAgentSession(created.id);
    bindSession(detail);
    setPhase('idle');
  });

  useEffect(() => {
    void loadOrCreateSession().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('idle');
    });
  }, [loadOrCreateSession]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSseFrame = useMemoizedFn((frame: AgentSseFrame) => {
    if (frame.type === 'started') return;
    if (isSseErrorFrame(frame)) {
      setError(frame.message);
      return;
    }
    if (frame.type === 'suspended') {
      setSessionStatus('suspended');
      setPhase('suspended');
      return;
    }
    if (frame.type === 'done') {
      setSessionStatus('active');
      setPhase('idle');
      setMessages((prev) => finalizeAllStreams(prev));
      return;
    }
    setMessages((prev) => applySseToMessages(prev, frame));
  });

  const runPrompt = useMemoizedFn(async (text: string) => {
    const id = sessionIdRef.current;
    if (!id || sendingRef.current) return;

    sendingRef.current = true;
    setError(null);
    setPhase('streaming');
    setSessionStatus('active');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamAgentPrompt(id, { message: text }, handleSseFrame, controller.signal);
      setMessages((prev) => finalizeAllStreams(prev));
      setPhase((current) => (current === 'suspended' ? 'suspended' : 'idle'));
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
      setPhase('idle');
      setMessages((prev) => finalizeAllStreams(prev));
    } finally {
      sendingRef.current = false;
      if (abortRef.current === controller) abortRef.current = null;
    }
  });

  const onNew = useMemoizedFn(async (message: AppendMessage) => {
    const text = extractTextFromAppendMessage(message);
    if (
      !text ||
      phaseRef.current === 'streaming' ||
      phaseRef.current === 'initializing' ||
      !sessionIdRef.current
    ) {
      return;
    }

    setMessages((prev) => [...prev, createUserThreadMessage(text)]);
    await runPrompt(text);
  });

  const onCancel = useMemoizedFn(async () => {
    abortRef.current?.abort();
  });

  const onReload = useMemoizedFn(async (parentId: string | null, _config: CreateStartRunConfig) => {
    if (phaseRef.current === 'streaming' || !sessionIdRef.current) return;

    let promptText = '';
    setMessages((prev) => {
      const parentIndex = parentId === null ? -1 : prev.findIndex((m) => m.id === parentId);
      const kept = parentIndex === -1 ? prev : prev.slice(0, parentIndex + 1);
      for (let i = kept.length - 1; i >= 0; i -= 1) {
        const msg = kept[i];
        if (msg.role !== 'user') continue;
        const content = msg.content;
        promptText =
          typeof content === 'string'
            ? content
            : content
                .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((p) => p.text)
                .join('\n')
                .trim();
        break;
      }
      return kept;
    });

    if (!promptText) return;
    await runPrompt(promptText);
  });

  const isReady = phase !== 'initializing' && !!sessionId;
  const isSuspended = phase === 'suspended' || sessionStatus === 'suspended';

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    setMessages: (next) => setMessages([...next]),
    isRunning: phase === 'streaming',
    isLoading: phase === 'initializing',
    isDisabled: !isReady || isSuspended,
    convertMessage: (message, idx) =>
      fromThreadMessageLike(message, message.id ?? `msg-${idx}`, { type: 'complete', reason: 'stop' }),
    onNew,
    onCancel,
    onReload,
    unstable_capabilities: { copy: true },
  });

  const resume = useMemoizedFn(async (decision: 'approve' | 'reject') => {
    const id = sessionIdRef.current;
    if (!id) return;

    setError(null);
    setPhase('streaming');
    try {
      const result = await httpAgentResume(id, { decision });
      if (result.status === 'suspended') {
        setSessionStatus('suspended');
        setPhase('suspended');
        return;
      }
      setSessionStatus('active');
      setPhase('idle');
      const detail = await httpGetAgentSession(id);
      setMessages(transcriptToThreadMessages(detail.transcript));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('suspended');
    }
  });

  const startNewSession = useMemoizedFn(async () => {
    abortRef.current?.abort();
    clearStoredSessionId(projectId);
    sessionIdRef.current = null;
    setSessionId(null);
    setMessages([]);
    setSessionStatus(null);
    await loadOrCreateSession();
  });

  return {
    runtime,
    phase,
    sessionId,
    sessionStatus,
    error,
    isReady,
    isSuspended,
    resume,
    startNewSession,
  };
}
