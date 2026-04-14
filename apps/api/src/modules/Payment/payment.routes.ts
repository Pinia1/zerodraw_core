import { createOrderSchema } from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { createSuccessResponse } from '../../types/response';
import { QueryValidation } from '../../utils/schame';
import { authenticate } from '../Auth/auth.middleware';
import { paymentService } from './payment.services';

export async function paymentRoutes(app: FastifyInstance) {
  /** 创建订单 */
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const body = QueryValidation(createOrderSchema, request.body);
    const userId = request.user.userId;

    const data = await paymentService.createOrder(userId, body.planKey);
    return reply.status(201).send(createSuccessResponse(data));
  });

  /** 支付宝同步回调 — 跳转前端结果页 */
  app.get('/return', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const outTradeNo = query.out_trade_no || '';
    return reply.redirect(`/payment/result?outTradeNo=${outTradeNo}`);
  });

  /** 查询订单状态 */
  app.get('/status', { preHandler: authenticate }, async (request, reply) => {
    const { outTradeNo } = request.query as { outTradeNo: string };
    const order = await paymentService.getOrderByOutTradeNo(outTradeNo);
    return reply.send(createSuccessResponse(order));
  });

  /** 支付宝异步通知 — 不需要登录鉴权，由支付宝服务端调用 */
  app.post('/notify', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const params = request.body as Record<string, string>;
    const success = await paymentService.handleNotify(params);
    reply.type('text/plain').send(success ? 'success' : 'fail');
  });
}
