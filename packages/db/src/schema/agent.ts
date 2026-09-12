// pi-agent ( @earendil-works/pi-agent-core ) 会话持久化 schema。
//
// 对齐官方 sqlite backend 的存储格式（storageVersion 1, 7 张表），所有行以
// session_id（uuid 字符串）为作用域，可放入同一张 MySQL 表内按会话隔离。
// 应用层额外携带 user_id / status / title 用于归属与前端列表。
//
// 注：seq 用整数序列（非自增列），由 storage 层通过 agent_sessions.next_seq 管理，
// 与 pi-agent 的 commit/scan 语义一致。详见 apps/api/src/modules/Agent/storage/mysql.storage.ts。

import { bigint, index, int, json, mysqlTable, primaryKey, timestamp, uniqueIndex, varchar, mysqlEnum } from 'drizzle-orm/mysql-core';
import { user } from './user';

// 会话元数据 = pi-agent storage 元数据 + 应用层归属/列表字段
export const agentSession = mysqlTable(
  'agent_sessions',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // uuid
    userId: int('user_id')
      .notNull()
      .references(() => user.userId), // 平台用户 id（归属/鉴权）
    status: mysqlEnum('status', ['active', 'suspended', 'closed'])
      .notNull()
      .default('active'), // 应用层会话状态
    title: varchar('title', { length: 255 }), // 应用层会话标题
    createdAt: bigint('created_at', { mode: 'number' }).notNull(), // pi-agent createdAt(ms)
    parentSessionId: varchar('parent_session_id', { length: 36 }),
    storageVersion: int('storage_version').notNull().default(1),
    metadata: json('metadata'), // 预留，sqlite 存 null
    messageCount: int('message_count').notNull().default(0), // 统计缓存
    usagePayload: json('usage_payload').notNull(), // SessionStats.usage 序列化
    nextSeq: bigint('next_seq', { mode: 'number' }).notNull(), // 下一次 commit 起始序列
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .onUpdateNow(), // 应用层排序用
  },
  (t) => ({ idx_agent_sessions_user: index('idx_agent_sessions_user').on(t.userId) }),
);

// 对话条目：append-only 日志。type = message / compaction / branch_summary / custom
export const agentEntry = mysqlTable(
  'agent_entries',
  {
    sessionId: varchar('session_id', { length: 36 }).notNull(),
    id: varchar('id', { length: 64 }).notNull(),
    parentId: varchar('parent_id', { length: 64 }),
    seq: bigint('seq', { mode: 'number' }).notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    customType: varchar('custom_type', { length: 64 }),
    timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
    payload: json('payload').notNull(),
  },
  (t) => ({
    pk_agent_entry: primaryKey({ columns: [t.sessionId, t.id] }),
    idx_agent_entries_parent: index('idx_agent_entries_parent').on(t.sessionId, t.parentId),
    idx_agent_entries_seq: index('idx_agent_entries_seq').on(t.sessionId, t.seq, t.type),
  }),
);

// 标量值：key→JSON 值（namespace.key 寻址）
export const agentScalarValue = mysqlTable(
  'agent_scalar_values',
  {
    sessionId: varchar('session_id', { length: 36 }).notNull(),
    namespace: varchar('namespace', { length: 64 }).notNull(),
    key: varchar('key', { length: 255 }).notNull(),
    seq: bigint('seq', { mode: 'number' }).notNull(),
    value: json('value').notNull(),
  },
  (t) => ({ pk_agent_scalar_value: primaryKey({ columns: [t.sessionId, t.namespace, t.key] }) }),
);

// 列表值：按 seq 有序地把 JSON 值 append 进 (namespace,key)
export const agentListValue = mysqlTable(
  'agent_list_values',
  {
    sessionId: varchar('session_id', { length: 36 }).notNull(),
    namespace: varchar('namespace', { length: 64 }).notNull(),
    key: varchar('key', { length: 255 }).notNull(),
    seq: bigint('seq', { mode: 'number' }).notNull(),
    value: json('value').notNull(),
  },
  (t) => ({ pk_agent_list_value: primaryKey({ columns: [t.sessionId, t.namespace, t.key, t.seq] }) }),
);

// 用量账本：每次 LLM 调用记录一行
export const agentUsageLedger = mysqlTable(
  'agent_usage_ledger',
  {
    sessionId: varchar('session_id', { length: 36 }).notNull(),
    id: varchar('id', { length: 64 }).notNull(),
    seq: bigint('seq', { mode: 'number' }).notNull(),
    entryId: varchar('entry_id', { length: 64 }),
    adjustment: int('adjustment').notNull().default(0), // boolean 0/1
    usage: json('usage').notNull(),
    details: json('details'),
  },
  (t) => ({
    pk_agent_usage: primaryKey({ columns: [t.sessionId, t.id] }),
    idx_agent_usage_seq: index('idx_agent_usage_seq').on(t.sessionId, t.seq),
  }),
);

// 分支条目索引：branch → 有序 entry 列表
export const agentBranchEntry = mysqlTable(
  'agent_branch_entries',
  {
    sessionId: varchar('session_id', { length: 36 }).notNull(),
    branchId: varchar('branch_id', { length: 64 }).notNull(),
    entryId: varchar('entry_id', { length: 64 }).notNull(),
    entrySeq: bigint('entry_seq', { mode: 'number' }).notNull(),
    entryType: varchar('entry_type', { length: 20 }).notNull(),
  },
  (t) => ({
    pk_agent_be: primaryKey({ columns: [t.sessionId, t.branchId, t.entryId] }),
    idx_agent_be_seq: index('idx_agent_be_seq').on(t.sessionId, t.branchId, t.entrySeq, t.entryId, t.entryType),
    idx_agent_be_type: index('idx_agent_be_type').on(t.sessionId, t.branchId, t.entryType, t.entrySeq, t.entryId),
    idx_agent_be_entry: index('idx_agent_be_entry').on(t.sessionId, t.entryId),
  }),
);

// 分支元数据：tip / base 关系（线性助手用单根分支；保留以实现分支语义）
export const agentBranchMeta = mysqlTable(
  'agent_branch_meta',
  {
    sessionId: varchar('session_id', { length: 36 }).notNull(),
    branchId: varchar('branch_id', { length: 64 }).notNull(),
    tipEntryId: varchar('tip_entry_id', { length: 64 }).notNull(),
    tipSeq: bigint('tip_seq', { mode: 'number' }).notNull(),
    baseBranchId: varchar('base_branch_id', { length: 64 }),
    baseSeq: bigint('base_seq', { mode: 'number' }),
  },
  (t) => ({
    pk_agent_bm: primaryKey({ columns: [t.sessionId, t.branchId] }),
    uq_agent_bm_tip: uniqueIndex('uq_agent_bm_tip').on(t.sessionId, t.tipEntryId),
  }),
);