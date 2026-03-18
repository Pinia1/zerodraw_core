import { githubCallbackSchema } from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { env } from '../../config/env';
import { createSuccessResponse } from '../../types/response';
import { QueryValidation } from '../../utils/schame';
import { githubService } from '../Passport/github.service';
import { authenticate } from './auth.middleware';
import { authService } from './auth.services';
import { JwtPayload, pickUserBasicInfo } from './auth.types';

export async function authRoutes(app: FastifyInstance) {
  app.get('/github/callback', async (request, reply) => {
    const queryResult = QueryValidation(githubCallbackSchema, request.query);
    const { code } = queryResult;

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
    return reply.send(
      createSuccessResponse({
        token,
        user: pickUserBasicInfo(user),
      })
    );
  });

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as JwtPayload;
    return reply.send(createSuccessResponse({ ...user }));
  });
}
