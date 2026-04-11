import { boolean, int, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { user } from './user';

export const project = mysqlTable('projects', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: int('user_id')
    .notNull()
    .references(() => user.userId),
  name: varchar('name', { length: 255 }).notNull().default('Untitled'),
  thumbnailKey: varchar('thumbnail_key', { length: 500 }),
  canvasWidth: int('canvas_width').notNull().default(800),
  canvasHeight: int('canvas_height').notNull().default(600),
  backgroundColor: varchar('background_color', { length: 50 }).notNull().default('#ffffff'),
  backgroundVisible: boolean('background_visible').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
});

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
