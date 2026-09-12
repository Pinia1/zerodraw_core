// 冒烟脚本：不经过 HTTP，直接验证自写 MySQL Storage + StorageBackedSession 的
// commit / 分支索引 / 读取回环（不调用 LLM）。

import { BACKGROUND_CONTEXT, StorageBackedSession } from '@earendil-works/pi-agent-core';
import { randomUUID } from 'crypto';

async function main() {
  const [{ agentRepository }, { MySqlStorage }] = await Promise.all([
    import('./src/modules/Agent/session/repository'),
    import('./src/modules/Agent/storage/mysql.storage'),
  ]);

  const { db } = await import('./src/db');
  const { user } = await import('@zeroDraw/db');
  const [firstUser] = await db.select({ userId: user.userId }).from(user).limit(1);
  if (!firstUser) throw new Error('No user in DB — create a user before running smoke test');
  const userId = firstUser.userId;
  const meta = await agentRepository.create({ userId, title: 'smoke-test' });
  console.log('created session', meta.id);

  const storage = new MySqlStorage(meta.id);
  const session = new StorageBackedSession(meta, storage);

  const branch = await session.createBranch('main', null, BACKGROUND_CONTEXT);
  console.log('tip before', await branch.getTipId(BACKGROUND_CONTEXT));

  const entryId = await branch.appendMessage(
    { role: 'user', content: '你好，测试一条消息', timestamp: Date.now() },
    BACKGROUND_CONTEXT,
  );
  console.log('appended message entry', entryId);

  console.log('tip after ', await branch.getTipId(BACKGROUND_CONTEXT));

  const entries = await branch.findEntries(undefined, BACKGROUND_CONTEXT);
  console.log('entries count', entries.length);
  console.log('first entry type', entries[0]?.type, 'id', entries[0]?.id);

  const stats = await session.getStats(BACKGROUND_CONTEXT);
  console.log('stats', JSON.stringify({ messageCount: stats.messageCount, totalTokens: stats.usage.totalTokens }));

  const { readMainLaneTranscript } = await import('./src/modules/Agent/session/history');
  const transcript = await readMainLaneTranscript(meta.id);
  console.log('transcript count', transcript.length, 'first role', (transcript[0]?.message as { role?: string })?.role);

  await session.close(BACKGROUND_CONTEXT);
  await agentRepository.delete(meta.id);
  console.log('cleaned up. OK, randomUUID', randomUUID().length > 0 ? 'ok' : 'no');
}

main().catch((e) => {
  console.error('SMOKE FAILED', e);
  process.exit(1);
});