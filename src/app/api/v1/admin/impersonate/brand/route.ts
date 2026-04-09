// POST /api/v1/admin/impersonate/brand — Start impersonating a brand
// DELETE /api/v1/admin/impersonate/brand — Exit impersonation
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';

const BRAND_ID_COOKIE   = 'admin_impersonate_brand_id';
const BRAND_NAME_COOKIE = 'admin_impersonate_brand_name';
const COOKIE_MAX_AGE    = 60 * 60 * 4; // 4 hours

export const POST = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const { brandId } = await req.json();
    if (!brandId) throw Errors.forbidden('brandId is required');

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { id: true, name: true },
    });
    if (!brand) throw Errors.notFound('Brand not found');

    const res = NextResponse.json({ success: true });
    res.cookies.set(BRAND_ID_COOKIE, brand.id, { httpOnly: false, sameSite: 'lax', path: '/', maxAge: COOKIE_MAX_AGE });
    res.cookies.set(BRAND_NAME_COOKIE, brand.name, { httpOnly: false, sameSite: 'lax', path: '/', maxAge: COOKIE_MAX_AGE });
    return res;
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = adminOnly(async (_req: NextRequest, _ctx) => {
  try {
    const res = NextResponse.json({ success: true });
    res.cookies.set(BRAND_ID_COOKIE,   '', { maxAge: 0, path: '/' });
    res.cookies.set(BRAND_NAME_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  } catch (error) {
    return errorResponse(error);
  }
});
