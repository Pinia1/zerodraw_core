import type { AgentTranscriptEntry } from '@zeroDraw/api-contract';
import type { AppendMessage, ThreadMessageLike } from '@assistant-ui/react';
import type { AgentSseFrame } from '../../../../../services/agent';
import { extractAgentMessageText } from '../utils';

export const ASSISTANT_STREAM_ID = '__assistant_stream__';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function upsertMessage(list: ThreadMessageLike[], message: ThreadMessageLike): ThreadMessageLike[] {
  const index = list.findIndex((item) => item.id === message.id);
  if (index === -1) return [...list, message];
  const next = list.slice();
  next[index] = { ...next[index], ...message };
  return next;
}

function textFromThreadMessageLike(message: ThreadMessageLike): string {
  const { content } = message;
  if (typeof content === 'string') return content;
  return content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function ensureAssistantStream(list: ThreadMessageLike[]): ThreadMessageLike[] {
  if (list.some((item) => item.id === ASSISTANT_STREAM_ID)) return list;
  return [
    ...list,
    {
      id: ASSISTANT_STREAM_ID,
      role: 'assistant',
      content: [{ type: 'text', text: '', status: { type: 'running' } }],
      status: { type: 'running' },
    },
  ];
}

function setAssistantStreamText(list: ThreadMessageLike[], text: string): ThreadMessageLike[] {
  const withStream = ensureAssistantStream(list);
  const index = withStream.findIndex((item) => item.id === ASSISTANT_STREAM_ID);
  const current = textFromThreadMessageLike(withStream[index]);
  if (text.length < current.length) return withStream;
  const next = withStream.slice();
  next[index] = {
    ...withStream[index],
    role: 'assistant',
    content: [{ type: 'text', text, status: { type: 'running' } }],
    status: { type: 'running' },
  };
  return next;
}

function appendAssistantDelta(list: ThreadMessageLike[], delta: string): ThreadMessageLike[] {
  const withStream = ensureAssistantStream(list);
  const index = withStream.findIndex((item) => item.id === ASSISTANT_STREAM_ID);
  const prevText = textFromThreadMessageLike(withStream[index]);
  return setAssistantStreamText(withStream, prevText + delta);
}

function finalizeAssistantStream(list: ThreadMessageLike[], text?: string): ThreadMessageLike[] {
  const index = list.findIndex((item) => item.id === ASSISTANT_STREAM_ID);
  if (index === -1) {
    if (!text) return list;
    return [
      ...list,
      {
        id: createId('assistant'),
        role: 'assistant',
        content: [{ type: 'text', text, status: { type: 'complete' } }],
        status: { type: 'complete', reason: 'stop' },
      },
    ];
  }
  const next = list.slice();
  const current = next[index];
  const finalText = text ?? textFromThreadMessageLike(current);
  if (!finalText.trim()) {
    next.splice(index, 1);
    return next;
  }
  next[index] = {
    ...current,
    id: createId('assistant'),
    role: 'assistant',
    content: [{ type: 'text', text: finalText, status: { type: 'complete' } }],
    status: { type: 'complete', reason: 'stop' },
  };
  return next;
}

function transcriptRole(raw: { role?: string } | undefined): ThreadMessageLike['role'] {
  if (raw?.role === 'user') return 'user';
  if (raw?.role === 'assistant') return 'assistant';
  return 'system';
}

/** 合并 transcript 里因早期 partial message_end 产生的重复 assistant 气泡 */
function dedupeAssistantMessages(messages: ThreadMessageLike[]): ThreadMessageLike[] {
  const result: ThreadMessageLike[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant') {
      result.push(message);
      continue;
    }
    const text = textFromThreadMessageLike(message);
    const prev = result[result.length - 1];
    if (prev?.role === 'assistant') {
      const prevText = textFromThreadMessageLike(prev);
      if (text.startsWith(prevText) || prevText.startsWith(text)) {
        result[result.length - 1] = text.length >= prevText.length ? message : prev;
        continue;
      }
    }
    result.push(message);
  }
  return result;
}

export function transcriptToThreadMessages(transcript: AgentTranscriptEntry[]): ThreadMessageLike[] {
  const messages: ThreadMessageLike[] = [];
  for (const entry of transcript) {
    switch (entry.type) {
      case 'message': {
        const raw = entry.message as { role?: string } | undefined;
        const role = transcriptRole(raw);
        const content = extractAgentMessageText(entry.message);
        if (!content) continue;
        messages.push({
          id: entry.id,
          role,
          content: [{ type: 'text', text: content }],
          createdAt: new Date(entry.timestamp),
          ...(role === 'assistant'
            ? { status: { type: 'complete' as const, reason: 'stop' as const } }
            : {}),
        });
        break;
      }
      case 'compaction':
        if (entry.summary) {
          messages.push({
            id: entry.id,
            role: 'system',
            content: entry.summary,
            createdAt: new Date(entry.timestamp),
          });
        }
        break;
      default:
        break;
    }
  }
  return dedupeAssistantMessages(messages);
}

export function createUserThreadMessage(text: string): ThreadMessageLike {
  return {
    id: createId('user'),
    role: 'user',
    content: [{ type: 'text', text }],
    createdAt: new Date(),
  };
}

export function extractTextFromAppendMessage(message: AppendMessage): string {
  if (message.role !== 'user') return '';
  return message.content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

export function applySseToMessages(list: ThreadMessageLike[], frame: AgentSseFrame): ThreadMessageLike[] {
  switch (frame.type) {
    case 'message_start':
      return ensureAssistantStream(list);
    case 'delta':
      return appendAssistantDelta(list, String(frame.text ?? ''));
    case 'message': {
      const incoming = String(frame.text ?? '');
      if (!incoming) return list;
      return setAssistantStreamText(list, incoming);
    }
    case 'tool_start':
      return [
        ...finalizeAssistantStream(list),
        {
          id: String(frame.toolCallId ?? createId('tool')),
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: String(frame.toolCallId ?? createId('tool')),
              toolName: String(frame.toolName ?? 'tool'),
              args: {},
              argsText: JSON.stringify(frame.args ?? {}),
              result: `正在调用 ${String(frame.toolName ?? 'tool')}…`,
            },
          ],
          status: { type: 'running' },
        },
      ];
    case 'tool_update':
    case 'tool_end': {
      const toolCallId = String(frame.toolCallId ?? '');
      const text = String(frame.text ?? '');
      const toolName = String(frame.toolName ?? 'tool');
      const content = text || (frame.type === 'tool_end' ? `${toolName} 已完成` : '');
      return upsertMessage(finalizeAssistantStream(list), {
        id: toolCallId || createId('tool'),
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: toolCallId || createId('tool'),
            toolName,
            args: {},
            argsText: '',
            result: content,
            isError: frame.type === 'tool_end' ? Boolean(frame.isError) : undefined,
          },
        ],
        status: { type: 'complete', reason: 'stop' },
      });
    }
    default:
      return list;
  }
}

export function finalizeAllStreams(list: ThreadMessageLike[]): ThreadMessageLike[] {
  return finalizeAssistantStream(list);
}
