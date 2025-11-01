import { NextFunction, Request, Response } from 'express';
import { successResponse } from '../middleware/error';
import { userService } from '../service/userService';
import { ApiError } from '../utils/ApiError';

class UserController {
  /**
   * 获取用户信息
   * 注意：此接口需要 JWT 认证（在路由层面已添加 jwtMiddleware）
   * 可以通过 req.user.id 获取当前登录用户的 ID
   */
  async getUserInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // JWT 中间件已经验证了 token，并将用户信息放在 req.user 中
      const userId = req.user!.id;

      const userInfo = await userService.getUserById(userId);

      if (!userInfo) {
        throw ApiError.notFound('用户不存在');
      }

      successResponse(res, userInfo, '成功');
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
