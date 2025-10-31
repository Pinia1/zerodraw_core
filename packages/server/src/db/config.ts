import dotenv from 'dotenv';
dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'), // MySQL 默认端口
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};
