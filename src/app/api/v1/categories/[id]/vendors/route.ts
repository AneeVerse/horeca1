// GET /api/v1/categories/:id/vendors — List vendors that sell products in this category
// WHY: When user clicks "Vegetables" category, they see all vendors selling vegetables
//      Can be filtered by pincode for location-based results
// PUBLIC: No login needed
// SUPPORTS: ?pincode=400001

import { NextRequest, NextResponse } from 'next/server';
import { CatalogService } from '@/modules/catalog/catalog.service';
import { errorResponse } from '@/middleware/errorHandler';

const catalogService = new CatalogService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: categoryId } = await params;
    const pincode = req.nextUrl.searchParams.get('pincode') || undefined;

    const vendors = await catalogService.getCategoryVendors(categoryId, pincode);
    return NextResponse.json({ success: true, data: vendors });
  } catch (error) {
    return errorResponse(error);
  }
}
