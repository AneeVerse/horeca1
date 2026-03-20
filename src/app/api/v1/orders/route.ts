// GET  /api/v1/orders — List the current user's orders
// POST /api/v1/orders — Create new purchase order(s) from cart
// WHY: GET powers the "My Orders" page (order history)
//      POST is the checkout action — the most critical endpoint in the entire app
//      It runs inside a database transaction:
//        1. Check stock availability
//        2. Verify vendor minimum order value (MOV)
//        3. Calculate bulk pricing for each item
//        4. Create order + order items
//        5. Reserve inventory (so another customer can't buy the same stock)
//        6. Clear the cart
//      If ANY step fails, everything rolls back (nothing is half-created)
// PROTECTED: Must be logged in
// SUPPORTS: ?status=pending&vendorId=xxx&cursor=xxx&limit=20

import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/modules/order/order.service';
import { createOrderSchema, listOrdersSchema } from '@/modules/order/order.validator';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

const orderService = new OrderService();

// GET — list orders with optional filters
export const GET = withAuth(async (req: NextRequest, ctx) => {
  try {
    const queryParams = Object.fromEntries(req.nextUrl.searchParams);
    const options = listOrdersSchema.parse(queryParams);

    const result = await orderService.list(ctx.userId, options);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
});

// POST — create purchase order (the checkout action)
export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const input = createOrderSchema.parse(body);

    const result = await orderService.create(ctx.userId, input);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
