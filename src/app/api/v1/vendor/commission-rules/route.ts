/**
 * GET  /api/v1/vendor/commission-rules                  — list rules
 * POST /api/v1/vendor/commission-rules                  — create rule
 *
 * Both endpoints scope to the resolved vendorId. POST validates the
 * (rate_percent XOR rate_fixed) and (scope='default' XOR scope_ref_id)
 * invariants — the DB enforces them too via CHECK constraints, but a
 * pre-flight error message is friendlier than a raw constraint violation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

const ScopeEnum = z.enum(['default', 'customer', 'brand', 'category']);

const CreateBody = z
  .object({
    salespersonId: z.string().uuid(),
    scope: ScopeEnum,
    scopeRefId: z.string().uuid().nullable().optional(),
    ratePercent: z.number().min(0).max(100).nullable().optional(),
    rateFixed: z.number().nonnegative().nullable().optional(),
    minOrderValue: z.number().nonnegative().nullable().optional(),
    validFrom: z.string().datetime().nullable().optional(),
    validTo: z.string().datetime().nullable().optional(),
    isActive: z.boolean().optional().default(true),
  })
  .refine(
    (d) => (d.ratePercent != null && d.rateFixed == null) || (d.ratePercent == null && d.rateFixed != null),
    { message: 'Exactly one of ratePercent or rateFixed is required' },
  )
  .refine(
    (d) => (d.scope === 'default' ? !d.scopeRefId : !!d.scopeRefId),
    { message: 'scopeRefId is required for non-default scopes and must be null for scope=default' },
  );

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'commissions.view');
    const vendorId = await resolveVendorId(ctx, req);
    const salespersonId = req.nextUrl.searchParams.get('salespersonId') ?? undefined;
    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true';

    const rows = await prisma.commissionRule.findMany({
      where: {
        vendorId,
        ...(salespersonId ? { salespersonId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      include: { salesperson: { select: { id: true, name: true, isActive: true } } },
    });
    return NextResponse.json({ success: true, data: rows });
  } catch (err) { return errorResponse(err); }
});

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'commissions.edit');
    const vendorId = await resolveVendorId(ctx, req);
    const body = CreateBody.parse(await req.json());

    // Multi-tenancy: the salesperson MUST belong to this vendor.
    const sp = await prisma.salesperson.findFirst({
      where: { id: body.salespersonId, vendorId },
      select: { id: true },
    });
    if (!sp) throw Errors.badRequest('Salesperson does not belong to this vendor');

    // Multi-tenancy on scopeRefId: depends on scope:
    //   customer → must be a VendorCustomer of this vendor
    //   brand    → must be a Brand row (no per-vendor check; brands are global)
    //   category → must be a Category row (global too)
    if (body.scope === 'customer' && body.scopeRefId) {
      const vc = await prisma.vendorCustomer.findFirst({
        where: { id: body.scopeRefId, vendorId },
        select: { id: true },
      });
      if (!vc) throw Errors.badRequest('Customer-scope rule references a customer that is not yours');
    } else if (body.scope === 'brand' && body.scopeRefId) {
      const b = await prisma.brand.findUnique({ where: { id: body.scopeRefId }, select: { id: true } });
      if (!b) throw Errors.badRequest('Referenced brand does not exist');
    } else if (body.scope === 'category' && body.scopeRefId) {
      const c = await prisma.category.findUnique({ where: { id: body.scopeRefId }, select: { id: true } });
      if (!c) throw Errors.badRequest('Referenced category does not exist');
    }

    const created = await prisma.commissionRule.create({
      data: {
        vendorId,
        salespersonId: body.salespersonId,
        scope: body.scope,
        scopeRefId: body.scopeRefId ?? null,
        ratePercent: body.ratePercent ?? null,
        rateFixed: body.rateFixed ?? null,
        minOrderValue: body.minOrderValue ?? null,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validTo: body.validTo ? new Date(body.validTo) : null,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) { return errorResponse(err); }
});
