import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

// 统一成功响应格式
export const successResponse = <T>(
  res: Response,
  data?: T,
  message: string = 'success',
  code: number = 200
) => {
  return res.status(200).json({
    code,
    message,
    data,
  });
};

// 全局错误处理中间件
export const errorMiddleware = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', err);

  // 处理自定义 API 错误
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  // 处理 JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      code: 401,
      message: 'Token无效',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      code: 401,
      message: 'Token已过期',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  // 未知错误
  return res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};
