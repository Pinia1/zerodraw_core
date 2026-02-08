import { env } from '../../config/env';
import { InternalServerError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { GithubTokenResponse, GithubUser } from './github.types';

export class GithubService {
  private readonly clientId: string = env.GITHUB_CLIENT_ID;
  private readonly clientSecret: string = env.GITHUB_CLIENT_SECRET;

  async getAccessToken(code: string): Promise<GithubTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
    });

    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      logger.info('GitHub response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('GitHub API returned error status', null, {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new InternalServerError(`GitHub API error: ${response.status}`);
      }

      const data = (await response.json()) as GithubTokenResponse;

      if (!data.access_token) {
        logger.error('No access_token in response', null, { response: data });
        throw new InternalServerError(`github access token error":${JSON.stringify(data)}`);
      }

      logger.info('GitHub access token obtained successfully');
      return data;
    } catch (error) {
      logger.error('Failed to get GitHub access token', null, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerError(`github access token error:${JSON.stringify(error)}`);
    }
  }

  async getUserInfo(accessToken: string): Promise<GithubUser> {
    const url = 'https://api.github.com/user';

    logger.info('Requesting GitHub user info', {
      url,
      hasToken: !!accessToken,
      tokenLength: accessToken.length,
    });

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'User-Agent': 'zeroDraw-App',
        },
      });

      logger.info('GitHub user info response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('GitHub user API returned error status', null, {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new InternalServerError(`GitHub user API error: ${response.status}`);
      }

      const data = (await response.json()) as GithubUser;

      logger.info('GitHub user info parsed', {
        userId: data.id,
        login: data.login,
        hasEmail: !!data.email,
        hasAvatar: !!data.avatar_url,
      });

      if (!data.id || !data.login) {
        logger.error('Invalid user data received', null, { data });
        throw new InternalServerError('Invalid GitHub user data');
      }

      logger.info('GitHub user info obtained successfully', {
        userId: data.id,
        username: data.login,
      });

      return data;
    } catch (error) {
      logger.error('Failed to get GitHub user info', null, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerError('github user info error');
    }
  }
}

export const githubService = new GithubService();
