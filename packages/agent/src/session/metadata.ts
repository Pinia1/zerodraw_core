import type { ClientToolDefinition } from '@zeroDraw/api-contract';

export interface AgentSessionMetadata {
  clientTools?: ClientToolDefinition[];
}

export function readSessionMetadata(raw: unknown): AgentSessionMetadata {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const clientTools = (raw as AgentSessionMetadata).clientTools;
  if (!Array.isArray(clientTools)) return {};
  return { clientTools };
}

export function writeSessionMetadata(input: {
  clientTools?: ClientToolDefinition[];
}): AgentSessionMetadata | null {
  if (input.clientTools === undefined) return null;
  return { clientTools: input.clientTools };
}
