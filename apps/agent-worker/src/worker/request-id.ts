import { randomUUID } from 'node:crypto';

export function createWorkerRequestId(): string {
  return randomUUID();
}
