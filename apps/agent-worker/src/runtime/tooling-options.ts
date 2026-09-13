import type { SessionMetadata } from '@earendil-works/pi-agent-core';
import type { AgentSessionMeta } from './types/session';
import type { AgentToolingOptions } from './types/tooling';

export function toolingOptionsFromMeta(meta: AgentSessionMeta): AgentToolingOptions {
  return { clientTools: meta.clientTools };
}

export function toolingOptionsFromSessionMeta(meta: SessionMetadata): AgentToolingOptions {
  if (!('clientTools' in meta)) return {};
  return toolingOptionsFromMeta(meta as AgentSessionMeta);
}
