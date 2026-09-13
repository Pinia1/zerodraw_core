import { NewUser } from '@zeroDraw/db';
import { logger } from '../../utils/logger';
import type { AuthRepository } from './auth.repository';

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async findOrCreateUser(userData: NewUser) {
    const existing = await this.authRepository.findByPlatformUserId(
      userData.userId!,
      userData.platform,
    );

    if (existing) {
      const updated = await this.authRepository.updateById(existing.id, userData);
      logger.info(`User ${existing.username} updated`, {
        userId: updated?.id,
        platform: updated?.platform,
      });
      return updated;
    }

    const created = await this.authRepository.create(userData);
    logger.info(`User ${created?.username} created`, {
      userId: created?.id,
      platform: created?.platform,
    });
    return created;
  }
}
