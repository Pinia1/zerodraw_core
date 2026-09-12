import type { AppendMessage, ThreadMessageLike } from '@assistant-ui/react';
import type { AgentTranscriptEntry } from '@zeroDraw/api-contract';
import type { AgentSseFrame } from '../../../../../services/agent';

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

function lastUserText(list: ThreadMessageLike[]): string {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i].role === 'user') return textFromThreadMessageLike(list[i]).trim();
  }
  return '';
}

/** 忽略 harness 误推的用户消息回显 */
function isEchoOfLastUser(list: ThreadMessageLike[], text: string): boolean {
  const userText = lastUserText(list);
  return userText !== '' && userText === text.trim();
}

function isRunningAssistant(message: ThreadMessageLike): boolean {
  return message.role === 'assistant' && message.status?.type === 'running';
}

function findRunningAssistantIndex(list: ThreadMessageLike[]): number {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (isRunningAssistant(list[i])) return i;
  }
  return -1;
}

function hasActiveAssistantStream(list: ThreadMessageLike[]): boolean {
  return findRunningAssistantIndex(list) !== -1;
}

function ensureAssistantStream(list: ThreadMessageLike[]): ThreadMessageLike[] {
  if (hasActiveAssistantStream(list)) return list;
  return [
    ...list,
    {
      id: createId('assistant'),
      role: 'assistant',
      content: [{ type: 'text', text: '', status: { type: 'running' } }],
      status: { type: 'running' },
    },
  ];
}

function setAssistantStreamText(list: ThreadMessageLike[], text: string): ThreadMessageLike[] {
  const withStream = ensureAssistantStream(list);
  const index = findRunningAssistantIndex(withStream);
  if (index === -1) return withStream;
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
  const index = findRunningAssistantIndex(withStream);
  if (index === -1) return withStream;
  const prevText = textFromThreadMessageLike(withStream[index]);
  return setAssistantStreamText(withStream, prevText + delta);
}

/** message 帧晚于 done 到达时，合并到最后一条 assistant，避免重复写入 */
function upsertLastAssistantText(list: ThreadMessageLike[], text: string): ThreadMessageLike[] {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i].role !== 'assistant') break;
    const prevText = textFromThreadMessageLike(list[i]);
    if (text === prevText) return list;
    if (text.startsWith(prevText) || prevText.startsWith(text)) {
      const merged = text.length >= prevText.length ? text : prevText;
      const next = list.slice();
      next[i] = {
        ...list[i],
        content: [{ type: 'text', text: merged, status: { type: 'complete' } }],
        status: { type: 'complete', reason: 'stop' },
      };
      return next;
    }
    break;
  }
  return finalizeAssistantStream(list, text);
}

function finalizeAssistantStream(list: ThreadMessageLike[], text?: string): ThreadMessageLike[] {
  const index = findRunningAssistantIndex(list);
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
  // 保持 id 不变，避免 assistant-ui MessageRepository 把同一条回复当成新分支
  next[index] = {
    ...current,
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

function isTextOnlyMessage(message: ThreadMessageLike): boolean {
  const { content } = message;
  if (typeof content === 'string') return true;
  return content.every((part) => part.type === 'text');
}

/** 合并 transcript 里因早期 partial message_end 产生的重复 assistant 气泡 */
function dedupeAssistantMessages(messages: ThreadMessageLike[]): ThreadMessageLike[] {
  const result: ThreadMessageLike[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant' || !isTextOnlyMessage(message)) {
      result.push(message);
      continue;
    }
    const text = textFromThreadMessageLike(message);
    const prev = result[result.length - 1];
    if (prev?.role === 'assistant' && isTextOnlyMessage(prev)) {
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

interface RawToolCallBlock {
  type: 'toolCall';
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface RawTextBlock {
  type: 'text';
  text: string;
}

function isRawTextBlock(part: unknown): part is RawTextBlock {
  return !!part && typeof part === 'object' && (part as { type?: unknown }).type === 'text';
}

function isRawToolCallBlock(part: unknown): part is RawToolCallBlock {
  return !!part && typeof part === 'object' && (part as { type?: unknown }).type === 'toolCall';
}

function rawContentParts(content: unknown): unknown[] {
  return Array.isArray(content) ? content : [];
}

export function transcriptToThreadMessages(
  transcript: AgentTranscriptEntry[]
): ThreadMessageLike[] {
  const messages: ThreadMessageLike[] = [];
  const toolCallIndexById = new Map<string, number>();

  for (const entry of transcript) {
    switch (entry.type) {
      case 'message': {
        const raw = entry.message as
          | { role?: string; content?: unknown; toolCallId?: string; toolName?: string; isError?: boolean }
          | undefined;

        if (raw?.role === 'toolResult') {
          const toolCallId = String(raw.toolCallId ?? '');
          const index = toolCallIndexById.get(toolCallId);
          if (index === undefined) break;
          const existing = messages[index];
          const part = Array.isArray(existing.content) ? existing.content[0] : undefined;
          if (!part || part.type !== 'tool-call') break;
          const resultText =
            rawContentParts(raw.content)
              .filter(isRawTextBlock)
              .map((block) => block.text)
              .join('') || (raw.isError ? '执行失败' : `${part.toolName} 已完成`);
          messages[index] = {
            ...existing,
            content: [{ ...part, result: resultText, isError: raw.isError }],
            status: { type: 'complete', reason: 'stop' },
          };
          break;
        }

        const role = transcriptRole(raw);
        const parts = rawContentParts(raw?.content);
        const text = parts
          .filter(isRawTextBlock)
          .map((block) => block.text)
          .join('');
        if (text) {
          messages.push({
            id: entry.id,
            role,
            content: [{ type: 'text', text }],
            createdAt: new Date(entry.timestamp),
            ...(role === 'assistant'
              ? { status: { type: 'complete' as const, reason: 'stop' as const } }
              : {}),
          });
        }

        for (const call of parts.filter(isRawToolCallBlock)) {
          messages.push({
            id: `${entry.id}:${call.id}`,
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: call.id,
                toolName: call.name,
                args: call.arguments as any,
                argsText: JSON.stringify(call.arguments),
                result: '等待结果…',
              },
            ],
            createdAt: new Date(entry.timestamp),
            status: { type: 'running' },
          });
          toolCallIndexById.set(call.id, messages.length - 1);
        }
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

export function createUserThreadMessage(text: string, imageUrls: string[] = []): ThreadMessageLike {
  return {
    id: createId('user'),
    role: 'user',
    content: [
      ...imageUrls.map((image) => ({ type: 'image' as const, image })),
      { type: 'text' as const, text },
    ],
    createdAt: new Date(),
  };
}

export function createCompletedToolCallMessage(input: {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}): ThreadMessageLike {
  const toolCallId = createId('tool');
  const resultText =
    typeof input.result === 'string' ? input.result : JSON.stringify(input.result ?? null);
  return {
    id: toolCallId,
    role: 'assistant',
    content: [
      {
        type: 'tool-call',
        toolCallId,
        toolName: input.toolName,
        args: input.args as any,
        argsText: JSON.stringify(input.args),
        result: resultText,
      },
    ],
    status: { type: 'complete', reason: 'stop' },
  };
}

export function createAssistantTextMessage(text: string): ThreadMessageLike {
  return {
    id: createId('assistant'),
    role: 'assistant',
    content: [{ type: 'text', text, status: { type: 'complete' } }],
    status: { type: 'complete', reason: 'stop' },
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

export function applySseToMessages(
  list: ThreadMessageLike[],
  frame: AgentSseFrame
): ThreadMessageLike[] {
  switch (frame.type) {
    case 'message_start':
      return list;
    case 'delta':
      return appendAssistantDelta(list, String(frame.text ?? ''));
    case 'message': {
      const incoming = String(frame.text ?? '');
      if (!incoming || isEchoOfLastUser(list, incoming)) {
        return ensureAssistantStream(list);
      }
      if (hasActiveAssistantStream(list)) {
        return finalizeAssistantStream(list, incoming);
      }
      return upsertLastAssistantText(list, incoming);
    }
    case 'tool_start': {
      const toolArgs = (frame.args as Record<string, unknown> | undefined) ?? {};
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
              args: toolArgs as any,
              argsText: JSON.stringify(toolArgs),
              result: `正在调用 ${String(frame.toolName ?? 'tool')}…`,
            },
          ],
          status: { type: 'running' },
        },
      ];
    }
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
  if (!hasActiveAssistantStream(list)) return list;
  return finalizeAssistantStream(list);
}
