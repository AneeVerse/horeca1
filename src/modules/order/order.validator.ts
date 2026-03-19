import { z } from 'zod';

export const createOrderSchema = z.object({
  vendorOrders: z.array(
    z.object({
      vendorId: z.string().uuid(),
      items: z.array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive(),
        })
      ).min(1),
      deliverySlotId: z.string().uuid().optional(),
      notes: z.string().optional(),
    })
  ).min(1),
  paymentMethod: z.string().min(1),
});

export const listOrdersSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  vendorId: z.string().uuid().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
});

export const saveAsListSchema = z.object({
  listName: z.string().min(1),
});
