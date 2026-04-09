import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  tagline: z.string().max(512).optional(),
});

export const updateBrandSchema = createBrandSchema.partial();

export const createBrandProductSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  packSize: z.string().max(100).optional(),
  unit: z.string().max(50).optional(),
  sku: z.string().max(100).optional(),
  categoryId: z.string().uuid().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateBrandProductSchema = createBrandProductSchema.partial();

export const listBrandsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export const reviewMappingSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  reviewNote: z.string().optional(),
});

export const runAutoMapSchema = z.object({
  brandMasterProductId: z.string().uuid(),
});
