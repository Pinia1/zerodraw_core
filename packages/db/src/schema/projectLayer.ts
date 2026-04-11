import { boolean, int, json, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { project } from './project';

export const projectLayer = mysqlTable('project_layers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  projectId: varchar('project_id', { length: 36 })
    .notNull()
    .references(() => project.id),
  name: varchar('name', { length: 255 }).notNull().default('layer 1'),
  order: int('order').notNull().default(0),
  opacity: int('opacity').notNull().default(100),
  visible: boolean('visible').notNull().default(true),
  blendMode: varchar('blend_mode', { length: 50 }).notNull().default('normal'),
  filter: json('filter'),
  content: json('content'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export type ProjectLayer = typeof projectLayer.$inferSelect;
export type NewProjectLayer = typeof projectLayer.$inferInsert;
