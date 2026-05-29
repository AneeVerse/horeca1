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
import { requirePermission } from '@/lib/permissions/engine';

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
        vendors: {
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
    requirePermission(ctx, 'users.edit');
    const id = extractId(req);
    const body = await req.json();

    // Only allow updating specific admin-controlled fields
    const allowedFields: Record<string, unknown> = {};
    if (typeof body.isActive === 'boolean') {
      allowedFields.isActive = body.isActive;
    }
    if (body.role && ['customer', 'vendor', 'admin'].includes(body.role)) {
      // Admin role transitions must go through /admin/team to ensure the
      // AdminTeamMember row + AccountRole assignment stay consistent. This
      // endpoint must not be a back-door for self-promotion.
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (!target) throw Errors.notFound('User');
      if (body.role === 'admin' || target.role === 'admin') {
        throw Errors.forbidden('Admin role transitions are managed via the admin team page');
      }
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
      const pDigits = body.phone.replace(/\D/g, '');
      const p = pDigits.length === 12 ? pDigits.replace(/^91/, '') : pDigits;
      if (p && !/^\d{10}$/.test(p)) throw Errors.badRequest('Enter a valid 10-digit phone number');
      if (p) {
        const taken = await prisma.user.findFirst({ where: { phone: p, NOT: { id } }, select: { id: true } });
        if (taken) throw Errors.badRequest('Another user already uses this phone');
      }
      allowedFields.phone = p || null;
    }
    if (typeof body.password === 'string' && body.password.length > 0) {
      if (body.password.length < 6) throw Errors.badRequest('Password must be at least 6 characters');
      // Password resets on admin users must go through /admin/team/[id]/password
      // where the target's rank can be compared against the caller's. Allowing
      // it here would let any admin with users.edit take over the super-admin.
      const tgt = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (!tgt) throw Errors.notFound('User');
      if (tgt.role === 'admin') {
        throw Errors.forbidden('Use /admin/team to reset another admin\'s password');
      }
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

// DELETE /api/v1/admin/users/[id]?force=<bool>
//   default (no force): soft-delete (isActive=false). Preserves all linked
//   data — orders, audit trail, vendor row, business memberships.
//   ?force=true: hard-delete. Refuses if the user has order history (because
//   that would cascade-destroy financial records); otherwise wipes the user
//   row and known dependents (sessions, accounts, team memberships, saved
//   addresses, push subs, business-account membership, user roles, linked
//   accounts, carts, vendor/brand rows) in a single transaction.
//
// Admin role transitions still go through /admin/team — see PATCH above.
export const DELETE = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'users.delete');
    const id = extractId(req);
    const force = req.nextUrl.searchParams.get('force') === 'true';

    if (id === ctx.userId) {
      throw Errors.badRequest('You cannot delete your own account');
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        isActive: true,
        _count: { select: { orders: true, reviews: true, returnRequests: true } },
        vendors: { select: { id: true, _count: { select: { orders: true, products: true } } } },
      },
    });
    if (!existing) throw Errors.notFound('User');

    // ── Soft delete path ─────────────────────────────────────────────────
    if (!force) {
      if (!existing.isActive) {
        return NextResponse.json({ success: true, data: { id, alreadyDeactivated: true } });
      }
      await prisma.user.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ success: true, data: { id, deactivated: true } });
    }

    // ── Hard delete path ────────────────────────────────────────────────
    // Refuse only on truly business-critical references. Anything else
    // gets cleaned up in the transaction below.
    if (existing._count.orders > 0) {
      throw Errors.badRequest('User has order history — cannot delete permanently. Deactivate instead.');
    }
    if (existing._count.reviews > 0) {
      throw Errors.badRequest('User has product reviews — cannot delete permanently. Deactivate instead.');
    }
    if (existing._count.returnRequests > 0) {
      throw Errors.badRequest('User has return requests — cannot delete permanently. Deactivate instead.');
    }
    if (existing.vendors.some(v => v._count.orders > 0 || v._count.products > 0)) {
      throw Errors.badRequest('Vendor has orders or products — cannot delete permanently. Deactivate instead.');
    }

    await prisma.$transaction(async (tx) => {
      // Many relations to User do NOT have onDelete: Cascade in schema.prisma
      // (notifications, carts, quick order lists, credit accounts, etc.),
      // so a bare user.delete() throws P2003. Walk them explicitly here.
      // catch(()=>{}) on models whose schema MAY or MAY NOT exist (legacy).

      // ── Drop rows the user owns ──────────────────────────────────────
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.cartItem.deleteMany({ where: { cart: { userId: id } } }).catch(() => {});
      await tx.cart.deleteMany({ where: { userId: id } });
      await tx.quickOrderListItem.deleteMany({ where: { list: { userId: id } } }).catch(() => {});
      await tx.quickOrderList.deleteMany({ where: { userId: id } });
      await tx.creditTransaction.deleteMany({ where: { creditAccount: { userId: id } } }).catch(() => {});
      await tx.creditAccount.deleteMany({ where: { userId: id } });
      await tx.walletTransaction.deleteMany({ where: { wallet: { userId: id } } }).catch(() => {});
      await tx.wallet.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.customerVendor.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.vendorCustomer.deleteMany({ where: { userId: id } }).catch(() => {});

      // ── Team / RBAC rows ─────────────────────────────────────────────
      await tx.adminTeamMember.deleteMany({ where: { userId: id } });
      await tx.vendorTeamMember.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.brandTeamMember.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.businessAccountMember.deleteMany({ where: { userId: id } });

      // ── Null out inviter references on memberships owned by OTHER users
      // (we want to keep those rows; we just can't keep pointing at a row
      //  that's about to disappear). ───────────────────────────────────
      await tx.vendorTeamMember.updateMany({ where: { invitedBy: id }, data: { invitedBy: null } }).catch(() => {});
      await tx.brandTeamMember.updateMany({ where: { invitedBy: id }, data: { invitedBy: null } }).catch(() => {});
      await tx.adminTeamMember.updateMany({ where: { invitedBy: id }, data: { invitedBy: null } }).catch(() => {});
      await tx.businessAccountMember.updateMany({ where: { invitedBy: id }, data: { invitedBy: null } }).catch(() => {});

      // ── Auth-adapter + misc personal data ────────────────────────────
      await tx.linkedAccount.deleteMany({ where: { OR: [{ userId: id }, { linkedUserId: id }] } });
      await tx.savedAddress.deleteMany({ where: { userId: id } });
      await tx.pushSubscription.deleteMany({ where: { userId: id } });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.account.deleteMany({ where: { userId: id } });

      // ── Vendor / brand rows — safe to delete because of guards above
      if (existing.vendors.length > 0) {
        await tx.vendor.deleteMany({ where: { id: { in: existing.vendors.map(v => v.id) } } });
      }
      await tx.brand.deleteMany({ where: { userId: id } }).catch(() => {});

      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, data: { id, hardDeleted: true } });
  } catch (error) {
    return errorResponse(error);
  }
});
