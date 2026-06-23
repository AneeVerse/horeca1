import { z } from 'zod';

export const listVendorsSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/).optional(),
  categoryId: z.string().uuid().optional(),
  sort: z.enum(['rating', 'name', 'min_order_value', 'frequent']).default('rating'),
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

const optionalUrlSchema = z.string()
  .optional()
  .nullable()
  .or(z.literal(''))
  .refine(
    (val) => !val || val.startsWith('/') || /^(https?:\/\/)/.test(val),
    { message: 'Invalid URL format' }
  );

export const updateVendorSchema = z.object({
  businessName: z.string().min(2).optional(),
  description: z.string().optional(),
  logoUrl: optionalUrlSchema,
  bannerUrl: optionalUrlSchema,
  minOrderValue: z.number().min(0).optional(),
  creditEnabled: z.boolean().optional(),
});
