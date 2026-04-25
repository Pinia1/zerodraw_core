import { env } from '../../config/env';
import { r2Service } from '../R2';
import { volcService } from './volc.services';

interface uploadServices {
  uploadFile: (buffer: Buffer, contentType: string) => Promise<string>;
}
const provider = env.NODE_ENV === 'development' ? 'volc' : env.UPLOAD_PROVIDER;
export const uploadServices: uploadServices = provider === 'r2' ? r2Service : volcService;
