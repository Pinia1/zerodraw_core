import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // schema 文件位置
  schema: './src/schema/index.ts',

  // migration 文件输出目录
  out: './drizzle',

  // 数据库方言
  dialect: 'mysql',

  // 数据库连接配置
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zerodraw',
  },

  // 详细日志
  verbose: true,

  // 严格模式
  strict: true,
});
