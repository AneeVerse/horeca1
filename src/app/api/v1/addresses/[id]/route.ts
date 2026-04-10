// PATCH  /api/v1/addresses/:id — update a saved address
// DELETE /api/v1/addresses/:id — delete a saved address

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRole } from '@/middleware/rbac';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';

const updateSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  businessName: z.string().max(255).nullable().optional(),
  flatInfo: z.string().max(255).nullable().optional(),
  landmark: z.string().max(255).nullable().optional(),
  isDefault: z.boolean().optional(),
});

const ALL_ROLES = ['customer', 'vendor', 'brand', 'admin'] as const;

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const PATCH = withRole([...ALL_ROLES], async (req: NextRequest, ctx) => {
  try {
    const id = extractId(req);
    const existing = await prisma.savedAddress.findFirst({
      where: { id, userId: ctx.userId },
    });
    if (!existing) throw Errors.notFound('Address');

    const body = await req.json();
    const input = updateSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.savedAddress.updateMany({
          where: { userId: ctx.userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.savedAddress.update({
        where: { id },
        data: {
          ...(input.label !== undefined && { label: input.label }),
          ...(input.businessName !== undefined && { businessName: input.businessName }),
          ...(input.flatInfo !== undefined && { flatInfo: input.flatInfo }),
          ...(input.landmark !== undefined && { landmark: input.landmark }),
          ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = withRole([...ALL_ROLES], async (req: NextRequest, ctx) => {
  try {
    const id = extractId(req);
    const existing = await prisma.savedAddress.findFirst({
      where: { id, userId: ctx.userId },
    });
    if (!existing) throw Errors.notFound('Address');

    await prisma.savedAddress.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
