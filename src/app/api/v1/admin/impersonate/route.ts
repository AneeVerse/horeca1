// POST /api/v1/admin/impersonate — Start impersonating a vendor
// DELETE /api/v1/admin/impersonate — Exit impersonation
// WHY: Allows admin to view and operate a vendor's dashboard as if they were that vendor.
//      Sets short-lived cookies that vendor API routes read to resolve the correct vendorId.
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';

const VENDOR_ID_COOKIE = 'admin_impersonate_vendor_id';
const VENDOR_NAME_COOKIE = 'admin_impersonate_vendor_name';
const COOKIE_MAX_AGE = 60 * 60 * 4; // 4 hours

export const POST = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const { vendorId } = await req.json();
    if (!vendorId) throw Errors.badRequest('vendorId is required');

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, businessName: true },
    });
    if (!vendor) throw Errors.notFound('Vendor not found');

    const res = NextResponse.json({ success: true });
    res.cookies.set(VENDOR_ID_COOKIE, vendor.id, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
    res.cookies.set(VENDOR_NAME_COOKIE, vendor.businessName, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = adminOnly(async (_req: NextRequest, _ctx) => {
  try {
    const res = NextResponse.json({ success: true });
    res.cookies.set(VENDOR_ID_COOKIE, '', { maxAge: 0, path: '/' });
    res.cookies.set(VENDOR_NAME_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  } catch (error) {
    return errorResponse(error);
  }
});
