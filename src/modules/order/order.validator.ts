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
      notes: z.string().max(1000).optional(),
    })
  ).min(1),
  paymentMethod: z.string().min(1),
  // Draft PO (Req 7): persist without reserving stock / charging credit /
  // clearing the cart. Submitted later via PATCH /orders/:id/submit.
  saveDraft: z.boolean().optional(),
});

// Ops controls (Req 7) — admin order management.
export const modifyQuantitiesSchema = z.object({
  lines: z.array(z.object({
    itemId: z.string().uuid(),
    quantity: z.number().int().min(0),  // 0 removes the line
  })).min(1),
});

export const splitOrderSchema = z.object({
  lines: z.array(z.object({
    itemId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
});

export const reassignVendorSchema = z.object({
  newVendorId: z.string().uuid(),
});

export const listOrdersSchema = z.object({
  status: z.enum(['draft', 'pending', 'confirmed', 'processing', 'ready_for_dispatch', 'shipped', 'partially_delivered', 'delivered', 'returned', 'cancelled']).optional(),
  vendorId: z.string().uuid().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Statuses a vendor/admin can move an order INTO via the status endpoint.
// 'draft' and 'pending' are entry states (set by save-draft / submit), never
// a transition target here.
export const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'processing', 'ready_for_dispatch', 'shipped', 'partially_delivered', 'delivered', 'returned', 'cancelled']),
  reason: z.string().min(1).max(500).optional(),
  proof: z.object({
    proofType: z.enum(['otp', 'photo', 'signature', 'notes', 'none']).optional(),
    proofUrl: z.string().url().optional().nullable(),
    notes: z.string().max(500).optional(),
    // V2.2 Phase 5 — the 4-digit code the customer reads out, checked
    // against the OTP issued for this order when proofType='otp'.
    otp: z.string().regex(/^\d{4}$/).optional(),
  }).optional(),
}).refine(
  (d) => d.status !== 'cancelled' || (d.reason && d.reason.trim().length > 0),
  { message: 'A reason is required when cancelling an order', path: ['reason'] },
);

export const partialAcceptSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().uuid(),
    fulfilledQty: z.number().int().min(0),
  })).min(1, 'At least one item line is required'),
});

export const saveAsListSchema = z.object({
  listName: z.string().min(1),
});

export const ewayBillSchema = z.object({
  ewayBillNo: z.string().min(1).max(30),
});

// V2.2 Phase 5 — vendor reschedules an in-flight order. At least one of the
// two fields must be present; either may be explicitly null to clear it.
export const updateDeliverySchema = z.object({
  deliverySlotId: z.string().uuid().nullable().optional(),
  deliveryDate: z.string().datetime().nullable().optional(),
}).refine(
  (d) => d.deliverySlotId !== undefined || d.deliveryDate !== undefined,
  { message: 'Provide deliverySlotId and/or deliveryDate' },
);
