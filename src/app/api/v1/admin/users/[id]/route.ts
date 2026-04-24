// GET    /api/v1/admin/users/:id — Get single user details
// PATCH  /api/v1/admin/users/:id — Update user (toggle isActive, change role)
// DELETE /api/v1/admin/users/:id — Permanently delete user (admin only)
// WHY: Admin can view full user details and manage account status/roles
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { requireAdminPerm } from '@/lib/teamPermissions';

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

    if (Object.keys(allowedFields).length === 0) {
      throw Errors.notFound('No valid fields to update');
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
