import { LibRepository } from './lib.repository';
import { LibService } from './lib.services';

export function createLibModule() {
  const libRepository = new LibRepository();
  const libService = new LibService(libRepository);
  return { libRepository, libService };
}
