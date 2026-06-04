import { int, json, mysqlTable, text, timestamp, tinyint, varchar } from 'drizzle-orm/mysql-core';
import { user } from './user';

export const assetColor = mysqlTable('asset_colors', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: int('user_id').notNull().references(() => user.userId),
  projectId: varchar('project_id', { length: 36 }),
  hex: varchar('hex', { length: 9 }).notNull(),
  name: varchar('name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const assetPalette = mysqlTable('asset_palettes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: int('user_id').notNull().references(() => user.userId),
  projectId: varchar('project_id', { length: 36 }),
  name: varchar('name', { length: 100 }).notNull().default('Untitled'),
  colors: json('colors').$type<string[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const assetImage = mysqlTable('asset_images', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: int('user_id').notNull().references(() => user.userId),
  projectId: varchar('project_id', { length: 36 }),
  name: varchar('name', { length: 255 }).notNull(),
  fileId: varchar('file_id', { length: 36 }),
  url: varchar('url', { length: 500 }).notNull(),
  width: int('width'),
  height: int('height'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const assetPrompt = mysqlTable('asset_prompts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: int('user_id').notNull().references(() => user.userId),
  projectId: varchar('project_id', { length: 36 }),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  tags: json('tags').$type<string[]>().notNull(),
  isFavorite: tinyint('is_favorite').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const assetBrush = mysqlTable('asset_brushes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: int('user_id').notNull().references(() => user.userId),
  projectId: varchar('project_id', { length: 36 }),
  name: varchar('name', { length: 100 }).notNull(),
  config: json('config').$type<Record<string, unknown>>().notNull(),
  thumbnail: varchar('thumbnail', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export type AssetColor = typeof assetColor.$inferSelect;
export type NewAssetColor = typeof assetColor.$inferInsert;
export type AssetPalette = typeof assetPalette.$inferSelect;
export type NewAssetPalette = typeof assetPalette.$inferInsert;
export type AssetImage = typeof assetImage.$inferSelect;
export type NewAssetImage = typeof assetImage.$inferInsert;
export type AssetPrompt = typeof assetPrompt.$inferSelect;
export type NewAssetPrompt = typeof assetPrompt.$inferInsert;
export type AssetBrush = typeof assetBrush.$inferSelect;
export type NewAssetBrush = typeof assetBrush.$inferInsert;
