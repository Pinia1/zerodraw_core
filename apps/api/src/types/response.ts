import { ResponseCode, ResponseMessage } from '@zeroDraw/api-contract';

export { ResponseCode, ResponseMessage };

export const createErrorResponse = (code: number, message: string) => {
  return {
    code,
    message,
  };
};

export const createSuccessResponse = (data: any) => {
  return {
    code: ResponseCode.SUCCESS,
    message: 'success',
    data,
  };
};
