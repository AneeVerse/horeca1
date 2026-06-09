// GET /api/v1/config/maps-key — runtime endpoint to get the Google Maps API key
// WHY: Client-side env variables (NEXT_PUBLIC_*) are statically inlined at build time.
//      For dynamic docker deployments, we must retrieve the key at runtime from the server env.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    return NextResponse.json(
      { success: false, error: 'Google Maps API key not configured on the server' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    apiKey,
  });
}
