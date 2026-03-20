// GET /api/v1/vendors/serviceability?pincode=400001 — Check if any vendor delivers to a pincode
// WHY: When user enters their pincode, we check if delivery is available in their area
//      This is shown in the location/pincode overlay on the homepage
// PUBLIC: No login needed

import { NextRequest, NextResponse } from 'next/server';
import { VendorService } from '@/modules/vendor/vendor.service';
import { errorResponse } from '@/middleware/errorHandler';

const vendorService = new VendorService();

export async function GET(req: NextRequest) {
  try {
    const pincode = req.nextUrl.searchParams.get('pincode');
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid 6-digit pincode required' } },
        { status: 400 }
      );
    }

    const result = await vendorService.checkServiceability(pincode);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
