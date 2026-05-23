// GET    /api/v1/cart — Get the active outlet's cart (vendor-grouped)
// POST   /api/v1/cart — Add an item to the active outlet's cart
// DELETE /api/v1/cart — Clear the active outlet's cart
// V2.2: Cart is scoped to (userId, businessAccountId, outletId). Switching
// account or outlet loads a different cart automatically.
// PROTECTED: Must be logged in

import { NextRequest, NextResponse } from 'next/server';
import { CartService, resolveCartContext } from '@/modules/cart/cart.service';
import { addToCartSchema } from '@/modules/cart/cart.validator';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

const cartService = new CartService();

export const GET = withAuth(async (_req, ctx) => {
  try {
    const cartCtx = resolveCartContext(ctx);
    const cart = await cartService.getCart(cartCtx);
    return NextResponse.json({ success: true, data: cart });
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const cartCtx = resolveCartContext(ctx);
    const body = await req.json();
    const { productId, vendorId, quantity } = addToCartSchema.parse(body);

    const item = await cartService.addItem(cartCtx, productId, vendorId, quantity);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = withAuth(async (_req, ctx) => {
  try {
    const cartCtx = resolveCartContext(ctx);
    await cartService.clearCart(cartCtx);
    return NextResponse.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    return errorResponse(error);
  }
});
