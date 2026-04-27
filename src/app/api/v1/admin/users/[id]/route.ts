// GET    /api/v1/admin/users/:id — Get single user details
// PATCH  /api/v1/admin/users/:id — Update user (toggle isActive, change role)
// DELETE /api/v1/admin/users/:id — Permanently delete user (admin only)
// WHY: Admin can view full user details and manage account status/roles
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { requireAdminPerm } from '@/lib/teamPermissions';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper: extract the [id] segment from /api/v1/admin/users/{id}
function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

// GET — full user details
export const GET = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const id = extractId(req);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        businessName: true,
        gstNumber: true,
        pincode: true,
        image: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            isVerified: true,
            isActive: true,
            rating: true,
          },
        },
        _count: {
          select: {
            orders: true,
            quickOrderLists: true,
          },
        },
      },
    });

    if (!user) {
      throw Errors.notFound('User');
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return errorResponse(error);
  }
});

// PATCH — update user fields (isActive, role)
export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'settings:write');
    const id = extractId(req);
    const body = await req.json();

    // Only allow updating specific admin-controlled fields
    const allowedFields: Record<string, unknown> = {};
    if (typeof body.isActive === 'boolean') {
      allowedFields.isActive = body.isActive;
    }
    if (body.role && ['customer', 'vendor', 'admin'].includes(body.role)) {
      allowedFields.role = body.role;
    }
    if (typeof body.fullName === 'string' && body.fullName.trim()) {
      allowedFields.fullName = body.fullName.trim();
    }
    if (typeof body.businessName === 'string') {
      allowedFields.businessName = body.businessName.trim() || null;
    }
    if (typeof body.gstNumber === 'string') {
      allowedFields.gstNumber = body.gstNumber.trim() || null;
    }
    if (typeof body.pincode === 'string') {
      allowedFields.pincode = body.pincode.trim() || null;
    }
    if (typeof body.email === 'string') {
      const e = body.email.trim().toLowerCase();
      if (e && !EMAIL_RE.test(e)) throw Errors.badRequest('Enter a valid email address');
      if (e) {
        const taken = await prisma.user.findFirst({ where: { email: e, NOT: { id } }, select: { id: true } });
        if (taken) throw Errors.badRequest('Another user already uses this email');
      }
      allowedFields.email = e || null;
    }
    if (typeof body.phone === 'string') {
      const p = body.phone.replace(/\D/g, '').replace(/^91/, '');
      if (p && !/^\d{10}$/.test(p)) throw Errors.badRequest('Enter a valid 10-digit phone number');
      if (p) {
        const taken = await prisma.user.findFirst({ where: { phone: p, NOT: { id } }, select: { id: true } });
        if (taken) throw Errors.badRequest('Another user already uses this phone');
      }
      allowedFields.phone = p || null;
    }
    if (typeof body.password === 'string' && body.password.length > 0) {
      if (body.password.length < 6) throw Errors.badRequest('Password must be at least 6 characters');
      allowedFields.password = await bcrypt.hash(body.password, 10);
    }

    if (Object.keys(allowedFields).length === 0) {
      throw Errors.badRequest('No valid fields to update');
    }

    // Verify user exists
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw Errors.notFound('User');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: allowedFields,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        businessName: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});

// DELETE — permanently remove a user from the database
export const DELETE = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'settings:write');
    const id = extractId(req);

    // Prevent admin from deleting themselves
    if (id === ctx.userId) {
      throw Errors.badRequest('You cannot delete your own account');
    }

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!existing) throw Errors.notFound('User');

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
