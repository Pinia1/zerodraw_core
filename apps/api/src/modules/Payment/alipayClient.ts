import { AlipaySdk } from 'alipay-sdk';
import { env } from '../../config/env';

let _client: AlipaySdk | null = null;

export function getAlipayClient(): AlipaySdk {
  if (!_client) {
    if (!env.ALIPAY_APP_ID) {
      throw new Error('ALIPAY_APP_ID is not configured');
    }
    _client = new AlipaySdk({
      appId: env.ALIPAY_APP_ID,
      privateKey: env.ALIPAY_PRIVATE_KEY,
      alipayPublicKey: env.ALIPAY_PUBLIC_KEY,
      signType: 'RSA2',
    });
  }
  return _client;
}
