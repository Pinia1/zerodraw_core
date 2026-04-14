import { z } from 'zod';

export const planKeys = ['monthly', 'quarterly', 'yearly', 'banana'] as const;
export type PlanKey = (typeof planKeys)[number];

export const createOrderSchema = z.object({
  planKey: z.enum(planKeys),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export interface CreateOrderResponse {
  orderId: string;
  payUrl: string;
}

export interface OrderItem {
  id: string;
  planKey: PlanKey;
  outTradeNo: string;
  amount: string;
  status: string;
  createdAt: number;
  paidAt: number | null;
}
