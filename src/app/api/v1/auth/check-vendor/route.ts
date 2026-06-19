// POST /api/v1/auth/check-vendor
// Backward-compatible wrapper around check-phone for vendor intent.

import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/middleware/withRateLimit';
import { lookupPhoneForRegistration } from '@/lib/auth/checkPhoneLookup';

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await lookupPhoneForRegistration(String(body.phone ?? ''), 'vendor');

    if (!data.exists) {
      return NextResponse.json({ success: true, data: { exists: false } });
    }

    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        accountType: data.accountType,
        hcidDisplay: data.hcidDisplay,
        fullName: data.fullName,
        suggestedAction: data.suggestedAction,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed';
    if (message === 'Invalid phone number') {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    console.error('[check-vendor]', err);
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 });
  }
}

export const POST = withRateLimit(postHandler, 'auth');
