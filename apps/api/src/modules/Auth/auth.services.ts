import { NewUser } from '@zeroDraw/db';
import { logger } from '../../utils/logger';
import { authRepo } from './auth.repository';

class AuthService {
  async findOrCreateUser(userData: NewUser) {
    const existing = await authRepository.findByPlatformUserId(userData.userId!, userData.platform);

    if (existing) {
      const updated = await authRepository.updateById(existing.id, userData);
      logger.info(`User ${existing.username} updated`, {
        userId: updated?.id,
        platform: updated?.platform,
      });
      return updated;
    }

    const created = await authRepository.create(userData);
    logger.info(`User ${created?.username} created`, {
      userId: created?.id,
      platform: created?.platform,
    });
    return created;
  }
}

export const authService = new AuthService();
