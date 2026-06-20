// POST /api/v1/vendor/brands/suggest — Vendor suggests a new brand for admin approval.
// PROTECTED: Vendor only.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { uniqueHcid } from '@/lib/hcid';

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const schema = z.object({
  name: z.string().min(2).max(255),
});

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'products.create');

    const { name } = schema.parse(await req.json());
    const trimmed = name.trim();

    const existing = await prisma.brand.findFirst({
      where: { name: { equals: trimmed, mode: 'insensitive' } },
      select: { id: true, name: true, approvalStatus: true },
    });
    if (existing) {
      return NextResponse.json({ success: true, data: existing, alreadyExists: true });
    }

    const slug = slugify(trimmed);
    const slugTaken = await prisma.brand.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, approvalStatus: true },
    });
    if (slugTaken) {
      return NextResponse.json({ success: true, data: slugTaken, alreadyExists: true });
    }

    const email = `${slug}.${Date.now()}@vendor-suggest.internal.horeca1`;
    const password = await bcrypt.hash(`Vs1-${Math.random().toString(36).slice(2, 12)}!`, 12);
    const hcidDisplay = await uniqueHcid();

    const brand = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: trimmed,
          email,
          password,
          role: 'brand',
          isActive: false,
          hcidDisplay,
          businessName: trimmed,
        },
      });

      const account = await tx.businessAccount.create({
        data: {
          legalName: trimmed,
          isCustomer: false,
          isVendor: false,
          isBrand: true,
          status: 'active',
        },
      });

      await tx.businessAccountMember.create({
        data: { userId: user.id, businessAccountId: account.id, isPrimary: true, acceptedAt: new Date() },
      });

      const brandAdminTemplate = await tx.accountRole.findFirst({
        where: { businessAccountId: null, isTemplate: true, name: 'Brand Admin', scope: 'brand' },
        select: { id: true },
      });
      if (!brandAdminTemplate) throw Errors.badRequest('Brand Admin role template missing.');

      await tx.userRole.create({
        data: { userId: user.id, businessAccountId: account.id, outletId: null, roleId: brandAdminTemplate.id },
      });

      return tx.brand.create({
        data: {
          userId: user.id,
          businessAccountId: account.id,
          slug,
          name: trimmed,
          approvalStatus: 'pending',
          isActive: false,
        },
        select: { id: true, name: true, slug: true, approvalStatus: true },
      });
    });

    return NextResponse.json({ success: true, data: brand }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
