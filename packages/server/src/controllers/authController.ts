import axios from 'axios';
import { Request, Response } from 'express';

interface GithubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GithubUser {
  id: number;
  login: string;
  avatar_url: string;
  email: string | null;
  name: string | null;
  bio: string | null;
  blog: string | null;
  location: string | null;
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
    console.log('Exchanging code for access token...');

    // 1. 用 code 换取 access_token
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

    console.log('Access token received, fetching user info...');

    // 2. 用 token 获取用户信息
    const userResponse = await axios.get<GithubUser>('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const githubUser = userResponse.data;

    console.log(`User authenticated: ${githubUser.login}`);

    // 3. 构造返回的用户信息
    const user = {
      id: githubUser.id,
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
    };

    // 4. 返回结果
    // 注意：实际生产环境中，应该生成自己的 JWT token
    res.json({
      success: true,
      token: accessToken, // 在生产环境中应该生成自己的 JWT
      user,
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
