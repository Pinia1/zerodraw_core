import { int, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { user } from './user';

export const order = mysqlTable('orders', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: int('user_id')
    .notNull()
    .references(() => user.userId),
  planKey: varchar('plan_key', { length: 32 }).notNull(),
  outTradeNo: varchar('out_trade_no', { length: 64 }).notNull().unique(),
  tradeNo: varchar('trade_no', { length: 64 }),
  amount: varchar('amount', { length: 16 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  paidAt: timestamp('paid_at'),
});

export type Order = typeof order.$inferSelect;
export type NewOrder = typeof order.$inferInsert;
