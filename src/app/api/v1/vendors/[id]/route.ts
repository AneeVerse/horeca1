// GET /api/v1/vendors/:id — Get single vendor details
// WHY: When user clicks on a vendor card, we load the full vendor profile
//      (including service areas and delivery slots)
// PUBLIC: Anyone can view vendor details

import { NextRequest, NextResponse } from 'next/server';
import { VendorService } from '@/modules/vendor/vendor.service';
import { errorResponse } from '@/middleware/errorHandler';

const vendorService = new VendorService();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = await vendorService.getById(id);
    return NextResponse.json({ success: true, data: vendor });
  } catch (error) {
    return errorResponse(error);
  }
}
