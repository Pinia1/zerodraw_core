import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { user } from './user';

export const aiTask = mysqlTable('ai_tasks', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  userId: int('user_id')
    .notNull()
    .references(() => user.userId),
  action: varchar('action', { length: 50 }).notNull(), // 'seedream' 等
  status: mysqlEnum('status', ['pending', 'processing', 'completed', 'failed'])
    .notNull()
    .default('pending'),
  args: json('args'), // 请求参数
  output: json('output'), // 生成结果
  error: text('error'), // 错误信息
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export type AiTask = typeof aiTask.$inferSelect;
export type NewAiTask = typeof aiTask.$inferInsert;
