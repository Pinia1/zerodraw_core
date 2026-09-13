import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './user';

export const project = sqliteTable('projects', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => user.userId),
  name: text('name').notNull().default('Untitled'),
  thumbnailKey: text('thumbnail_key'),
  canvasWidth: integer('canvas_width').notNull().default(800),
  canvasHeight: integer('canvas_height').notNull().default(600),
  backgroundColor: text('background_color').notNull().default('#ffffff'),
  backgroundVisible: integer('background_visible', { mode: 'boolean' }).notNull().default(false),
  /** Studio 画布快照：nodes / edges / viewport JSON */
  flowState: text('flow_state', { mode: 'json' }).$type<Record<string, unknown> | null>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
