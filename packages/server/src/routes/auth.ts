import { Router } from 'express';
import { githubLogin } from '../controllers/authController';

const router: Router = Router();

router.get('/login', githubLogin);

export default router;
