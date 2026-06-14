import { z } from 'zod';

// ─── Shared field schemas ────────────────────────────────────────────────

const couponCodeSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/, 'Code may only contain letters, numbers, - and _')
  .transform((c) => c.toUpperCase());

const discountTypeSchema = z.enum(['flat', 'percentage']);
const destinationSchema = z.enum(['wallet', 'upi']);

const isoDate = z.string().datetime();

// Percentage values must be ≤ 100; flat values just need to be positive.
const valueTypePair = (d: { discountType: 'flat' | 'percentage'; discountValue: number }) =>
  d.discountType !== 'percentage' || d.discountValue <= 100;

const dateWindow = (d: { startDate?: string | null; endDate?: string | null }) =>
  !d.startDate || !d.endDate || new Date(d.endDate) > new Date(d.startDate);

// ─── Coupons ─────────────────────────────────────────────────────────────

export const createCouponSchema = z
  .object({
    code: couponCodeSchema,
    name: z.string().min(1).max(120),
    description: z.string().max(2000).optional().nullable(),
    discountType: discountTypeSchema,
    discountValue: z.number().positive(),
    maxDiscount: z.number().positive().optional().nullable(),
    minOrderValue: z.number().min(0).optional().nullable(),
    startDate: isoDate.optional().nullable(),
    endDate: isoDate.optional().nullable(),
    usageLimit: z.number().int().min(1).optional().nullable(),
    perUserLimit: z.number().int().min(1).optional().nullable(),
    categoryIds: z.array(z.string().uuid()).max(100).optional(),
    productIds: z.array(z.string().uuid()).max(500).optional(),
    brandNames: z.array(z.string().min(1).max(150)).max(100).optional(),
    stacksWithVendorPromo: z.boolean().optional(),
    stacksWithCashback: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(valueTypePair, { message: 'Percentage discount cannot exceed 100', path: ['discountValue'] })
  .refine(dateWindow, { message: 'End date must be after start date', path: ['endDate'] });

// Code is immutable after creation — redemption history references it.
export const updateCouponSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional().nullable(),
    discountType: discountTypeSchema.optional(),
    discountValue: z.number().positive().optional(),
    maxDiscount: z.number().positive().optional().nullable(),
    minOrderValue: z.number().min(0).optional().nullable(),
    startDate: isoDate.optional().nullable(),
    endDate: isoDate.optional().nullable(),
    usageLimit: z.number().int().min(1).optional().nullable(),
    perUserLimit: z.number().int().min(1).optional().nullable(),
    categoryIds: z.array(z.string().uuid()).max(100).optional(),
    productIds: z.array(z.string().uuid()).max(500).optional(),
    brandNames: z.array(z.string().min(1).max(150)).max(100).optional(),
    stacksWithVendorPromo: z.boolean().optional(),
    stacksWithCashback: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(dateWindow, { message: 'End date must be after start date', path: ['endDate'] });

export const validateCouponSchema = z.object({
  code: couponCodeSchema,
});

// ─── Cashback campaigns ──────────────────────────────────────────────────

export const createCashbackCampaignSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(2000).optional().nullable(),
    cashbackType: discountTypeSchema,
    cashbackValue: z.number().positive(),
    maxCashback: z.number().positive().optional().nullable(),
    minOrderValue: z.number().min(0).optional().nullable(),
    destination: destinationSchema.optional(),
    startDate: isoDate.optional().nullable(),
    endDate: isoDate.optional().nullable(),
    perUserLimit: z.number().int().min(1).optional().nullable(),
    totalBudget: z.number().positive().optional().nullable(),
    stacksWithCoupon: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.cashbackType !== 'percentage' || d.cashbackValue <= 100, {
    message: 'Percentage cashback cannot exceed 100',
    path: ['cashbackValue'],
  })
  .refine(dateWindow, { message: 'End date must be after start date', path: ['endDate'] });

export const updateCashbackCampaignSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional().nullable(),
    cashbackType: discountTypeSchema.optional(),
    cashbackValue: z.number().positive().optional(),
    maxCashback: z.number().positive().optional().nullable(),
    minOrderValue: z.number().min(0).optional().nullable(),
    destination: destinationSchema.optional(),
    startDate: isoDate.optional().nullable(),
    endDate: isoDate.optional().nullable(),
    perUserLimit: z.number().int().min(1).optional().nullable(),
    totalBudget: z.number().positive().optional().nullable(),
    stacksWithCoupon: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(dateWindow, { message: 'End date must be after start date', path: ['endDate'] });

// ─── Cashback entries (payout queue / claims / grants) ───────────────────

// Standard UPI VPA shape: handle@psp
export const claimUpiSchema = z.object({
  upiId: z
    .string()
    .min(5)
    .max(100)
    .regex(/^[\w.\-]{2,}@[A-Za-z]{2,}$/, 'Enter a valid UPI ID, e.g. name@upi'),
});

export const markEntryPaidSchema = z.object({
  paidReference: z.string().min(1).max(100),
});

export const directGrantSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive().max(1_000_000),
  destination: destinationSchema,
  notes: z.string().max(500).optional().nullable(),
});

export const listEntriesQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'credited', 'paid', 'cancelled']).optional(),
  destination: destinationSchema.optional(),
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});
