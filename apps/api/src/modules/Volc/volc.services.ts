import { TosClient } from '@volcengine/tos-sdk';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env';
import { InternalServerError } from '../../utils/errors';

class VolcService {
  private readonly BUCKET_NAME = env.BUCKET_NAME;
  private readonly REGION = env.REGION;
  private readonly ENDPOINT = `tos-${this.REGION}.volces.com`;
  private client: TosClient;

  constructor() {
    this.client = new TosClient({
      accessKeyId: env.TOS_ACCESS_KEY,
      accessKeySecret: env.TOS_SECRET_KEY,
      region: this.REGION,
      endpoint: this.ENDPOINT,
    });
  }

  /**
   * 获取带签名的临时访问 URL
   * @param key 对象 key
   * @param options.expires 签名有效期（秒），默认 3600（1小时）
   * @param options.process 图片处理参数，例如 'image/resize,w_400'
   */
  getSignedUrl(key: string, options?: { expires?: number; process?: string }) {
    const { expires = 3600, process } = options ?? {};

    return this.client.getPreSignedUrl({
      bucket: this.BUCKET_NAME,
      key,
      expires,
      query: {
        ...(process ? { 'x-tos-process': process + '/format,webp' } : {}),
        'response-content-disposition': 'inline',
      },
    });
  }

  /**
   * 从 TOS 获取文件流
   * @param key 对象 key
   * @param process 图片处理参数，例如 'image/resize,w_400'
   */
  async getFileStream(key: string, process?: string) {
    try {
      const res = await this.client.getObjectV2({
        bucket: this.BUCKET_NAME,
        key,
        dataType: 'stream',
        process,
      });

      return {
        stream: res.data.content as NodeJS.ReadableStream,
        headers: res.headers,
      };
    } catch (error) {
      throw new InternalServerError();
    }
  }

  generateObjectKey() {
    return randomUUID().replace(/-/g, '');
  }

  /**
   * 上传文件到 TOS
   * @param buffer 文件内容
   * @param filename 原始文件名
   * @param mimetype 文件 MIME 类型
   * @returns 文件的对象 key
   */
  async uploadFile(buffer: Buffer, mimetype?: string) {
    const key = this.generateObjectKey();

    try {
      await this.client.putObject({
        bucket: this.BUCKET_NAME,
        key,
        body: buffer,
        contentType: mimetype,
        contentDisposition: 'inline',
      });

      return key;
    } catch (error) {
      console.log(error, 'errorrrr');

      throw new InternalServerError();
    }
  }
}

export const volcService = new VolcService();
