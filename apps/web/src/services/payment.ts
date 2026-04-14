import type { CreateOrderInput, CreateOrderResponse } from '@zeroDraw/api-contract';
import request from '.';

export const httpCreateOrder = (data: CreateOrderInput): Promise<CreateOrderResponse> =>
  request.post('/api/payment', data);

export const httpGetOrderStatus = (outTradeNo: string): Promise<any> =>
  request.get('/api/payment/status', { params: { outTradeNo } });
