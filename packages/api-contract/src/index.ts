export * from './generate';
export * from './github';
export * from './guest';
export * from './lib';
export * from './nanobanana';

export * from './seedream';
export * from './project';
export * from './assets';

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

export interface ApiError {
  code: number;
  message: string;
}

export const ResponseCode = {
  SUCCESS: 1000,
  BAD_REQUEST: 4000,
  UNAUTHORIZED: 4001,
  FORBIDDEN: 4003,
  NOT_FOUND: 4004,
  INTERNAL_SERVER_ERROR: 5000,
} as const;

export type ResponseCodeType = (typeof ResponseCode)[keyof typeof ResponseCode];

export const ResponseMessage = {
  SUCCESS: '请求成功',
  BAD_REQUEST: '请求参数错误',
  UNAUTHORIZED: '未授权',
  FORBIDDEN: '禁止访问',
  NOT_FOUND: '资源不存在',
  INTERNAL_SERVER_ERROR: '服务器内部错误',
} as const;
