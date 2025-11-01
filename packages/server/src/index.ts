import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import 'reflect-metadata';
import { AppDataSource } from './db/connection';
import { errorMiddleware } from './middleware/error';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3008;

// 基础中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/github', authRoutes);
app.use('/api/user', userRoutes);

// 404 处理（放在所有路由之后）
app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: '请求的资源不存在',
    path: req.path,
  });
});

// 错误处理中间件（必须放在最后）
app.use(errorMiddleware);

// 启动服务器
const server = app.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  try {
    await AppDataSource.initialize();
    console.log('✅ TypeORM DataSource initialized');
  } catch (error: any) {
    console.error('❌ TypeORM DataSource initialization failed:', error.message);
  }
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  }
});
