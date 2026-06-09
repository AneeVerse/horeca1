// GET  /api/v1/admin/vendors/:id — Get full vendor detail
// PATCH /api/v1/admin/vendors/:id — Approve/reject vendor (update isVerified, isActive)
// WHY: Admin reviews vendor applications, approves them for the marketplace,
//      or deactivates misbehaving vendors. Emits VendorOnboarded on first verification.
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { emitEvent } from '@/events/emitter';
import { requirePermission } from '@/lib/permissions/engine';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';

// Helper: extract the [id] segment from /api/v1/admin/vendors/{id}
function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

// GET — full vendor details with products, service areas, delivery slots
export const GET = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const id = extractId(req);

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            gstNumber: true,
            isActive: true,
            createdAt: true,
          },
        },
        products: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            isActive: true,
            imageUrl: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        serviceAreas: {
          select: {
            id: true,
            pincode: true,
            isActive: true,
          },
        },
        deliverySlots: {
          select: {
            id: true,
            dayOfWeek: true,
            slotStart: true,
            slotEnd: true,
            cutoffTime: true,
            isActive: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
        _count: {
          select: {
            orders: true,
            products: true,
            creditAccounts: true,
          },
        },
      },
    });

    if (!vendor) {
      throw Errors.notFound('Vendor');
    }

    return NextResponse.json({ success: true, data: vendor });
  } catch (error) {
    return errorResponse(error);
  }
});

// PATCH — approve/reject vendor (update isVerified, isActive)
export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'vendors.edit');
    const id = extractId(req);
    const body = await req.json();

    // Only allow updating admin-controlled vendor fields
    const allowedFields: Record<string, unknown> = {};
    if (typeof body.isVerified === 'boolean') {
      allowedFields.isVerified = body.isVerified;
    }
    if (typeof body.isActive === 'boolean') {
      allowedFields.isActive = body.isActive;
    }

    const vendorFields = [
      'businessName', 'description', 'address', 'city', 'state', 'pincode',
      'tradeName', 'vendorType', 'gstNumber', 'panNumber', 'fssaiNumber',
      'udyamNumber', 'cinNumber', 'deliveryCapability', 'authorizedPersonName',
      'authorizedPersonPhone', 'authorizedPersonEmail', 'pickupAddressLine',
      'pickupCity', 'pickupState', 'pickupPincode', 'bankAccountName',
      'bankAccountNumber', 'bankIfsc', 'bankName', 'bankAccountType'
    ];

    for (const field of vendorFields) {
      if (body[field] !== undefined) {
        allowedFields[field] = body[field];
      }
    }

    if (body.minOrderValue !== undefined) {
      allowedFields.minOrderValue = Number(body.minOrderValue);
    }
    if (body.deliveryFee !== undefined) {
      allowedFields.deliveryFee = Number(body.deliveryFee);
    }
    if (body.freeDeliveryAbove !== undefined) {
      allowedFields.freeDeliveryAbove = body.freeDeliveryAbove !== null ? Number(body.freeDeliveryAbove) : null;
    }

    const userUpdate: Record<string, string> = {};
    if (body.fullName !== undefined) userUpdate.fullName = body.fullName;
    if (body.email !== undefined) userUpdate.email = body.email;
    if (body.phone !== undefined) userUpdate.phone = body.phone;
    if (body.userGstNumber !== undefined) userUpdate.gstNumber = body.userGstNumber;

    if (Object.keys(allowedFields).length === 0 && Object.keys(userUpdate).length === 0) {
      throw Errors.notFound('No valid fields to update');
    }

    // Fetch current vendor state (needed for onboarding event check)
    const existing = await prisma.vendor.findUnique({
      where: { id },
      select: { isVerified: true, userId: true, businessName: true },
    });

    if (!existing) {
      throw Errors.notFound('Vendor');
    }

    // When approving: also activate the vendor
    if (allowedFields.isVerified === true) {
      allowedFields.isActive = true;
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        ...allowedFields,
        ...(Object.keys(userUpdate).length > 0 && {
          user: {
            update: userUpdate
          }
        })
      },
      select: {
        id: true,
        businessName: true,
        slug: true,
        isVerified: true,
        isActive: true,
        updatedAt: true,
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // Promote user role to 'vendor' on approval, revert to 'customer' on revoke
    if (typeof allowedFields.isVerified === 'boolean') {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { role: allowedFields.isVerified ? 'vendor' : 'customer' },
      });
    }

    // Emit VendorOnboarded when vendor is verified for the first time
    if (
      allowedFields.isVerified === true &&
      !existing.isVerified
    ) {
      emitEvent('VendorOnboarded', {
        vendorId: id,
        userId: existing.userId,
        businessName: existing.businessName,
      });
    }

    logAction(ctx, req, {
      action: allowedFields.isVerified === true ? AUDIT_ACTIONS.vendorApprove : AUDIT_ACTIONS.vendorUpdate,
      entity: 'Vendor',
      entityId: id,
      before: { isVerified: existing.isVerified },
      after: allowedFields,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});
