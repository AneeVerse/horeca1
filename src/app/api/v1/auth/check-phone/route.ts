// POST /api/v1/auth/check-phone
// Unified pre-OTP gate for vendor / brand / customer registration.
// Uses phoneLookupVariants so legacy +91-prefixed rows are found.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRateLimit } from '@/middleware/withRateLimit';
import { lookupPhoneForRegistration, type PhoneCheckIntent } from '@/lib/auth/checkPhoneLookup';

const Body = z.object({
  phone: z.string().min(1),
  intent: z.enum(['vendor', 'brand', 'customer']).optional().default('vendor'),
});

async function postHandler(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const intent = body.intent as PhoneCheckIntent;

    const data = await lookupPhoneForRegistration(body.phone, intent);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed';
    if (message === 'Invalid phone number') {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    console.error('[check-phone]', err);
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 });
  }
}

export const POST = withRateLimit(postHandler, 'auth');
