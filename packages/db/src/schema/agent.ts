// pi-agent 会话持久化 schema（SQLite 方言）。
// 对齐官方 sqlite backend（storageVersion 1, 7 张表），应用层额外携带 user_id / status / title。

import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { project } from './project';
import { user } from './user';

export const agentSession = sqliteTable(
  'agent_sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => user.userId),
    status: text('status', { enum: ['active', 'suspended', 'closed'] })
      .notNull()
      .default('active'),
    title: text('title'),
    createdAt: integer('created_at').notNull(),
    parentSessionId: text('parent_session_id'),
    storageVersion: integer('storage_version').notNull().default(1),
    metadata: text('metadata', { mode: 'json' }),
    messageCount: integer('message_count').notNull().default(0),
    usagePayload: text('usage_payload', { mode: 'json' }).notNull(),
    nextSeq: integer('next_seq').notNull(),
    projectId: text('project_id').references(() => project.id),
    lastPromptAt: integer('last_prompt_at'),
    lastActivityAt: integer('last_activity_at'),
    promptCount: integer('prompt_count').notNull().default(0),
    closedAt: integer('closed_at'),
    closeReason: text('close_reason', { enum: ['user_close', 'idle', 'admin', 'error'] }),
    runtimeHost: text('runtime_host', { enum: ['inprocess', 'worker'] }),
    updatedAt: integer('updated_at')
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => ({
    idx_agent_sessions_user: index('idx_agent_sessions_user').on(t.userId),
    idx_agent_sessions_project: index('idx_agent_sessions_project').on(t.projectId),
    idx_agent_sessions_status: index('idx_agent_sessions_status').on(t.status),
  }),
);

export const agentSessionEvent = sqliteTable(
  'agent_session_events',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => user.userId),
    projectId: text('project_id'),
    eventType: text('event_type').notNull(),
    payload: text('payload', { mode: 'json' }),
    createdAt: integer('created_at').notNull(),
  },
  (t) => ({
    idx_agent_events_session: index('idx_agent_events_session').on(t.sessionId, t.createdAt),
    idx_agent_events_user: index('idx_agent_events_user').on(t.userId, t.createdAt),
    idx_agent_events_type: index('idx_agent_events_type').on(t.eventType, t.createdAt),
  }),
);

export const agentPromptRun = sqliteTable(
  'agent_prompt_runs',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => user.userId),
    projectId: text('project_id'),
    status: text('status', {
      enum: ['pending', 'running', 'completed', 'failed', 'suspended', 'aborted'],
    })
      .notNull()
      .default('pending'),
    startedAt: integer('started_at').notNull(),
    finishedAt: integer('finished_at'),
    durationMs: integer('duration_ms'),
    usage: text('usage', { mode: 'json' }),
    errorMessage: text('error_message'),
    runtimeHost: text('runtime_host', { enum: ['inprocess', 'worker'] }),
    workerSlot: integer('worker_slot'),
    ledgerFromSeq: integer('ledger_from_seq'),
  },
  (t) => ({
    idx_agent_prompt_runs_stale: index('idx_agent_prompt_runs_stale').on(t.status, t.startedAt),
    idx_agent_prompt_runs_session: index('idx_agent_prompt_runs_session').on(
      t.sessionId,
      t.startedAt,
    ),
    idx_agent_prompt_runs_user: index('idx_agent_prompt_runs_user').on(t.userId, t.startedAt),
    idx_agent_prompt_runs_project: index('idx_agent_prompt_runs_project').on(
      t.projectId,
      t.startedAt,
    ),
  }),
);

export const agentEntry = sqliteTable(
  'agent_entries',
  {
    sessionId: text('session_id').notNull(),
    id: text('id').notNull(),
    parentId: text('parent_id'),
    seq: integer('seq').notNull(),
    type: text('type').notNull(),
    customType: text('custom_type'),
    timestamp: integer('timestamp').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
  },
  (t) => ({
    pk_agent_entry: primaryKey({ columns: [t.sessionId, t.id] }),
    idx_agent_entries_parent: index('idx_agent_entries_parent').on(t.sessionId, t.parentId),
    idx_agent_entries_seq: index('idx_agent_entries_seq').on(t.sessionId, t.seq, t.type),
  }),
);

export const agentScalarValue = sqliteTable(
  'agent_scalar_values',
  {
    sessionId: text('session_id').notNull(),
    namespace: text('namespace').notNull(),
    key: text('key').notNull(),
    seq: integer('seq').notNull(),
    value: text('value', { mode: 'json' }).notNull(),
  },
  (t) => ({ pk_agent_scalar_value: primaryKey({ columns: [t.sessionId, t.namespace, t.key] }) }),
);

export const agentListValue = sqliteTable(
  'agent_list_values',
  {
    sessionId: text('session_id').notNull(),
    namespace: text('namespace').notNull(),
    key: text('key').notNull(),
    seq: integer('seq').notNull(),
    value: text('value', { mode: 'json' }).notNull(),
  },
  (t) => ({
    pk_agent_list_value: primaryKey({ columns: [t.sessionId, t.namespace, t.key, t.seq] }),
  }),
);

export const agentUsageLedger = sqliteTable(
  'agent_usage_ledger',
  {
    sessionId: text('session_id').notNull(),
    id: text('id').notNull(),
    seq: integer('seq').notNull(),
    entryId: text('entry_id'),
    adjustment: integer('adjustment').notNull().default(0),
    usage: text('usage', { mode: 'json' }).notNull(),
    details: text('details', { mode: 'json' }),
  },
  (t) => ({
    pk_agent_usage: primaryKey({ columns: [t.sessionId, t.id] }),
    idx_agent_usage_seq: index('idx_agent_usage_seq').on(t.sessionId, t.seq),
  }),
);

export const agentBranchEntry = sqliteTable(
  'agent_branch_entries',
  {
    sessionId: text('session_id').notNull(),
    branchId: text('branch_id').notNull(),
    entryId: text('entry_id').notNull(),
    entrySeq: integer('entry_seq').notNull(),
    entryType: text('entry_type').notNull(),
  },
  (t) => ({
    pk_agent_be: primaryKey({ columns: [t.sessionId, t.branchId, t.entryId] }),
    idx_agent_be_seq: index('idx_agent_be_seq').on(
      t.sessionId,
      t.branchId,
      t.entrySeq,
      t.entryId,
      t.entryType,
    ),
    idx_agent_be_type: index('idx_agent_be_type').on(
      t.sessionId,
      t.branchId,
      t.entryType,
      t.entrySeq,
      t.entryId,
    ),
    idx_agent_be_entry: index('idx_agent_be_entry').on(t.sessionId, t.entryId),
  }),
);

export const agentBranchMeta = sqliteTable(
  'agent_branch_meta',
  {
    sessionId: text('session_id').notNull(),
    branchId: text('branch_id').notNull(),
    tipEntryId: text('tip_entry_id').notNull(),
    tipSeq: integer('tip_seq').notNull(),
    baseBranchId: text('base_branch_id'),
    baseSeq: integer('base_seq'),
  },
  (t) => ({
    pk_agent_bm: primaryKey({ columns: [t.sessionId, t.branchId] }),
    uq_agent_bm_tip: uniqueIndex('uq_agent_bm_tip').on(t.sessionId, t.tipEntryId),
  }),
);

export const agentFrontendToolCall = sqliteTable(
  'agent_frontend_tool_calls',
  {
    sessionId: text('session_id').notNull(),
    toolCallId: text('tool_call_id').notNull(),
    toolName: text('tool_name').notNull(),
    args: text('args', { mode: 'json' }).notNull(),
    status: text('status', {
      enum: ['pending', 'completed', 'error', 'timeout', 'orphaned'],
    })
      .notNull()
      .default('pending'),
    result: text('result', { mode: 'json' }),
    message: text('message'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => ({
    pk_agent_ftc: primaryKey({ columns: [t.sessionId, t.toolCallId] }),
    idx_agent_ftc_status: index('idx_agent_ftc_status').on(t.status),
  }),
);
