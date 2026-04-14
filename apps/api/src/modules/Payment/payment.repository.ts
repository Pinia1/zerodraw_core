import { eq, order, sql } from '@zeroDraw/db';
import { db } from '../../db';

class PaymentRepository {
  async create(data: { id: string; userId: number; planKey: string; outTradeNo: string; amount: string }) {
    await db.insert(order).values(data);
    return this.findByOutTradeNo(data.outTradeNo);
  }

  async findByOutTradeNo(outTradeNo: string) {
    const [row] = await db
      .select()
      .from(order)
      .where(eq(order.outTradeNo, outTradeNo))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string) {
    const [row] = await db.select().from(order).where(eq(order.id, id)).limit(1);
    return row ?? null;
  }

  async updateStatus(outTradeNo: string, status: string, tradeNo?: string) {
    const sets: Record<string, unknown> = { status };
    if (tradeNo) sets.tradeNo = tradeNo;
    if (status === 'paid') sets.paidAt = new Date();

    await db.update(order).set(sets).where(eq(order.outTradeNo, outTradeNo));
  }
}

export const paymentRepository = new PaymentRepository();
