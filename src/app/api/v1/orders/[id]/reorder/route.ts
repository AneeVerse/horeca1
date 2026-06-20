// POST /api/v1/orders/:id/reorder — Repeat a past order (Phase 5)
// WHY: Procurement is repetitive. One tap re-adds a past order's exact items
//      to the active outlet cart at CURRENT prices (honouring pricelist
//      assignments + slabs via the resolver), reporting anything that can no
//      longer be bought so nothing is silently dropped.
// PROTECTED: Must be logged in; the order must belong to the caller.

import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/modules/order/order.service';
import { resolveCartContext } from '@/modules/cart/cart.service';
import { withAuth } from '@/middleware/auth';
import { requireStorefrontAccess } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';

const orderService = new OrderService();

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    // Vendor/brand team members buying through the storefront need the same
    // explicit permission the cart POST requires; customers (legacy role or
    // active customer account) and admins are free.
    requireStorefrontAccess(ctx, 'storefront.order');

    const cartCtx = await resolveCartContext(ctx);
    const segments = new URL(req.url).pathname.split('/').filter(Boolean);
    // .../orders/<id>/reorder → id is second-to-last
    const orderId = segments[segments.length - 2];

    const result = await orderService.reorder(orderId, cartCtx);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
});
