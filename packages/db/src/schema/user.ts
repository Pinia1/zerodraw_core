import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().unique(),
  viewNum: integer('view_num').default(0),
  platform: text('platform').notNull(),
  username: text('username').notNull(),
  email: text('email'),
  avatar: text('avatar'),
  name: text('name'),
  bio: text('bio'),
  blog: text('blog'),
  location: text('location'),
  publicRepos: integer('public_repos').default(0),
  followers: integer('followers').default(0),
  following: integer('following').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
