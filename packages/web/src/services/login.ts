import request from '.';

interface User {
  id: number;
  username: string;
  avatar: string;
  email: string;
  name: string;
  bio: string;
  blog: string;
}

export const getUserInfo = () => {
  return request.get('/api/user/info');
};

export const githubLogin = (code: string): Promise<{ token: string; user: User }> => {
  return request.get(`/github/login?code=${code}`);
};
