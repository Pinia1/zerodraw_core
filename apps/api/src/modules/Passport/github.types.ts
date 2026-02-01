export interface GithubTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  scope: string;
}

export interface GithubUser {
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
