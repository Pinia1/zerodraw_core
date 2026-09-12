import * as schema from '@zeroDraw/db';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '../config/env';

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  timezone: '+08:00',

  //
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,

  //
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10000,

  multipleStatements: false,
  dateStrings: true,
});

export const db = drizzle(pool, { schema, mode: 'default' });

// Agent 会话存储层使用 mysql2 原生连接做参数化 SQL + 事务（与官方 sqlite backend
// 的实现方式一致，便于对齐语义）。这是同一个连接池的附加导出。
export { pool };

export const closeDatabase = async () => {
  await pool.end();
};
