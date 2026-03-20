// GET /api/v1/vendors — List all active, verified vendors
// WHY: Homepage "Vendors Near You" section, vendor browsing page, category-filtered vendor lists
// PUBLIC: Anyone can browse vendors (no login needed)
// SUPPORTS: ?pincode=400001&categoryId=xxx&sort=rating&order=desc&cursor=xxx&limit=20

import { NextRequest, NextResponse } from 'next/server';
import { VendorService } from '@/modules/vendor/vendor.service';
import { listVendorsSchema } from '@/modules/vendor/vendor.validator';
import { errorResponse } from '@/middleware/errorHandler';

const vendorService = new VendorService();

export async function GET(req: NextRequest) {
  try {
    // Parse query params from the URL (e.g., ?pincode=400001&limit=10)
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const input = listVendorsSchema.parse(params);

    const result = await vendorService.list(input);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
