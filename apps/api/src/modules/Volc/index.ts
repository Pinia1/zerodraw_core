import { env } from '../../config/env';
import { r2Service } from '../R2';
import { volcService } from './volc.services';

interface uploadServices {
  uploadFile: (buffer: Buffer, contentType: string) => Promise<string>;
}
export const uploadServices: uploadServices =
  env.NODE_ENV === 'development' ? volcService : r2Service;
