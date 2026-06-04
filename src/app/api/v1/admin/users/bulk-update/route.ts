import { NextRequest, NextResponse } from 'next/server';
import type { VendorCustomerStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';

export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'users.edit');
    const body = await req.json();

    const userIds = body.userIds;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw Errors.badRequest('userIds must be a non-empty array');
    }

    const { isActive, status, tagsAction, tags, salesExecutive, territory, vendorId } = body;

    await prisma.$transaction(async (tx) => {
      // 1. General user updates (active/inactive status)
      if (typeof isActive === 'boolean') {
        await tx.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive },
        });
      }

      // 2. Vendor-customer specific updates
      if (vendorId) {
        for (const uId of userIds) {
          const vc = await tx.vendorCustomer.findUnique({
            where: { vendorId_userId: { vendorId, userId: uId } },
            select: { id: true, tags: true, status: true, salesExecutive: true, territory: true },
          });

          let nextTags = vc ? [...vc.tags] : [];
          if (tagsAction && Array.isArray(tags)) {
            if (tagsAction === 'add') {
              nextTags = Array.from(new Set([...nextTags, ...tags]));
            } else if (tagsAction === 'remove') {
              nextTags = nextTags.filter(t => !tags.includes(t));
            } else if (tagsAction === 'set') {
              nextTags = tags;
            }
          }

          const resolvedStatus = status || vc?.status || 'active';
          const resolvedSalesExecutive = typeof salesExecutive === 'string' ? (salesExecutive || null) : (vc?.salesExecutive ?? null);
          const resolvedTerritory = typeof territory === 'string' ? (territory || null) : (vc?.territory ?? null);

          if (vc) {
            await tx.vendorCustomer.update({
              where: { id: vc.id },
              data: {
                status: resolvedStatus as VendorCustomerStatus,
                salesExecutive: resolvedSalesExecutive,
                territory: resolvedTerritory,
                tags: nextTags,
              },
            });
          } else {
            await tx.vendorCustomer.create({
              data: {
                vendorId,
                userId: uId,
                status: resolvedStatus as VendorCustomerStatus,
                salesExecutive: resolvedSalesExecutive,
                territory: resolvedTerritory,
                tags: nextTags,
              },
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true, message: `Successfully updated ${userIds.length} users.` });
  } catch (error) {
    return errorResponse(error);
  }
});
