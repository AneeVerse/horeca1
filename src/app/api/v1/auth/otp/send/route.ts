import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function dispatchOTP(phone: string, otp: string): Promise<void> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID ?? process.env.MSG91_TEMPLATE_ID;
  const sender = process.env.MSG91_SENDER_ID ?? 'HCXGBL';

  if (!authKey || !templateId) {
    console.log(`[OTP:dev] +91${phone} → ${otp}`);
    return;
  }

  const mobile = `91${phone}`;
  const url = new URL('https://control.msg91.com/api/v5/otp');
  url.searchParams.set('authkey', authKey);
  url.searchParams.set('template_id', templateId);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('otp', otp);
  url.searchParams.set('otp_expiry', '10');
  url.searchParams.set('sender', sender);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`MSG91 error: ${await res.text()}`);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = String(body.phone ?? '').replace(/\D/g, '');
    const phone = rawPhone.replace(/^91/, '');
    const mode: 'login' | 'register' = body.mode === 'register' ? 'register' : 'login';

    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid 10-digit phone number' },
        { status: 400 }
      );
    }

    // In login mode, verify the account exists before sending OTP
    if (mode === 'login') {
      const existing = await prisma.user.findUnique({
        where: { phone },
        select: { id: true },
      });
      if (!existing) {
        return NextResponse.json(
          { success: false, code: 'NO_ACCOUNT', error: 'No account found. Please register first.' },
          { status: 404 }
        );
      }
    }

    // Rate limit: max 3 OTPs per phone per 10 minutes
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await prisma.otpCode.count({
      where: { phone, createdAt: { gte: since } },
    });
    if (recentCount >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait 10 minutes.' },
        { status: 429 }
      );
    }

    // Invalidate existing unused OTPs
    await prisma.otpCode.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });

    const otp = generateOTP();
    await prisma.otpCode.create({
      data: { phone, code: otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });

    await dispatchOTP(phone, otp);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[otp/send]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
