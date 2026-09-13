import { BACKGROUND_CONTEXT, type Context, type Entry } from '@earendil-works/pi-agent-core';
import type { AgentTranscriptEntry } from '@zeroDraw/api-contract';
import { MySqlStorage } from '../storage/mysql.storage';

const TRANSCRIPT_ENTRY_TYPES = new Set<Entry['type']>(['message', 'compaction', 'branch_summary']);

function entryToTranscript(entry: Entry): AgentTranscriptEntry {
  switch (entry.type) {
    case 'message':
      return {
        id: entry.id,
        type: entry.type,
        timestamp: entry.timestamp,
        message: entry.message,
      };
    case 'compaction':
      return {
        id: entry.id,
        type: entry.type,
        timestamp: entry.timestamp,
        summary: entry.summary,
      };
    case 'branch_summary':
      return {
        id: entry.id,
        type: entry.type,
        timestamp: entry.timestamp,
        summary: entry.summary,
      };
    case 'custom':
      return {
        id: entry.id,
        type: entry.type,
        timestamp: entry.timestamp,
        customType: entry.customType,
        data: entry.data,
      };
  }
}

/** 从 storage 按 seq 读取会话 transcript（不打开 harness）。 */
export async function readMainLaneTranscript(
  sessionId: string,
  context: Context = BACKGROUND_CONTEXT,
): Promise<AgentTranscriptEntry[]> {
  const storage = new MySqlStorage(sessionId);
  try {
    const entries = await storage.scanEntries({ order: 'asc' }, context);
    return entries.filter((e) => TRANSCRIPT_ENTRY_TYPES.has(e.type)).map(entryToTranscript);
  } finally {
    await storage.close(context);
  }
}

export function summarizeTranscriptRoles(transcript: AgentTranscriptEntry[]): string {
  return transcript
    .filter((e) => e.type === 'message')
    .map((e) => (e.message as { role?: string } | undefined)?.role ?? '?')
    .join(',');
}
