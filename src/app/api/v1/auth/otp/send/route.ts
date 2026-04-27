import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/providers/email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function dispatchPhoneOTP(phone: string, otp: string): Promise<void> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID ?? process.env.MSG91_TEMPLATE_ID;
  const sender = process.env.MSG91_SENDER_ID ?? 'HCXGBL';

  if (!authKey || !templateId) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP:dev] +91${phone} → ${otp}`);
    }
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

async function dispatchEmailOTP(email: string, otp: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Your HoReCa Hub login code',
    text: `Your verification code is ${otp}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>Your verification code is <strong style="font-size:18px;letter-spacing:2px">${otp}</strong>.</p><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: 'login' | 'register' = body.mode === 'register' ? 'register' : 'login';

    const rawPhone = String(body.phone ?? '').replace(/\D/g, '');
    const phone = rawPhone ? rawPhone.replace(/^91/, '') : '';
    const email = String(body.email ?? '').trim().toLowerCase();

    const usePhone = !!phone;
    const useEmail = !usePhone && !!email;

    if (!usePhone && !useEmail) {
      return NextResponse.json(
        { success: false, error: 'Provide a phone number or email' },
        { status: 400 }
      );
    }

    if (usePhone && !/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid 10-digit phone number' },
        { status: 400 }
      );
    }

    if (useEmail && !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid email address' },
        { status: 400 }
      );
    }

    if (useEmail && mode === 'register') {
      return NextResponse.json(
        { success: false, error: 'Registration requires a phone number' },
        { status: 400 }
      );
    }

    // Verify the account exists for login
    if (mode === 'login') {
      const existing = usePhone
        ? await prisma.user.findUnique({ where: { phone }, select: { id: true } })
        : await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (!existing) {
        return NextResponse.json(
          { success: false, code: 'NO_ACCOUNT', error: 'No account found. Please register first.' },
          { status: 404 }
        );
      }
    }

    // Rate limit: max 3 OTPs per identifier per 10 minutes
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await prisma.otpCode.count({
      where: usePhone
        ? { phone, createdAt: { gte: since } }
        : { email, createdAt: { gte: since } },
    });
    if (recentCount >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait 10 minutes.' },
        { status: 429 }
      );
    }

    // Invalidate existing unused OTPs for this identifier
    await prisma.otpCode.updateMany({
      where: usePhone ? { phone, used: false } : { email, used: false },
      data: { used: true },
    });

    const otp = generateOTP();
    await prisma.otpCode.create({
      data: {
        phone: usePhone ? phone : null,
        email: useEmail ? email : null,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    if (usePhone) await dispatchPhoneOTP(phone, otp);
    else await dispatchEmailOTP(email, otp);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[otp/send]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
