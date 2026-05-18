import { z } from 'zod';

export const createListSchema = z.object({
  name: z.string().min(1),
  vendorId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        defaultQty: z.number().int().positive(),
        // Optional — falls back to the list's vendorId. Lets a multi-vendor list
        // store items from different vendors in a single create call.
        vendorId: z.string().uuid().optional(),
      })
    )
    .optional(),
});

export const addListItemSchema = z.object({
  productId: z.string().uuid(),
  vendorId: z.string().uuid(),
  defaultQty: z.number().int().positive().default(1),
});

export const orderFromListSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
});
