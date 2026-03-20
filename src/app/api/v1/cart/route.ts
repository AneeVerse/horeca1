// GET    /api/v1/cart — Get the current user's cart (vendor-grouped)
// POST   /api/v1/cart — Add an item to cart
// DELETE /api/v1/cart — Clear the entire cart
// WHY: Server-side cart ensures cart data survives across devices and doesn't get lost
//      Cart is vendor-grouped: items from Vendor A and Vendor B show as separate groups
//      Each group shows if it meets the vendor's Minimum Order Value (MOV)
// PROTECTED: Must be logged in

import { NextRequest, NextResponse } from 'next/server';
import { CartService } from '@/modules/cart/cart.service';
import { addToCartSchema } from '@/modules/cart/cart.validator';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

const cartService = new CartService();

// GET — fetch cart with vendor groups, subtotals, and MOV checks
export const GET = withAuth(async (_req, ctx) => {
  try {
    const cart = await cartService.getCart(ctx.userId);
    return NextResponse.json({ success: true, data: cart });
  } catch (error) {
    return errorResponse(error);
  }
});

// POST — add product to cart (or update quantity if already in cart)
export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const { productId, vendorId, quantity } = addToCartSchema.parse(body);

    const item = await cartService.addItem(ctx.userId, productId, vendorId, quantity);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});

// DELETE — clear all items from cart
export const DELETE = withAuth(async (_req, ctx) => {
  try {
    await cartService.clearCart(ctx.userId);
    return NextResponse.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    return errorResponse(error);
  }
});
