import { NextRequest, NextResponse } from 'next/server';
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
        // If updating tags
        if (tagsAction && Array.isArray(tags)) {
          for (const uId of userIds) {
            const vc = await tx.vendorCustomer.findUnique({
              where: { vendorId_userId: { vendorId, userId: uId } },
              select: { tags: true },
            });
            if (vc) {
              let nextTags = [...vc.tags];
              if (tagsAction === 'add') {
                nextTags = Array.from(new Set([...nextTags, ...tags]));
              } else if (tagsAction === 'remove') {
                nextTags = nextTags.filter(t => !tags.includes(t));
              } else if (tagsAction === 'set') {
                nextTags = tags;
              }
              await tx.vendorCustomer.update({
                where: { vendorId_userId: { vendorId, userId: uId } },
                data: { tags: nextTags },
              });
            }
          }
        }

        // If updating status, salesExecutive, or territory
        const vcData: Record<string, unknown> = {};
        if (status) {
          vcData.status = status;
        }
        if (typeof salesExecutive === 'string') {
          vcData.salesExecutive = salesExecutive || null;
        }
        if (typeof territory === 'string') {
          vcData.territory = territory || null;
        }

        if (Object.keys(vcData).length > 0) {
          await tx.vendorCustomer.updateMany({
            where: { vendorId, userId: { in: userIds } },
            data: vcData,
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: `Successfully updated ${userIds.length} users.` });
  } catch (error) {
    return errorResponse(error);
  }
});
