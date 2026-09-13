import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.services';

export function createAuthModule() {
  const authRepository = new AuthRepository();
  const authService = new AuthService(authRepository);
  return { authRepository, authService };
}
