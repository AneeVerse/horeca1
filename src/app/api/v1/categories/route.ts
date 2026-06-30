// GET /api/v1/categories — List all product categories
// WHY: Homepage category grid, sidebar filters, and category browsing pages need this
//      Returns hierarchical categories (parent + children) sorted by display order
// PUBLIC: No login needed
// SUPPORTS: ?parentId=xxx (to get subcategories of a specific parent)

import { NextRequest, NextResponse } from 'next/server';
import { CatalogService, resolveCategoriesForPicker } from '@/modules/catalog/catalog.service';
import { errorResponse } from '@/middleware/errorHandler';

const catalogService = new CatalogService();

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const resolveIds = params
      .get('resolveIds')
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (resolveIds && resolveIds.length > 0) {
      const data = await resolveCategoriesForPicker(resolveIds);
      return NextResponse.json({ success: true, data });
    }

    const parentId = params.get('parentId') || undefined;
    const categories = await catalogService.getCategories(parentId);
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    return errorResponse(error);
  }
}
