import axios from 'axios';
import { Request, Response } from 'express';
import { User } from '../entities/UserEntities';
import { generateToken } from '../jwt';
import { userRepository } from '../repository/UserRepository';

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

export const githubLogin = async (req: Request, res: Response) => {
  const { error, code } = req.query;

  if (error) {
    return res.status(400).json(error);
  }

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.error('GitHub OAuth credentials not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  try {
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
      return res.status(401).json({ error: 'Failed to get access token' });
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

    let user = await userRepository.findOne({ where: { githubId: githubUser.id } });
    if (user) {
      Object.assign(user, userInfo);
      user = await userRepository.save(user as User);
    } else {
      user = userRepository.create(userInfo);
      user = await userRepository.save(user);
    }

    const token = generateToken({
      id: user.id,
    });

    res.send({
      success: true,
      token: token,
      user: user,
    });
  } catch (error: any) {
    console.error('GitHub OAuth Error:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      return res.status(401).json({
        error: 'Invalid authorization code',
        details: error.response?.data,
      });
    }

    res.status(500).json({
      error: 'Authentication failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
