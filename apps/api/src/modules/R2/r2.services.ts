import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env';

class R2Service {
  private readonly BUCKET = 'zerodraw';
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.CLOUDFLARE_ACCESS_KEY_ID,
        secretAccessKey: env.CLOUDFLARE_SECRET_ACCESS_KEY,
      },
    });
  }

  generateObjectKey() {
    return `$${randomUUID().replace(/-/g, '')}`;
  }

  async uploadFile(buffer: Buffer, contentType: string) {
    const key = this.generateObjectKey();
    await this.client.send(new PutObjectCommand({
      Bucket: this.BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return key;
  }

  async getPresignedUploadUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: this.BUCKET,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: 300 });
  }
}

export const r2Service = new R2Service();
