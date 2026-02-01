import { eq, user } from '@zeroDraw/db';
import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../../db';
import { UnauthorizedError } from '../../utils/errors';
import { JwtPayload } from './auth.types';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    const [foundUser] = await db.select().from(user).where(eq(user.id, decoded.userId));
    if (!foundUser) {
      throw new UnauthorizedError('User not found');
    }

    request.user = foundUser;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
