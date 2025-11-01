import axios from 'axios';
import { NextFunction, Request, Response } from 'express';
import { User } from '../entities/UserEntities';
import { generateToken } from '../jwt';
import { successResponse } from '../middleware/error';
import { userRepository } from '../repository/UserRepository';
import { ApiError } from '../utils/ApiError';

interface GithubTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  scope: string;
}

interface GithubUser {
  id: number;
  login: string;
  avatar_url: string;
  email: string | undefined;
  name: string | undefined;
  bio: string | undefined;
  blog: string | undefined;
  location: string | undefined;
  public_repos: number;
  followers: number;
  following: number;
}

export const githubLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, code } = req.query;

    if (error) {
      throw ApiError.badRequest(`GitHub授权失败: ${error}`);
    }

    if (!code) {
      throw ApiError.badRequest('缺少授权码');
    }

    const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
    const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      console.error('GitHub OAuth credentials not configured');
      throw ApiError.internal('服务器配置错误');
    }

    // 1. 用授权码换取 access token
    const tokenResponse = await axios.post<GithubTokenResponse>(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      console.error('No access token received from GitHub');
      throw ApiError.unauthorized('获取访问令牌失败');
    }

    // 2. 用 token 获取用户信息
    const userResponse = await axios.get<GithubUser>('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const githubUser = userResponse.data;
    const userInfo = {
      githubId: githubUser.id,
      username: githubUser.login,
      avatar: githubUser.avatar_url,
      email: githubUser.email,
      name: githubUser.name,
      bio: githubUser.bio,
      blog: githubUser.blog,
      location: githubUser.location,
      publicRepos: githubUser.public_repos,
      followers: githubUser.followers,
      following: githubUser.following,
      githubAccessToken: accessToken,
    };

    // 3. 查找或创建用户
    let user = await userRepository.findOne({ where: { githubId: githubUser.id } });
    if (user) {
      Object.assign(user, userInfo);
      user = await userRepository.save(user as User);
    } else {
      user = userRepository.create(userInfo);
      user = await userRepository.save(user);
    }

    // 4. 生成 JWT token
    const token = generateToken({
      id: user.id,
    });

    return successResponse(res, { token, user }, '登录成功');
  } catch (error: any) {
    console.error('GitHub OAuth Error:', error.response?.data || error.message);

    // 处理 axios 错误
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return next(ApiError.unauthorized('授权码无效或已过期'));
      }
      if (error.response?.status === 403) {
        return next(ApiError.forbidden('GitHub API 访问被限制'));
      }
    }

    next(error);
  }
};
