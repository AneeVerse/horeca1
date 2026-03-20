// PATCH  /api/v1/cart/items/:id — Update quantity of a cart item
// DELETE /api/v1/cart/items/:id — Remove a specific item from cart
// WHY: User clicks +/- buttons on cart page to change quantity, or clicks X to remove
//      When quantity changes, the bulk price tier is recalculated automatically
//      (e.g., buying 10+ units might unlock a 5% discount)
// PROTECTED: Must be logged in

import { NextRequest, NextResponse } from 'next/server';
import { CartService } from '@/modules/cart/cart.service';
import { updateCartItemSchema } from '@/modules/cart/cart.validator';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

const cartService = new CartService();

// PATCH — update item quantity (recalculates bulk pricing)
export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const itemId = segments[segments.length - 1]; // last segment is the item ID

    const body = await req.json();
    const { quantity } = updateCartItemSchema.parse(body);

    const item = await cartService.updateQuantity(ctx.userId, itemId, quantity);
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return errorResponse(error);
  }
});

// DELETE — remove item from cart
export const DELETE = withAuth(async (req: NextRequest, ctx) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const itemId = segments[segments.length - 1];

    await cartService.removeItem(ctx.userId, itemId);
    return NextResponse.json({ success: true, message: 'Item removed' });
  } catch (error) {
    return errorResponse(error);
  }
});
