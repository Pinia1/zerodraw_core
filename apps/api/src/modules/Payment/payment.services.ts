import type { PlanKey } from '@zeroDraw/api-contract';
import { env } from '../../config/env';
import { BadRequestError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { getAlipayClient } from './alipayClient';
import { paymentRepository } from './payment.repository';

const PLAN_PRICE: Record<PlanKey, string> = {
  monthly: '29.00',
  quarterly: '69.00',
  yearly: '199.00',
  banana: '6.00',
};

const PLAN_SUBJECT: Record<PlanKey, string> = {
  monthly: 'zeroDraw 月度会员',
  quarterly: 'zeroDraw 季度会员',
  yearly: 'zeroDraw 年度会员',
  banana: '来一斤香蕉',
};

function generateOutTradeNo() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `ZD${ts}${rand}`.toUpperCase();
}

class PaymentService {
  async createOrder(userId: number, planKey: PlanKey) {
    const amount = PLAN_PRICE[planKey];
    if (!amount) throw new BadRequestError('无效的方案');

    const id = crypto.randomUUID();
    const outTradeNo = generateOutTradeNo();

    await paymentRepository.create({ id, userId, planKey, outTradeNo, amount });

    const payUrl = getAlipayClient().pageExec('alipay.trade.page.pay', {
      method: 'GET',
      bizContent: {
        out_trade_no: outTradeNo,
        total_amount: amount,
        subject: PLAN_SUBJECT[planKey],
        product_code: 'FAST_INSTANT_TRADE_PAY',
      },
      returnUrl: `${env.ALIPAY_NOTIFY_URL.replace('/api/payment/notify', '')}/payment/result?outTradeNo=${outTradeNo}`,
      notifyUrl: env.ALIPAY_NOTIFY_URL,
    });

    logger.info('Order created', { orderId: id, outTradeNo, planKey, amount });

    return { orderId: id, payUrl };
  }

  async handleNotify(params: Record<string, string>) {
    const verified = getAlipayClient().checkNotifySign(params);
    if (!verified) {
      logger.warn('Alipay notify sign verification failed', { outTradeNo: params.out_trade_no });
      return false;
    }

    const { out_trade_no, trade_no, trade_status } = params;

    const existing = await paymentRepository.findByOutTradeNo(out_trade_no);
    if (!existing) {
      logger.warn('Order not found for notify', { outTradeNo: out_trade_no });
      return false;
    }

    if (existing.status === 'paid') return true;

    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      await paymentRepository.updateStatus(out_trade_no, 'paid', trade_no);
      logger.info('Order paid', { outTradeNo: out_trade_no, tradeNo: trade_no });
      // TODO: 开通会员逻辑
    } else if (trade_status === 'TRADE_CLOSED') {
      await paymentRepository.updateStatus(out_trade_no, 'closed', trade_no);
      logger.info('Order closed', { outTradeNo: out_trade_no });
    }

    return true;
  }

  async getOrderByOutTradeNo(outTradeNo: string) {
    return paymentRepository.findByOutTradeNo(outTradeNo);
  }
}

export const paymentService = new PaymentService();
