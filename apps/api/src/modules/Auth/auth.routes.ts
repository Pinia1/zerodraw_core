import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { githubCallbackSchema, guestLoginSchema } from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { env } from '../../config/env';
import { fingerprintToInt } from '../../utils';
import { JwtPayload, pickUserBasicInfo } from './auth.types';

export async function authRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.get(
    '/github/callback',
    { schema: { querystring: githubCallbackSchema } },
    async (request, reply) => {
      if (!fastify.githubService) {
        return reply.status(503).send({ success: false, message: 'GitHub OAuth is not configured' });
      }
      const { code } = request.query;

      const { access_token } = await fastify.githubService.getAccessToken(code);
      const userInfo = await fastify.githubService.getUserInfo(access_token);
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

      const user = await fastify.authService.findOrCreateUser({
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
    },
  );

  app.post('/guest', { schema: { body: guestLoginSchema } }, async (request, reply) => {
    const { fingerprint } = request.body;
    const userId = fingerprintToInt(fingerprint);
    const user = await fastify.authService.findOrCreateUser({
      userId,
      username: `guest_${fingerprint.slice(0, 8)}`,
      platform: 'guest',
    });
    const token = app.jwt.sign({ userId: user!.id }, { expiresIn: env.JWT_EXPIRES_IN });
    return reply.success({ token, user: pickUserBasicInfo(user!) });
  });

  app.get('/me', { preHandler: fastify.authenticate }, async (request, reply) => {
    const user = request.user as JwtPayload;
    return reply.success({ ...user });
  });
}
