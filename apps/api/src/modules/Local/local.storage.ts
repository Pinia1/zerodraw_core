import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../config/env';

export class LocalStorageService {
  private readonly dir: string;

  constructor() {
    this.dir = path.resolve(env.LOCAL_UPLOAD_DIR);
    fs.mkdirSync(this.dir, { recursive: true });
  }

  generateObjectKey() {
    return randomUUID().replace(/-/g, '');
  }

  resolvePath(key: string) {
    return path.join(this.dir, key);
  }

  async uploadFile(buffer: Buffer, _mimetype?: string) {
    const key = this.generateObjectKey();
    fs.writeFileSync(this.resolvePath(key), buffer);
    return key;
  }

  async getFileBuffer(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const filePath = this.resolvePath(key);
    return {
      buffer: fs.readFileSync(filePath),
      mimeType: 'application/octet-stream',
    };
  }

  getPublicPath(key: string) {
    return `/api/file/local/${key}`;
  }
}
