import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import * as schema from './schema';

// 获取 __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
config({ path: path.resolve(__dirname, '../../../.env') });

// 创建 MySQL 连接池
const poolConnection = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zerodraw',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 创建 Drizzle 数据库实例
export const db = drizzle(poolConnection, {
  schema,
  mode: 'default',
});

// 导出连接池，用于原始 SQL 查询或关闭连接
export const pool = poolConnection;

// 测试数据库连接
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// 优雅关闭数据库连接
export async function closeConnection() {
  try {
    await pool.end();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}
