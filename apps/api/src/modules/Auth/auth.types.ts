import { User } from '@zeroDraw/db';

export const pickUserBasicInfo = (user: User) => {
  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
  };
};

// JWT payload 类型
export interface JwtPayload {
  userId: number;
}

// 扩展 Fastify Request 类型，添加 user 属性
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload; // JWT 解码后的 payload
    user: JwtPayload; // request.user 的类型
  }
}
