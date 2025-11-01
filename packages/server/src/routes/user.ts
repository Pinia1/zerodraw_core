import { Router } from 'express';
import { userController } from '../controllers/userController';
import { jwtMiddleware } from '../middleware/jwt';

const router: Router = Router();

// 所有用户相关路由都需要 JWT 认证
router.get('/info', jwtMiddleware, userController.getUserInfo);

export default router;
