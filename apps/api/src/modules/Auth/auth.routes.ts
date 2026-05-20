import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { githubCallbackSchema, guestLoginSchema } from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { env } from '../../config/env';
import { githubService } from '../Passport/github.service';
import { authenticate } from './auth.middleware';
import { authService } from './auth.services';
import { JwtPayload, pickUserBasicInfo } from './auth.types';

function fingerprintToInt(fp: string): number {
  let hash = 5381;
  for (let i = 0; i < fp.length; i++) {
    hash = ((hash << 5) + hash) ^ fp.charCodeAt(i);
  }
  return hash >>> 0;
}

export async function authRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.get(
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

  app.post('/guest', { schema: { body: guestLoginSchema } }, async (request, reply) => {
    const { fingerprint } = request.body;
    const userId = fingerprintToInt(fingerprint);
    const user = await authService.findOrCreateUser({
      userId,
      username: `guest_${fingerprint.slice(0, 8)}`,
      platform: 'guest',
    });
    const token = app.jwt.sign({ userId: user!.id }, { expiresIn: env.JWT_EXPIRES_IN });
    return reply.success({ token, user: pickUserBasicInfo(user!) });
  });

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as JwtPayload;
    return reply.success({ ...user });
  });
}
