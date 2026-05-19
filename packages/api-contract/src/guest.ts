import { z } from 'zod';

export const guestLoginSchema = z.object({
  fingerprint: z.string().min(1),
});

export type GuestLoginBody = z.infer<typeof guestLoginSchema>;
