// GET /api/v1/collections — List curated product collections
// WHY: Homepage shows collections like "Weekend Specials", "Kitchen Essentials"
//      Each collection includes up to 10 products for preview
// PUBLIC: No login needed

import { NextResponse } from 'next/server';
import { CatalogService } from '@/modules/catalog/catalog.service';
import { errorResponse } from '@/middleware/errorHandler';

const catalogService = new CatalogService();

export async function GET() {
  try {
    const collections = await catalogService.getCollections();
    return NextResponse.json({ success: true, data: collections });
  } catch (error) {
    return errorResponse(error);
  }
}
