import type {
  CommitResult,
  Context,
  Entry,
  EntryScan,
  EntryStructure,
  ListReadOptions,
  Storage,
  StorageBranchScan,
  UsageRow,
  UsageScan,
  Value,
  ValueList,
  Write,
} from '@earendil-works/pi-agent-core';
import { branchTip, prepareStorageCommit, resolveListReadOptions, value } from '@earendil-works/pi-agent-core';
import type { ListElement, StoredValue } from '@earendil-works/pi-agent-core';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { pool } from '../../../db';

/** 可执行参数化 SQL 的最小接口（pool 或单连接都满足）。 */
type Executor = Pick<Pool, 'execute'> & Pick<PoolConnection, 'execute'>;

/**
 * MySQL 实现的 pi-agent `Storage`.
 *
 * 严格对齐官方 sqlite backend（storageVersion 1, 7 张表）的持久化语义，仅把 SQL
 * 方言换成 MySQL、作用域列 session_id + 事务改为 mysql2 连接 + BEGIN/COMMIT。
 * 每个 `MySqlStorage` 实例绑定一个 sessionId（由 repo 创建/打开时注入）。
 *
 * 说明：
 *  - 所有 seq 序列由 agent_sessions.next_seq 管理，与 sqlite 的 commit 语义一致。
 *  - mysql2 默认把 JSON 列解析为 JS 对象、BIGINT 解析为 number；统一用 jparse/Number 兜底。
 *  - 提交走单连接事务，保证一次性落盘全部写。
 */

function jparse<T>(v: unknown): T {
  if (typeof v !== 'string') return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    // mysql2 可能已把 JSON 字符串列解包为裸 string，无需再 parse
    return v as T;
  }
}

async function query<T extends RowDataPacket>(ex: Executor, sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await ex.execute(sql, params);
  return rows as T[];
}

async function exec(ex: Executor, sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await ex.execute(sql, params);
  return result as ResultSetHeader;
}

const poolQuery = <T extends RowDataPacket>(sql: string, params: unknown[] = []) => query<T>(pool, sql, params);

/* ------------------------------------------------------------------ *
 * entries 行编解码
 * ------------------------------------------------------------------ */

function entryPayloadFields(entry: Entry): Record<string, unknown> {
  switch (entry.type) {
    case 'message': {
      const p: Record<string, unknown> = { message: entry.message };
      if (entry.terminate !== undefined) p.terminate = entry.terminate;
      return p;
    }
    case 'compaction': {
      const p: Record<string, unknown> = {
        summary: entry.summary,
        retainedTail: entry.retainedTail,
        tokensBefore: entry.tokensBefore,
        fromHook: entry.fromHook,
      };
      if (entry.details !== undefined) p.details = entry.details;
      if (entry.usage !== undefined) p.usage = entry.usage;
      return p;
    }
    case 'branch_summary': {
      const p: Record<string, unknown> = {
        fromId: entry.fromId,
        summary: entry.summary,
        fromHook: entry.fromHook,
      };
      if (entry.details !== undefined) p.details = entry.details;
      if (entry.usage !== undefined) p.usage = entry.usage;
      return p;
    }
    case 'custom': {
      const p: Record<string, unknown> = {};
      if (entry.data !== undefined) p.data = entry.data;
      return p;
    }
  }
}

export function decodeEntryRow(row: Record<string, unknown>): Entry {
  const base = {
    id: row.id as string,
    parentId: (row.parent_id as string | null) ?? null,
    seq: Number(row.seq),
    timestamp: Number(row.timestamp),
  };
  const payload = jparse<Record<string, unknown>>(row.payload);
  switch (row.type) {
    case 'message':
      return { ...base, type: 'message', ...(payload as object) } as Entry;
    case 'compaction':
      return { ...base, type: 'compaction', ...(payload as object) } as Entry;
    case 'branch_summary':
      return { ...base, type: 'branch_summary', ...(payload as object) } as Entry;
    case 'custom': {
      const customType = row.custom_type as string | null;
      if (customType === null) throw new Error(`Custom entry ${base.id} is missing custom_type`);
      return { ...base, type: 'custom', customType, ...(payload as object) } as Entry;
    }
    default:
      throw new Error(`Unknown entry type: ${String(row.type)}`);
  }
}

const ENTRY_SELECT =
  'SELECT id, parent_id, seq, type, custom_type, timestamp, payload AS payload FROM agent_entries';

/* ------------------------------------------------------------------ *
 * 会话元数据（next_seq / stats）
 * ------------------------------------------------------------------ */

async function readNextSeq(ex: Executor, sessionId: string): Promise<number> {
  const rows = await query<RowDataPacket>(ex, `SELECT next_seq FROM agent_sessions WHERE id = ?`, [sessionId]);
  if (rows.length === 0) throw new Error(`Unknown session: ${sessionId}`);
  return Number(rows[0].next_seq);
}

async function advanceNextSeq(ex: Executor, sessionId: string, nextSeq: number): Promise<void> {
  const result = await exec(
    ex,
    `UPDATE agent_sessions SET next_seq = ?, updated_at = NOW() WHERE id = ?`,
    [nextSeq, sessionId],
  );
  if (result.affectedRows !== 1) throw new Error(`Session sequence not advanced: ${sessionId}`);
}

type Usage = import('@earendil-works/pi-ai').Usage;

function addUsage(left: Usage, right: Usage): Usage {
  return {
    input: left.input + right.input,
    output: left.output + right.output,
    cacheRead: left.cacheRead + right.cacheRead,
    cacheWrite: left.cacheWrite + right.cacheWrite,
    ...(left.cacheWrite1h === undefined && right.cacheWrite1h === undefined
      ? {}
      : { cacheWrite1h: (left.cacheWrite1h ?? 0) + (right.cacheWrite1h ?? 0) }),
    ...(left.reasoning === undefined && right.reasoning === undefined
      ? {}
      : { reasoning: (left.reasoning ?? 0) + (right.reasoning ?? 0) }),
    totalTokens: left.totalTokens + right.totalTokens,
    cost: {
      input: left.cost.input + right.cost.input,
      output: left.cost.output + right.cost.output,
      cacheRead: left.cost.cacheRead + right.cost.cacheRead,
      cacheWrite: left.cost.cacheWrite + right.cost.cacheWrite,
      total: left.cost.total + right.cost.total,
    },
  };
}

async function readSessionStats(ex: Executor, sessionId: string) {
  const rows = await query<RowDataPacket>(
    ex,
    `SELECT message_count, usage_payload FROM agent_sessions WHERE id = ?`,
    [sessionId],
  );
  if (rows.length === 0) throw new Error(`Unknown session: ${sessionId}`);
  return { messageCount: Number(rows[0].message_count), usage: jparse<Usage>(rows[0].usage_payload) };
}

async function incrementMessageCount(ex: Executor, sessionId: string): Promise<void> {
  await exec(ex, `UPDATE agent_sessions SET message_count = message_count + 1 WHERE id = ?`, [sessionId]);
}

async function addUsageToSessionStats(ex: Executor, sessionId: string, usage: Usage): Promise<void> {
  const current = (await readSessionStats(ex, sessionId)).usage;
  await exec(ex, `UPDATE agent_sessions SET usage_payload = ? WHERE id = ?`, [JSON.stringify(addUsage(current, usage)), sessionId]);
}

/* ------------------------------------------------------------------ *
 * 分支索引（branch_meta / branch_entries）
 * 移植自 sqlite 后端 putGame branch-entries.js；支持根分支/追加/分歧。
 * ------------------------------------------------------------------ */

async function readBranchMeta(ex: Executor, sessionId: string, branchId: string) {
  const rows = await query<RowDataPacket>(
    ex,
    `SELECT branch_id, tip_entry_id, tip_seq, base_branch_id, base_seq FROM agent_branch_meta
       WHERE session_id = ? AND branch_id = ?`,
    [sessionId, branchId],
  );
  if (rows.length === 0) throw new Error(`Branch metadata missing for branch ${branchId}`);
  return rows[0];
}

async function readBranchTipForParent(ex: Executor, sessionId: string, parentId: string | null) {
  const rows = await query<RowDataPacket>(
    ex,
    `SELECT branch_id FROM agent_branch_meta WHERE session_id = ? AND tip_entry_id = ?`,
    [sessionId, parentId],
  );
  return rows[0] as { branch_id: string } | undefined;
}

async function insertBranchEntry(conn: PoolConnection, sessionId: string, branchId: string, entry: Entry): Promise<void> {
  await conn.execute(
    `INSERT INTO agent_branch_entries (session_id, branch_id, entry_id, entry_seq, entry_type)
       VALUES (?, ?, ?, ?, ?)`,
    [sessionId, branchId, entry.id, entry.seq, entry.type],
  );
}

async function createRootBranchForEntry(conn: PoolConnection, sessionId: string, entry: Entry): Promise<void> {
  await conn.execute(
    `INSERT INTO agent_branch_meta (session_id, branch_id, tip_entry_id, tip_seq, base_branch_id, base_seq)
       VALUES (?, ?, ?, ?, NULL, NULL)`,
    [sessionId, entry.id, entry.id, entry.seq],
  );
  await insertBranchEntry(conn, sessionId, entry.id, entry);
}

async function appendEntryToExistingBranch(conn: PoolConnection, sessionId: string, branchId: string, entry: Entry): Promise<void> {
  await insertBranchEntry(conn, sessionId, branchId, entry);
  const result = await conn.execute(
    `UPDATE agent_branch_meta SET tip_entry_id = ?, tip_seq = ? WHERE session_id = ? AND branch_id = ?`,
    [entry.id, entry.seq, sessionId, branchId],
  );
  const header = result[0] as ResultSetHeader;
  if (header.affectedRows !== 1) throw new Error(`Expected to update branch ${branchId}, updated ${header.affectedRows}`);
}

async function appendEntryToBranchIndex(conn: PoolConnection, sessionId: string, entry: Entry): Promise<void> {
  if (entry.parentId === null) {
    await createRootBranchForEntry(conn, sessionId, entry);
    return;
  }
  const branch = await readBranchTipForParent(conn, sessionId, entry.parentId);
  if (branch === undefined) {
    await createDivergentBranchForEntry(conn, sessionId, entry);
    return;
  }
  await appendEntryToExistingBranch(conn, sessionId, branch.branch_id, entry);
}

async function readBranchMembership(ex: Executor, sessionId: string, entryId: string) {
  const rows = await query<RowDataPacket>(
    ex,
    `SELECT b.branch_id, b.entry_seq
       FROM agent_branch_entries b
       JOIN agent_branch_meta m ON m.session_id = b.session_id AND m.branch_id = b.branch_id
       WHERE b.session_id = ? AND b.entry_id = ?
         AND ((m.base_seq IS NULL AND b.entry_seq > 0) OR (m.base_seq IS NOT NULL AND b.entry_seq > m.base_seq))
         AND b.entry_seq <= m.tip_seq
       ORDER BY m.tip_seq DESC, b.branch_id
       LIMIT 1`,
    [sessionId, entryId],
  );
  if (rows.length === 0) throw new Error(`Branch cache missing entry ${entryId}`);
  return rows[0] as { branch_id: string; entry_seq: number };
}

interface BranchSegment {
  branchId: string;
  lowerSeq: number;
  upperSeq: number;
}

async function readBranchSegmentsNewestFirst(ex: Executor, sessionId: string, start: string): Promise<BranchSegment[]> {
  const membership = await readBranchMembership(ex, sessionId, start);
  let branchId = membership.branch_id;
  let upperSeq = Number(membership.entry_seq);
  const segments: BranchSegment[] = [];
  for (;;) {
    const meta = await readBranchMeta(ex, sessionId, branchId);
    const lowerSeq = meta.base_seq === null ? 0 : Number(meta.base_seq);
    segments.push({ branchId, lowerSeq, upperSeq });
    if (meta.base_branch_id === null) break;
    if (meta.base_seq === null) throw new Error(`Branch ${branchId} has base branch without base_seq`);
    branchId = meta.base_branch_id as string;
    upperSeq = Number(meta.base_seq);
  }
  return segments;
}

async function readNewestCompactionBoundary(ex: Executor, sessionId: string, segmentsNewestFirst: BranchSegment[]) {
  for (const segment of segmentsNewestFirst) {
    const rows = await query<RowDataPacket>(
      ex,
      `SELECT MAX(entry_seq) AS entry_seq FROM agent_branch_entries
         WHERE session_id = ? AND branch_id = ? AND entry_seq > ? AND entry_seq <= ? AND entry_type = 'compaction'`,
      [sessionId, segment.branchId, segment.lowerSeq, segment.upperSeq],
    );
    const seq = rows[0]?.entry_seq;
    if (seq !== null && seq !== undefined) return { branchId: segment.branchId, seq: Number(seq) };
  }
  return undefined;
}

async function copyBranchEntriesAfterSeqThroughParent(
  conn: PoolConnection,
  sessionId: string,
  targetBranchId: string,
  segmentsNewestFirst: BranchSegment[],
  afterSeq: number,
): Promise<void> {
  for (const segment of [...segmentsNewestFirst].reverse()) {
    const lowerSeq = Math.max(segment.lowerSeq, afterSeq);
    if (segment.upperSeq <= lowerSeq) continue;
    await conn.execute(
      `INSERT INTO agent_branch_entries (session_id, branch_id, entry_id, entry_seq, entry_type)
         SELECT ?, ?, entry_id, entry_seq, entry_type FROM agent_branch_entries
         WHERE session_id = ? AND branch_id = ? AND entry_seq > ? AND entry_seq <= ?`,
      [sessionId, targetBranchId, sessionId, segment.branchId, lowerSeq, segment.upperSeq],
    );
  }
}

async function createDivergentBranchForEntry(conn: PoolConnection, sessionId: string, entry: Entry): Promise<void> {
  if (entry.parentId === null) throw new Error('Root entries do not create divergent branches');
  const segmentsNewestFirst = await readBranchSegmentsNewestFirst(conn, sessionId, entry.parentId);
  const compaction = await readNewestCompactionBoundary(conn, sessionId, segmentsNewestFirst);
  const branchId = entry.id;
  await conn.execute(
    `INSERT INTO agent_branch_meta (session_id, branch_id, tip_entry_id, tip_seq, base_branch_id, base_seq)
       VALUES (?, ?, ?, ?, ?, ?)`,
    [sessionId, branchId, entry.id, entry.seq, compaction?.branchId ?? null, compaction?.seq ?? null],
  );
  await copyBranchEntriesAfterSeqThroughParent(conn, sessionId, branchId, segmentsNewestFirst, compaction?.seq ?? 0);
  await insertBranchEntry(conn, sessionId, branchId, entry);
}

async function scanBranchSegments(sessionId: string, query: StorageBranchScan, readSegment: (segment: BranchSegment, oldestFirst: boolean, stopSeq: number | undefined, limit: number | undefined) => Promise<RowDataPacket[]>) {
  const oldestFirst = query.order === 'oldestFirst';
  const segmentsNewestFirst = await readBranchSegmentsNewestFirst(pool, sessionId, query.start);
  const segments = oldestFirst ? [...segmentsNewestFirst].reverse() : segmentsNewestFirst;
  const limit = query.limit === undefined ? undefined : Math.max(0, query.limit);
  if (limit === 0) return [];
  const rows: RowDataPacket[] = [];
  for (const segment of segments) {
    const remaining = limit === undefined ? undefined : limit - rows.length;
    if (remaining !== undefined && remaining <= 0) break;
    const stopSeq = await readStopSeq(sessionId, segment, query, oldestFirst);
    rows.push(...(await readSegment(segment, oldestFirst, stopSeq, remaining)));
    if (stopSeq !== undefined) break;
  }
  return rows;
}

function stopPredicates(query: StorageBranchScan) {
  const predicates: string[] = [];
  const params: unknown[] = [];
  if (query.stopAtType !== undefined) {
    predicates.push('b.entry_type = ?');
    params.push(query.stopAtType);
  }
  if (query.stopAtId !== undefined) {
    predicates.push('b.entry_id = ?');
    params.push(query.stopAtId);
  }
  return { predicates, params };
}

async function readStopSeq(sessionId: string, segment: BranchSegment, query: StorageBranchScan, oldestFirst: boolean): Promise<number | undefined> {
  const { predicates, params } = stopPredicates(query);
  if (predicates.length === 0) return undefined;
  const aggregate = oldestFirst ? 'MIN(b.entry_seq)' : 'MAX(b.entry_seq)';
  const rows = await poolQuery<RowDataPacket>(
    `SELECT ${aggregate} AS stop_seq FROM agent_branch_entries b
       WHERE b.session_id = ? AND b.branch_id = ? AND b.entry_seq > ? AND b.entry_seq <= ? AND (${predicates.join(' OR ')})
       LIMIT 1`,
    [sessionId, segment.branchId, segment.lowerSeq, segment.upperSeq, ...params],
  );
  return rows[0]?.stop_seq === undefined ? undefined : Number(rows[0].stop_seq);
}

async function scanEntrySegmentRows(sessionId: string, segment: BranchSegment, query: StorageBranchScan, oldestFirst: boolean, stopSeq: number | undefined, limit: number | undefined): Promise<RowDataPacket[]> {
  const predicates: string[] = [
    'b.session_id = ?',
    'b.branch_id = ?',
    'b.entry_seq > ?',
    'b.entry_seq <= ?',
    'e.session_id = b.session_id',
  ];
  const params: unknown[] = [sessionId, segment.branchId, segment.lowerSeq, segment.upperSeq];
  if (stopSeq !== undefined) {
    predicates.push(oldestFirst ? 'b.entry_seq <= ?' : 'b.entry_seq >= ?');
    params.push(stopSeq);
  }
  if (query.type !== undefined) {
    predicates.push('b.entry_type = ?');
    params.push(query.type);
  }
  if (query.customType !== undefined) {
    predicates.push('e.custom_type = ?');
    params.push(query.customType);
  }
  if (query.cursor !== undefined) {
    predicates.push(oldestFirst ? 'b.entry_seq > ?' : 'b.entry_seq < ?');
    params.push(query.cursor.seq);
  }
  const order = oldestFirst ? 'ASC' : 'DESC';
  const limitSql = limit === undefined ? '' : ` LIMIT ${Math.max(0, limit)}`;
  return poolQuery<RowDataPacket>(
    `SELECT e.id, e.parent_id, e.seq, e.type, e.custom_type, e.timestamp, e.payload
       FROM agent_branch_entries b
       JOIN agent_entries e ON e.session_id = b.session_id AND e.id = b.entry_id
       WHERE ${predicates.join(' AND ')} ORDER BY b.entry_seq ${order}${limitSql}`,
    params,
  );
}

async function scanBranchEntries(sessionId: string, query: StorageBranchScan): Promise<Entry[]> {
  const rows = await scanBranchSegments(sessionId, query, (seg, oldest, stop, limit) =>
    scanEntrySegmentRows(sessionId, seg, query, oldest, stop, limit),
  );
  return rows.map(decodeEntryRow);
}

async function scanBranchEntryStructures(sessionId: string, query: StorageBranchScan): Promise<EntryStructure[]> {
  const rows = await scanBranchSegments(sessionId, query, async (seg, oldest, stop, limit) => {
    const predicates: string[] = [
      'b.session_id = ?',
      'b.branch_id = ?',
      'b.entry_seq > ?',
      'b.entry_seq <= ?',
      'e.session_id = b.session_id',
    ];
    const params: unknown[] = [sessionId, seg.branchId, seg.lowerSeq, seg.upperSeq];
    if (stop !== undefined) {
      predicates.push(oldest ? 'b.entry_seq <= ?' : 'b.entry_seq >= ?');
      params.push(stop);
    }
    if (query.type !== undefined) {
      predicates.push('b.entry_type = ?');
      params.push(query.type);
    }
    if (query.customType !== undefined) {
      predicates.push('e.custom_type = ?');
      params.push(query.customType);
    }
    if (query.cursor !== undefined) {
      predicates.push(oldest ? 'b.entry_seq > ?' : 'b.entry_seq < ?');
      params.push(query.cursor.seq);
    }
    const order = oldest ? 'ASC' : 'DESC';
    const limitSql = limit === undefined ? '' : ` LIMIT ${Math.max(0, limit)}`;
    return poolQuery<RowDataPacket>(
      `SELECT e.id, e.parent_id, e.seq, e.type, e.custom_type, e.timestamp
         FROM agent_branch_entries b
         JOIN agent_entries e ON e.session_id = b.session_id AND e.id = b.entry_id
         WHERE ${predicates.join(' AND ')} ORDER BY b.entry_seq ${order}${limitSql}`,
      params,
    );
  });
  return rows.map((row) => ({
    id: row.id as string,
    parentId: (row.parent_id as string | null) ?? null,
    seq: Number(row.seq),
    timestamp: Number(row.timestamp),
    type: row.type as Entry['type'],
    ...((row.custom_type as string | null) === null ? {} : { customType: row.custom_type as string }),
  }));
}

/* ------------------------------------------------------------------ *
 * scalar / list 值
 * ------------------------------------------------------------------ */

async function setScalarValueRow(conn: PoolConnection, sessionId: string, namespace: string, key: string, seq: number, storedValue: unknown): Promise<void> {
  await conn.execute(
    `INSERT INTO agent_scalar_values (session_id, namespace, \`key\`, seq, value) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE seq = VALUES(seq), value = VALUES(value)`,
    [sessionId, namespace, key, seq, JSON.stringify(storedValue)],
  );
}

async function deleteScalarValueRow(conn: PoolConnection, sessionId: string, namespace: string, key: string): Promise<void> {
  await conn.execute(
    `DELETE FROM agent_scalar_values WHERE session_id = ? AND namespace = ? AND \`key\` = ?`,
    [sessionId, namespace, key],
  );
}

async function readScalarValueRow<T>(sessionId: string, address: Value<T>): Promise<StoredValue<T> | undefined> {
  const rows = await poolQuery<RowDataPacket>(
    `SELECT namespace, \`key\`, seq, value FROM agent_scalar_values WHERE session_id = ? AND namespace = ? AND \`key\` = ?`,
    [sessionId, address.namespace, address.key],
  );
  if (rows.length === 0) return undefined;
  const row = rows[0];
  return { address, seq: Number(row.seq), value: jparse<T>(row.value) };
}

function nextPrefixBoundary(prefix: string): string | undefined {
  if (prefix === '') return undefined;
  const codePoints = Array.from(prefix);
  for (let index = codePoints.length - 1; index >= 0; index--) {
    const codePoint = codePoints[index]?.codePointAt(0);
    if (codePoint === undefined) throw new Error('Invalid value key prefix');
    if (codePoint < 0x10ffff) {
      const nextCodePoint = codePoint >= 0xd7ff && codePoint < 0xe000 ? 0xe000 : codePoint + 1;
      return `${codePoints.slice(0, index).join('')}${String.fromCodePoint(nextCodePoint)}`;
    }
  }
  return undefined;
}

async function scanScalarValueRows<T>(sessionId: string, prefix: Value<T>): Promise<StoredValue<T>[]> {
  const upperBound = nextPrefixBoundary(prefix.key);
  const params: unknown[] = [sessionId, prefix.namespace, prefix.key];
  let sql = `SELECT namespace, \`key\`, seq, value FROM agent_scalar_values WHERE session_id = ? AND namespace = ? AND \`key\` >= ?`;
  if (upperBound !== undefined) {
    sql += ` AND \`key\` < ?`;
    params.push(upperBound);
  }
  sql += ` ORDER BY \`key\` ASC`;
  const rows = await poolQuery<RowDataPacket>(sql, params);
  return rows.map((row) => ({ address: value(row.namespace as string, row.key as string) as Value<T>, seq: Number(row.seq), value: jparse<T>(row.value) }));
}

async function appendListValueRow(conn: PoolConnection, sessionId: string, namespace: string, key: string, seq: number, element: unknown): Promise<void> {
  await conn.execute(
    `INSERT INTO agent_list_values (session_id, namespace, \`key\`, seq, value) VALUES (?, ?, ?, ?, ?)`,
    [sessionId, namespace, key, seq, JSON.stringify(element)],
  );
}

async function deleteListValueRows(conn: PoolConnection, sessionId: string, namespace: string, key: string): Promise<void> {
  await conn.execute(
    `DELETE FROM agent_list_values WHERE session_id = ? AND namespace = ? AND \`key\` = ?`,
    [sessionId, namespace, key],
  );
}

async function readListValueRows<T>(sessionId: string, address: ValueList<T>, options: ListReadOptions | undefined): Promise<ListElement<T>[]> {
  const resolved = resolveListReadOptions(options ?? undefined);
  const base = ` FROM agent_list_values WHERE session_id = ? AND namespace = ? AND \`key\` = ?`;
  let whereCursor = '';
  const params: unknown[] = [sessionId, address.namespace, address.key];
  if (resolved.order === 'asc') {
    if (resolved.cursor !== undefined) {
      whereCursor = ` AND seq > ?`;
      params.push(resolved.cursor.seq);
    }
  } else {
    if (resolved.cursor !== undefined) {
      whereCursor = ` AND seq < ?`;
      params.push(resolved.cursor.seq);
    }
  }
  const order = resolved.order === 'asc' ? 'ASC' : 'DESC';
  const rows = await poolQuery<RowDataPacket>(
    `SELECT seq, value${base}${whereCursor} ORDER BY seq ${order} LIMIT ${Math.max(0, resolved.limit)}`,
    params,
  );
  return rows.map((row) => ({ seq: Number(row.seq), value: jparse<T>(row.value) }));
}

/* ------------------------------------------------------------------ *
 * usage 账本
 * ------------------------------------------------------------------ */

async function insertUsageLedgerRow(conn: PoolConnection, sessionId: string, row: Omit<UsageRow, 'seq'> & { seq: number }): Promise<void> {
  await conn.execute(
    `INSERT INTO agent_usage_ledger (session_id, id, seq, entry_id, adjustment, \`usage\`, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      row.id,
      row.seq,
      row.entryId ?? null,
      row.adjustment ? 1 : 0,
      JSON.stringify(row.usage),
      row.details === undefined ? null : JSON.stringify(row.details),
    ],
  );
}

async function scanUsageLedgerRows(sessionId: string, query: UsageScan): Promise<UsageRow[]> {
  const filters: string[] = ['session_id = ?'];
  const params: unknown[] = [sessionId];
  if (query.fromSeq !== undefined) {
    filters.push('seq >= ?');
    params.push(query.fromSeq);
  }
  if (query.toSeq !== undefined) {
    filters.push('seq <= ?');
    params.push(query.toSeq);
  }
  const order = query.order === 'desc' ? 'ORDER BY seq DESC' : 'ORDER BY seq ASC';
  const limit = query.limit === undefined ? '' : ` LIMIT ${Math.max(0, query.limit)}`;
  const rows = await poolQuery<RowDataPacket>(`SELECT id, seq, entry_id, adjustment, \`usage\`, details FROM agent_usage_ledger WHERE ${filters.join(' AND ')} ${order}${limit}`, params);
  return rows.map((row) => ({
    id: row.id as string,
    seq: Number(row.seq),
    usage: jparse<Usage>(row.usage),
    ...((row.entry_id as string | null) === null ? {} : { entryId: row.entry_id as string }),
    adjustment: Number(row.adjustment) !== 0,
    ...((row.details as unknown) === null ? {} : { details: jparse<unknown>(row.details) }),
  })) as UsageRow[];
}

/* ------------------------------------------------------------------ *
 * MySqlStorage
 * ------------------------------------------------------------------ */

export class MySqlStorage implements Storage {
  readonly sessionId: string;
  private state: 'open' | 'closing' | 'closed' = 'open';
  private commitQueue: Promise<void> = Promise.resolve();
  private closePromise: Promise<void> | undefined;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  commit(writes: Write[], _context: Context): Promise<CommitResult> {
    if (this.state !== 'open') return Promise.reject(new Error('MySqlStorage is closed'));
    const result = this.commitQueue.then(() => this.applyCommit(writes));
    this.commitQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async applyCommit(writes: Write[]): Promise<CommitResult> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const firstSeq = await readNextSeq(conn, this.sessionId);
      const prepared = prepareStorageCommit(writes, firstSeq, Date.now());
      for (const write of prepared.writes) {
        switch (write.kind) {
          case 'entry': {
            const { kind: _kind, ...entry } = write;
            await conn.execute(
              `INSERT INTO agent_entries (session_id, id, parent_id, seq, type, custom_type, timestamp, payload)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                this.sessionId,
                entry.id,
                entry.parentId,
                entry.seq,
                entry.type,
                entry.type === 'custom' ? entry.customType : null,
                entry.timestamp,
                JSON.stringify(entryPayloadFields(entry as Entry)),
              ],
            );
            await appendEntryToBranchIndex(conn, this.sessionId, entry as Entry);
            if (entry.type === 'message') await incrementMessageCount(conn, this.sessionId);
            break;
          }
          case 'usage': {
            const { kind: _kind, ...row } = write;
            await insertUsageLedgerRow(conn, this.sessionId, row as UsageRow);
            await addUsageToSessionStats(conn, this.sessionId, (row as UsageRow).usage);
            break;
          }
          case 'value':
            if (write.op === 'delete') {
              await deleteScalarValueRow(conn, this.sessionId, write.namespace, write.key);
            } else {
              await setScalarValueRow(conn, this.sessionId, write.namespace, write.key, write.seq, write.value);
            }
            break;
          case 'list':
            if (write.op === 'delete') {
              await deleteListValueRows(conn, this.sessionId, write.namespace, write.key);
            } else {
              await appendListValueRow(conn, this.sessionId, write.namespace, write.key, write.seq, write.value);
            }
            break;
        }
      }
      await advanceNextSeq(conn, this.sessionId, firstSeq + prepared.writes.length);
      const stats = await readSessionStats(conn, this.sessionId);
      await conn.commit();
      return { ...prepared.result, stats };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  getEntries(ids: string[], _context: Context): Promise<Map<string, Entry>> {
    if (this.state !== 'open') return Promise.reject(new Error('MySqlStorage is closed'));
    return this.doGetEntries(ids);
  }

  private async doGetEntries(ids: string[]): Promise<Map<string, Entry>> {
    if (ids.length === 0) return new Map();
    const placeholders = ids.map(() => '?').join(', ');
    const rows = await poolQuery<RowDataPacket>(
      `${ENTRY_SELECT} WHERE session_id = ? AND id IN (${placeholders})`,
      [this.sessionId, ...ids],
    );
    const rowsById = new Map(rows.map((row) => [row.id as string, row as Record<string, unknown>]));
    const entries = new Map<string, Entry>();
    for (const id of ids) {
      const row = rowsById.get(id);
      if (row !== undefined) entries.set(id, decodeEntryRow(row));
    }
    return entries;
  }

  getValue<T>(address: Value<T>, _context: Context): Promise<StoredValue<T> | undefined> {
    if (this.state !== 'open') return Promise.reject(new Error('MySqlStorage is closed'));
    return readScalarValueRow<T>(this.sessionId, address);
  }

  scanValues<T>(prefix: Value<T>, _context: Context): Promise<StoredValue<T>[]> {
    if (this.state !== 'open') return Promise.reject(new Error('MySqlStorage is closed'));
    return scanScalarValueRows<T>(this.sessionId, prefix);
  }

  readList<T>(address: ValueList<T>, options: ListReadOptions | undefined, _context: Context): Promise<ListElement<T>[]> {
    if (this.state !== 'open') return Promise.reject(new Error('MySqlStorage is closed'));
    return readListValueRows<T>(this.sessionId, address, options);
  }

  scanBranch(query: StorageBranchScan, _context: Context): Promise<Entry[]> {
    if (this.state !== 'open') return Promise.reject(new Error('MySqlStorage is closed'));
    return scanBranchEntries(this.sessionId, query);
  }

  scanBranchStructure(query: StorageBranchScan, _context: Context): Promise<EntryStructure[]> {
    if (this.state !== 'open') return Promise.reject(new Error('MySqlStorage is closed'));
    return scanBranchEntryStructures(this.sessionId, query);
  }

  scanEntries(query: EntryScan, _context: Context): Promise<Entry[]> {
    if (this.state !== 'open') return Promise.reject(new Error('MySqlStorage is closed'));
    return this.doScanEntries(query);
  }

  private async doScanEntries(query: EntryScan): Promise<Entry[]> {
    const filters: string[] = ['session_id = ?'];
    const params: unknown[] = [this.sessionId];
    if (query.type !== undefined) {
      filters.push('type = ?');
      params.push(query.type);
    }
    if (query.customType !== undefined) {
      filters.push('custom_type = ?');
      params.push(query.customType);
    }
    if (query.fromSeq !== undefined) {
      filters.push('seq >= ?');
      params.push(query.fromSeq);
    }
    if (query.toSeq !== undefined) {
      filters.push('seq <= ?');
      params.push(query.toSeq);
    }
    const order = query.order === 'desc' ? 'ORDER BY seq DESC' : 'ORDER BY seq ASC';
    const limit = query.limit === undefined ? '' : ` LIMIT ${Math.max(0, query.limit)}`;
    const rows = await poolQuery<RowDataPacket>(`${ENTRY_SELECT} WHERE ${filters.join(' AND ')} ${order}${limit}`, params);
    return rows.map((row) => decodeEntryRow(row as Record<string, unknown>));
  }

  scanUsage(query: UsageScan, _context: Context): Promise<UsageRow[]> {
    if (this.state !== 'open') return Promise.reject(new Error('MySqlStorage is closed'));
    return scanUsageLedgerRows(this.sessionId, query);
  }

  getStats(_context: Context): Promise<import('@earendil-works/pi-agent-core').SessionStats> {
    if (this.state !== 'open') return Promise.reject(new Error('MySqlStorage is closed'));
    return readSessionStats(pool, this.sessionId);
  }

  close(_context: Context): Promise<void> {
    if (this.closePromise !== undefined) return this.closePromise;
    this.state = 'closing';
    this.closePromise = this.commitQueue.then(() => {
      this.state = 'closed';
    });
    return this.closePromise;
  }
}

export { branchTip };