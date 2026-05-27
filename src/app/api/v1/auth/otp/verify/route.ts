// POST /api/v1/auth/otp/verify
// Verifies a 4-digit OTP for a phone number WITHOUT creating a session.
// Used by the multi-step vendor onboarding wizard where phone is verified
// at step 1 and the user-creation transaction happens only at final submit.
// On success, marks the OtpCode used=true. The /vendor/onboarding/submit
// route trusts a recently-used OTP for that phone as proof of verification.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRateLimit } from '@/middleware/withRateLimit';

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = String(body.phone ?? '').replace(/\D/g, '');
    const phone = rawPhone.length === 12 ? rawPhone.replace(/^91/, '') : rawPhone;
    const code = String(body.code ?? '').trim();

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
    }
    if (!/^\d{4}$/.test(code)) {
      return NextResponse.json({ success: false, error: 'Enter the 4-digit code' }, { status: 400 });
    }

    const otp = await prisma.otpCode.findFirst({
      where: { phone, code, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!otp) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired OTP' },
        { status: 400 },
      );
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[otp/verify]', err);
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}

export const POST = withRateLimit(postHandler, 'auth');
