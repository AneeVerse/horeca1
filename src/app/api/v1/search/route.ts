// GET /api/v1/search?q=onion&pincode=400001 — Search products, vendors, and categories
// WHY: Powers the search overlay in the navbar — user types "paneer" and gets:
//      1. Matching products (with prices + stock)
//      2. Matching vendors
//      3. Matching categories
//      This 3-block response lets the frontend show a rich search results page
// PUBLIC: No login needed

import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/modules/catalog/search.service';
import { searchProductsSchema } from '@/modules/catalog/catalog.validator';
import { errorResponse } from '@/middleware/errorHandler';

const searchService = new SearchService();

export async function GET(req: NextRequest) {
  try {
    const queryParams = Object.fromEntries(req.nextUrl.searchParams);
    const { q, pincode, cursor, limit } = searchProductsSchema.parse(queryParams);

    const result = await searchService.search(q, pincode, cursor, limit);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
