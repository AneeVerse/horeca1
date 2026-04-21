// PATCH /api/v1/admin/returns/:id — Update return request status
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';

const updateSchema = z.object({
  status: z.enum(['approved', 'rejected', 'refunded']),
  adminNote: z.string().optional(),
  refundAmount: z.number().positive().optional(),
});

export const PATCH = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const segments = req.nextUrl.pathname.split('/');
    const returnId = segments[segments.length - 1];

    const existing = await prisma.returnRequest.findUnique({ where: { id: returnId } });
    if (!existing) throw Errors.notFound('Return request');

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: data.status,
        adminNote: data.adminNote,
        refundAmount: data.refundAmount,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});
