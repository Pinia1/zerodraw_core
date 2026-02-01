import { int, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const user = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').unique().notNull(),
  viewNum: int('view_num').default(0),
  platform: varchar('platform', { length: 255 }).notNull(),
  username: varchar('username', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  avatar: varchar('avatar', { length: 500 }),
  name: varchar('name', { length: 255 }),
  bio: text('bio'),
  blog: varchar('blog', { length: 500 }),
  location: varchar('location', { length: 255 }),
  publicRepos: int('public_repos').default(0),
  followers: int('followers').default(0),
  following: int('following').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
