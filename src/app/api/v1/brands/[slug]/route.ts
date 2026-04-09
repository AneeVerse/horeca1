// GET /api/v1/brands/[slug] — Brand store page data
// PUBLIC: No auth required
// Returns: brand info + canonical products + distributor availability

import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/modules/brand/brand.service';
import { errorResponse } from '@/middleware/errorHandler';

const brandService = new BrandService();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const result = await brandService.getStoreBySlug(slug);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
