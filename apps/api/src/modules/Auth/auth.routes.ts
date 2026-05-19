import { GithubCallbackResponse, githubCallbackSchema } from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { env } from '../../config/env';
import { githubService } from '../Passport/github.service';
import { authenticate } from './auth.middleware';
import { authService } from './auth.services';
import { JwtPayload, pickUserBasicInfo } from './auth.types';

export async function authRoutes(app: FastifyInstance) {
  app.get<{ Querystring: GithubCallbackResponse }>(
    '/github/callback',
    { schema: { querystring: githubCallbackSchema } },
    async (request, reply) => {
      const { code } = request.query;

      const { access_token } = await githubService.getAccessToken(code);
      const userInfo = await githubService.getUserInfo(access_token);
      const {
        id,
        login,
        avatar_url,
        email,
        name,
        bio,
        blog,
        location,
        public_repos,
        followers,
        following,
      } = userInfo;

      const user = await authService.findOrCreateUser({
        userId: id,
        username: login,
        avatar: avatar_url,
        email,
        name,
        bio,
        blog,
        location,
        publicRepos: public_repos,
        followers,
        following,
        platform: 'github',
      });
      const token = app.jwt.sign({ userId: user.id }, { expiresIn: env.JWT_EXPIRES_IN });
      return reply.success({
        token,
        user: pickUserBasicInfo(user),
      });
    }
  );

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as JwtPayload;
    return reply.success({ ...user });
  });
}
