import { and, eq, NewUser, user } from '@zeroDraw/db';
import { db } from '../../db';
import { logger } from '../../utils/logger';

class AuthService {
  async findOrCreateUser(userData: NewUser) {
    const [existingUser] = await db
      .select()
      .from(user)
      .where(and(eq(user.userId, userData.userId!), eq(user.platform, userData.platform)))
      .limit(1);
    if (existingUser) {
      await db.update(user).set(userData).where(eq(user.id, existingUser.id));

      const [updatedUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, existingUser.id))
        .limit(1);

      logger.info(`User ${existingUser.username} updated`, {
        userId: updatedUser?.id,
        platform: updatedUser?.platform,
      });

      return updatedUser;
    }

    await db.insert(user).values(userData);
    const [createdUser] = await db
      .select()
      .from(user)
      .where(and(eq(user.userId, userData.userId!), eq(user.platform, userData.platform)))
      .limit(1);

    logger.info(`User ${createdUser?.username} created`, {
      userId: createdUser?.id,
      platform: createdUser?.platform,
    });
    return createdUser;
  }
}

export const authService = new AuthService();
