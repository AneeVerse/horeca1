// POST   /api/v1/vendors/:id/follow — Follow/favorite a vendor
// DELETE /api/v1/vendors/:id/follow — Unfollow a vendor
// WHY: Customers can follow vendors to see them in "My Vendors" and get quick reorder access
// PROTECTED: Must be logged in as a customer

import { NextRequest, NextResponse } from 'next/server';
import { VendorService } from '@/modules/vendor/vendor.service';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

const vendorService = new VendorService();

export const POST = withAuth(async (
  _req: NextRequest,
  ctx,
) => {
  try {
    // We need to get the vendor ID from the URL path
    // withAuth gives us ctx but not route params, so we extract from URL
    const url = new URL(_req.url);
    const segments = url.pathname.split('/');
    // URL: /api/v1/vendors/{id}/follow → segments[4] is the vendor ID
    const vendorId = segments[4];

    await vendorService.follow(ctx.userId, vendorId);
    return NextResponse.json({ success: true, message: 'Vendor followed' });
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = withAuth(async (
  _req: NextRequest,
  ctx,
) => {
  try {
    const url = new URL(_req.url);
    const segments = url.pathname.split('/');
    const vendorId = segments[4];

    await vendorService.unfollow(ctx.userId, vendorId);
    return NextResponse.json({ success: true, message: 'Vendor unfollowed' });
  } catch (error) {
    return errorResponse(error);
  }
});
