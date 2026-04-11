import { and, eq, NewUser, user } from '@zeroDraw/db';
import { db } from '../../db';

class AuthRepository {
  async findByPlatformUserId(userId: number, platform: string) {
    const [row] = await db
      .select()
      .from(user)
      .where(and(eq(user.userId, userId), eq(user.platform, platform)))
      .limit(1);
    return row ?? null;
  }

  async findById(id: number) {
    const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1);
    return row ?? null;
  }

  async create(data: NewUser) {
    await db.insert(user).values(data);
    return this.findByPlatformUserId(data.userId!, data.platform);
  }

  async updateById(id: number, data: Partial<NewUser>) {
    await db.update(user).set(data).where(eq(user.id, id));
    return this.findById(id);
  }
}

export const authRepository = new AuthRepository();
