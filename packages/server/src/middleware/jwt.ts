import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../jwt';
import { ApiError } from '../utils/ApiError';

// 扩展 Express Request 类型，添加 user 属性
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        [key: string]: any;
      };
    }
  }
}

/**
 * JWT 认证中间件
 * 验证请求头中的 Bearer Token，并将解析后的用户信息挂载到 req.user
 */
export const jwtMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization;

    // 检查是否有 Authorization 头
    if (!authorization) {
      throw ApiError.unauthorized('缺少授权信息');
    }

    // 检查是否为 Bearer Token 格式
    if (!authorization.startsWith('Bearer ')) {
      throw ApiError.unauthorized('缺少授权信息');
    }

    // 提取 token
    const token = authorization.replace('Bearer ', '');

    // 验证 token（这里会自动抛出 jwt 错误，由全局错误中间件处理）
    const payload = verifyToken(token) as { id: number; [key: string]: any };

    // 将用户信息挂载到 req.user
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 可选的 JWT 认证中间件
 * 如果有 token 则验证，没有 token 也不报错，继续执行
 */
export const optionalJwtMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization;

    if (authorization && authorization.startsWith('Bearer ')) {
      const token = authorization.replace('Bearer ', '');
      const payload = verifyToken(token) as { id: number; [key: string]: any };
      req.user = payload;
    }

    next();
  } catch (error) {
    // 可选认证，token 无效也继续执行
    next();
  }
};
