import { z } from 'zod';

export const listVendorsSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/).optional(),
  categoryId: z.string().uuid().optional(),
  sort: z.enum(['rating', 'name', 'min_order_value']).default('rating'),
  order: z.enum(['asc', 'desc']).default('desc'),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createVendorSchema = z.object({
  userId: z.string().uuid(),
  businessName: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  minOrderValue: z.number().min(0).default(0),
});

export const updateVendorSchema = z.object({
  businessName: z.string().min(2).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  minOrderValue: z.number().min(0).optional(),
  creditEnabled: z.boolean().optional(),
});
