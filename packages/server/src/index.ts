import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import 'reflect-metadata';
import { AppDataSource } from './db/connection';
import { errorMiddleware } from './middleware/error';
import authRoutes from './routes/auth';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3008;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(errorMiddleware);

app.use('/github', authRoutes);
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'not found' });
});

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
