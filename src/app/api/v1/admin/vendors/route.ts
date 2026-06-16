// GET  /api/v1/admin/vendors — List all vendors with details
// POST /api/v1/admin/vendors — Admin creates a vendor directly (auto-verified)
// WHY: Admin vendor management page — review, filter by verification status, search,
//      and directly onboard new vendors without waiting for an application
// PROTECTED: Admin only
// SUPPORTS (GET): ?verified=true|false&search=&cursor=&limit=20

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { uniqueHcid } from '@/lib/hcid';
import {
  GST_RE,
  PHONE_RE,
  VendorDetailsSchema,
  PrimaryOutletSchema,
} from '@/lib/validators/vendor-kyc';

function slugify(name: string, userId: string): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return `${base || 'vendor'}-${userId.slice(0, 8)}`;
}

// Admin POST mirrors the public /api/v1/account POST 'vendor' branch but
// adds an "owner account" block: admin types in the vendor's email +
// password + phone + fullName, we create the user inline, then we run
// the same business-account + outlet + vendor + service-areas tx for
// that new user. Result: a fully-formed vendor with KYC, bank, billing,
// pickup, serviceable pincodes — no follow-up wizard required.
const createVendorSchema = z.object({
  // Owner account — admin is creating the new user, supplying their
  // login credentials. The vendor signs in with these. No OTP path
  // because admin is authenticated and we trust the email + phone they
  // type for the new user.
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  phone: z.string().regex(PHONE_RE, 'Phone must be 10 digits'),

  // Vendor business
  businessName: z.string().min(2).max(255),  // legal name
  tradeName: z.string().max(255).optional(),
  gstin: z.string().regex(GST_RE, 'Invalid GSTIN format').optional().or(z.literal('')),
  description: z.string().max(1000).optional(),
  logoUrl: z.string().url().optional(),
  minOrderValue: z.number().min(0).optional(),

  // Pickup outlet + full KYC — same shape as /api/v1/account POST.
  primaryOutlet: PrimaryOutletSchema,
  vendorDetails: VendorDetailsSchema,
});

export const GET = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const params = req.nextUrl.searchParams;
    const verified = params.has('verified') ? params.get('verified') === 'true' : undefined;
    const search = params.get('search') || undefined;
    const cursor = params.get('cursor') || undefined;
    const limit = Math.min(Number(params.get('limit')) || 20, 100);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (typeof verified === 'boolean') {
      where.isVerified = verified;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessName: true,
        slug: true,
        logoUrl: true,
        rating: true,
        isVerified: true,
        isActive: true,
        creditEnabled: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    const hasMore = vendors.length > limit;
    if (hasMore) vendors.pop();

    const nextCursor = hasMore ? vendors[vendors.length - 1].id : null;

    return NextResponse.json({
      success: true,
      data: {
        vendors,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});

// POST — admin directly creates a fully-onboarded verified vendor.
// Mirrors the public /api/v1/account POST 'vendor' branch including the
// FULL KYC payload (vendor type, GST, PAN, bank, billing, pickup,
// serviceable pincodes, delivery capability, FSSAI/Udyam/CIN).
//
// What admin sets that public registration doesn't:
//   • isActive=true and isVerified=true on the Vendor row (admin trusts
//     their own due diligence; no approval queue)
//   • the new user's password directly (no OTP)
//
// Everything else uses the same data flow + same role-template seed +
// same ServiceArea fan-out as /api/v1/account POST. Loopholes blocked:
//   • Pre-flight existence checks: email taken, slug taken, owner /
//     vendor admin templates seeded.
//   • All FK and unique constraints enforced by Prisma; tx rolls back
//     on any one failure.
export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'vendors.create');

    const body = await req.json();
    const input = createVendorSchema.parse(body);
    const normalizedEmail = input.email.toLowerCase();

    // Pre-flight: email + slug uniqueness so we fail fast outside the tx.
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) throw Errors.conflict('Email already in use');

    const phoneDigits = input.phone.replace(/\D/g, '');
    const phoneCollide = await prisma.user.findFirst({
      where: { phone: phoneDigits },
      select: { id: true },
    });
    if (phoneCollide) throw Errors.conflict('Phone number already in use');

    // Templates the tx needs — load up-front so we fail loudly if the
    // seed migration hasn't run on this environment.
    const [ownerTemplate, vendorAdminTemplate] = await Promise.all([
      prisma.accountRole.findFirst({
        where: { businessAccountId: null, isTemplate: true, name: 'Owner', scope: 'account' },
        select: { id: true },
      }),
      prisma.accountRole.findFirst({
        where: { businessAccountId: null, isTemplate: true, name: 'Vendor Admin', scope: 'vendor' },
        select: { id: true },
      }),
    ]);
    if (!ownerTemplate) throw Errors.badRequest('Owner role template missing. Run data backfill first.');
    if (!vendorAdminTemplate) throw Errors.badRequest('Vendor Admin role template missing. Run data backfill first.');

    const hashedPassword = await bcrypt.hash(input.password, 12);
    const hcidDisplay = await uniqueHcid();
    const vd = input.vendorDetails;

    const result = await prisma.$transaction(async (tx) => {
      // 1. New User with a fresh HCID. role='vendor' on the legacy field
      //    matches the public registration flow; AdminTeamMember scoping
      //    is unaffected because this user has no admin team membership.
      const user = await tx.user.create({
        data: {
          fullName: input.fullName,
          email: normalizedEmail,
          password: hashedPassword,
          role: 'vendor',
          phone: phoneDigits,
          isActive: true,
          hcidDisplay,
          businessName: input.businessName,
          gstNumber: input.gstin || null,
        },
      });

      // 2. Pre-flight slug uniqueness, scoped to the new user's id so
      //    the same admin can create vendors with similar names.
      const slug = slugify(input.businessName, user.id);
      const slugExists = await tx.vendor.findUnique({ where: { slug }, select: { id: true } });
      if (slugExists) throw Errors.conflict('A vendor with this business name already exists');

      // 3. BusinessAccount with all BA-level fields the schema supports.
      //    Same fields the public POST writes — keep them aligned.
      const account = await tx.businessAccount.create({
        data: {
          legalName: input.businessName,
          displayName: input.tradeName ?? null,
          gstin: input.gstin || null,
          pan: vd.panNumber,
          fssaiNumber: vd.fssaiNumber || null,
          billingAddressLine: vd.billingAddress.addressLine,
          billingCity: vd.billingAddress.city,
          billingState: vd.billingAddress.state,
          billingPincode: vd.billingAddress.pincode,
          businessType: 'vendor',
          isCustomer: true,
          isVendor: true,
          isBrand: false,
          status: 'active',
        },
      });

      // 4. Primary outlet — the pickup/warehouse address. Geo-flag
      //    requiresAddressUpdate when lat/lng absent (mirrors /api/v1/account).
      const outlet = await tx.outlet.create({
        data: {
          businessAccountId: account.id,
          name: input.primaryOutlet.name,
          addressLine: input.primaryOutlet.addressLine,
          city: input.primaryOutlet.city,
          state: input.primaryOutlet.state,
          pincode: input.primaryOutlet.pincode,
          latitude: input.primaryOutlet.latitude,
          longitude: input.primaryOutlet.longitude,
          placeId: input.primaryOutlet.placeId,
          requiresAddressUpdate: false,
        },
      });
      await tx.businessAccount.update({
        where: { id: account.id },
        data: { primaryOutletId: outlet.id },
      });

      // 5. BusinessAccountMember (primary owner) + UserRole rows for
      //    both Owner (account scope) and Vendor Admin (vendor scope).
      await tx.businessAccountMember.create({
        data: { userId: user.id, businessAccountId: account.id, isPrimary: true, acceptedAt: new Date(), invitedBy: ctx.userId },
      });
      await tx.userRole.create({
        data: { userId: user.id, businessAccountId: account.id, outletId: null, roleId: ownerTemplate.id },
      });
      await tx.userRole.create({
        data: { userId: user.id, businessAccountId: account.id, outletId: null, roleId: vendorAdminTemplate.id },
      });

      // 6. Vendor row — full KYC, immediately verified + active (admin
      //    is creating this directly; no approval queue).
      const vendor = await tx.vendor.create({
        data: {
          userId: user.id,
          businessAccountId: account.id,
          businessName: input.businessName,
          slug,
          description: input.description ?? null,
          logoUrl: input.logoUrl ?? null,
          minOrderValue: input.minOrderValue ?? 0,
          isActive: true,
          isVerified: true,

          // Tax / billing on Vendor
          gstNumber: input.gstin || null,
          tradeName: input.tradeName ?? null,

          // KYC block — fully populated, no half-built state.
          vendorType: vd.vendorType,
          panNumber: vd.panNumber,
          authorizedPersonName: vd.authorizedPersonName,
          authorizedPersonPhone: vd.authorizedPersonPhone,
          authorizedPersonEmail: vd.authorizedPersonEmail || null,

          addressLine: vd.billingAddress.addressLine,
          city: vd.billingAddress.city,
          state: vd.billingAddress.state,
          addressPincode: vd.billingAddress.pincode,

          pickupAddressLine: input.primaryOutlet.addressLine,
          pickupCity: input.primaryOutlet.city ?? null,
          pickupState: input.primaryOutlet.state ?? null,
          pickupPincode: input.primaryOutlet.pincode ?? null,

          bankAccountName: vd.bankAccountName,
          bankAccountNumber: vd.bankAccountNumber,
          bankIfsc: vd.bankIfsc,
          bankName: vd.bankName,
          bankAccountType: vd.bankAccountType,

          deliveryCapability: vd.deliveryCapability,
          fssaiNumber: vd.fssaiNumber || null,
          udyamNumber: vd.udyamNumber || null,
          cinNumber: vd.cinNumber || null,
        },
        select: {
          id: true,
          businessName: true,
          slug: true,
          logoUrl: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          user: { select: { id: true, fullName: true, email: true, phone: true, hcidDisplay: true } },
        },
      });

      // 7. ServiceArea rows — one per pincode. Dedupe so a sloppy paste
      //    doesn't trip the (vendorId, pincode) unique index.
      const uniquePincodes = Array.from(new Set(vd.serviceablePincodes));
      if (uniquePincodes.length > 0) {
        await tx.serviceArea.createMany({
          data: uniquePincodes.map((pincode) => ({ vendorId: vendor.id, pincode })),
          skipDuplicates: true,
        });
      }

      return vendor;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
