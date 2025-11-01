import { User } from '../entities/UserEntities';
import { userRepository } from '../repository/UserRepository';

export class UserService {
  // 根据 ID 获取用户信息
  async getUserById(userId: number): Promise<User | null> {
    const user = await userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        name: true,
        bio: true,
        blog: true,
        location: true,
        publicRepos: true,
        followers: true,
        following: true,
        viewNum: true,
        createdAt: true,
      },
    });

    return user;
  }

  // 增加浏览次数
  async incrementViewCount(userId: number): Promise<void> {
    await userRepository.increment({ id: userId }, 'viewNum', 1);
  }
}

export const userService = new UserService();
