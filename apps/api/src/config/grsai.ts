import { env } from './env';

/** Grsai 主机（与生图 NanoBanana 一致：开发走国内节点，生产走全球节点）。 */
export function getGrsaiHost(): string {
  return env.NODE_ENV === 'development' ? 'https://grsai.dakka.com.cn' : 'https://grsaiapi.com';
}

/** OpenAI 兼容 chat/completions 的 baseUrl（pi-ai openai-completions）。 */
export function getGrsaiChatBaseUrl(): string {
  return `${getGrsaiHost()}/v1`;
}
