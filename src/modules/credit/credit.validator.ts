import { z } from 'zod';

export const applyCreditSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
});

export const signupCreditSchema = z.object({
  vendorId: z.string().uuid(),
  requestedLimit: z.number().positive(),
});

export const approveCreditSchema = z.object({
  creditLimit: z.number().positive(),
});
