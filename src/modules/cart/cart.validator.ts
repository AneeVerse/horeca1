import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  vendorId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});
