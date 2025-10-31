import { Router } from 'express';
import { githubLogin } from '../controllers/authController';

const router: Router = Router();

// GitHub OAuth 回调
router.get('/login', githubLogin);

export default router;
