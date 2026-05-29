// POST /api/v1/auth/check-vendor
// Pre-OTP gate for /vendor/register. Returns exists=true if ANY user account
// (customer / vendor / admin / brand) is already linked to the supplied
// phone. The wizard refuses to send an OTP in that case so the user sees a
// clear "log in" message instead of getting all the way to submit and
// hitting a generic DUPLICATE error. Existing customers who want to become
// vendors should use the /become-vendor flow on their account, not this
// brand-new-account wizard.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRateLimit } from '@/middleware/withRateLimit';

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = String(body.phone ?? '').replace(/\D/g, '');
    const phone = rawPhone.length === 12 ? rawPhone.replace(/^91/, '') : rawPhone;

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        role: true,
        // V2.2: a single user can own many vendor profiles.
        vendors: { select: { isActive: true, isVerified: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: true, data: { exists: false } });
    }

    const hasApprovedVendor = user.vendors.some(v => v.isVerified);
    const hasPendingVendor = user.vendors.some(v => !v.isVerified);
    const accountType = hasApprovedVendor
      ? 'vendor'
      : hasPendingVendor
        ? 'vendor_pending'
        : user.role; // 'admin' | 'customer' | 'brand'

    return NextResponse.json({
      success: true,
      data: { exists: true, accountType },
    });
  } catch (err) {
    console.error('[check-vendor]', err);
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 });
  }
}

export const POST = withRateLimit(postHandler, 'auth');
