import type { AgentSseFrame } from '../../../../services/agent';

function textFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const block = part as { type?: string; text?: string };
      if (block.type === 'text' && block.text) return block.text;
      if (block.type === 'toolCall') {
        const name = (block as { name?: string }).name ?? 'tool';
        return `[调用 ${name}]`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

export function extractAgentMessageText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const msg = message as { role?: string; content?: unknown };
  return textFromContent(msg.content);
}

export function sessionStorageKey(projectId: string, scope?: string): string {
  const base = projectId || 'default';
  return scope ? `zerodraw:agent-session:${scope}:${base}` : `zerodraw:agent-session:${base}`;
}

export function readStoredSessionId(projectId: string, scope?: string): string | null {
  try {
    return localStorage.getItem(sessionStorageKey(projectId, scope));
  } catch {
    return null;
  }
}

export function writeStoredSessionId(projectId: string, sessionId: string, scope?: string): void {
  try {
    localStorage.setItem(sessionStorageKey(projectId, scope), sessionId);
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredSessionId(projectId: string, scope?: string): void {
  try {
    localStorage.removeItem(sessionStorageKey(projectId, scope));
  } catch {
    // ignore
  }
}

export function isSseErrorFrame(frame: AgentSseFrame): frame is AgentSseFrame & { type: 'error'; message: string } {
  return frame.type === 'error' && typeof frame.message === 'string';
}
