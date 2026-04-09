// GET /api/v1/brands — List all approved brands
// PUBLIC: No auth required
// SUPPORTS: ?limit=20&cursor=uuid

import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/modules/brand/brand.service';
import { listBrandsSchema } from '@/modules/brand/brand.validator';
import { errorResponse } from '@/middleware/errorHandler';

const brandService = new BrandService();

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const input = listBrandsSchema.parse(params);
    const result = await brandService.list(input);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
