/**
 * GET  /api/v1/account              — list every BusinessAccount the caller belongs to
 * POST /api/v1/account              — create a new BusinessAccount + primary Outlet + owner role
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, Errors } from '@/middleware/errorHandler';

export const GET = withAuth(async (_req: NextRequest, ctx) => {
  try {
    const memberships = await prisma.businessAccountMember.findMany({
      where: { userId: ctx.userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: {
        isPrimary: true,
        createdAt: true,
        businessAccount: {
          select: {
            id: true, legalName: true, displayName: true, gstin: true, businessType: true,
            isCustomer: true, isVendor: true, isBrand: true, status: true,
            primaryOutletId: true,
            outlets: { select: { id: true, name: true, pincode: true, requiresAddressUpdate: true } },
          },
        },
      },
    });
    return NextResponse.json({
      success: true,
      data: memberships.map((m) => ({
        ...m.businessAccount,
        isPrimary: m.isPrimary,
        joinedAt: m.createdAt,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
});

// Regexes mirror the public /vendor/onboarding/submit endpoint so the two
// onboarding paths accept identical KYC inputs.
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PHONE_RE = /^\d{10}$/;
const PINCODE_RE = /^\d{6}$/;

const BillingAddress = z.object({
  addressLine: z.string().min(5).max(500),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().regex(PINCODE_RE, 'Invalid pincode'),
});

// Full vendor KYC block — must be supplied when isVendor=true AND the caller
// wants a workable vendor profile (settlement, dispatch, invoicing depend on
// these fields). Spec's 5 vendor types are the only accepted values.
const VendorDetails = z.object({
  vendorType: z.enum(['distributor', 'wholesaler', 'brand_store', 'manufacturer', 'dark_store']),
  panNumber: z.string().regex(PAN_RE, 'Invalid PAN format'),
  authorizedPersonName: z.string().min(2).max(255),
  authorizedPersonPhone: z.string().regex(PHONE_RE, 'Invalid authorized person phone'),
  authorizedPersonEmail: z.string().email().optional().or(z.literal('')),
  // Billing / registered office address — shown as "Bill From" on tax
  // invoices. The primaryOutlet doubles as the pickup/warehouse address;
  // no separate pickup block is required.
  billingAddress: BillingAddress,
  bankAccountName: z.string().min(2).max(100),
  bankAccountNumber: z.string().min(8).max(30),
  bankIfsc: z.string().regex(IFSC_RE, 'Invalid IFSC format'),
  bankName: z.string().min(2).max(100),
  bankAccountType: z.enum(['savings', 'current']),
  serviceablePincodes: z.array(z.string().regex(PINCODE_RE)).min(1, 'Add at least one pincode').max(200),
  deliveryCapability: z.enum(['own_fleet', 'third_party', 'both']),
  fssaiNumber: z.string().max(50).optional().or(z.literal('')),
  udyamNumber: z.string().max(50).optional().or(z.literal('')),
  cinNumber: z.string().max(50).optional().or(z.literal('')),
});

const CreateBody = z.object({
  legalName: z.string().min(2).max(255),
  displayName: z.string().max(255).optional(),
  gstin: z.string().regex(GST_RE, 'Invalid GSTIN format').optional().or(z.literal('')),
  pan: z.string().max(20).optional(),
  businessType: z.string().max(50).optional(),
  isCustomer: z.boolean().optional().default(true),
  isVendor: z.boolean().optional().default(false),
  isBrand: z.boolean().optional().default(false),
  primaryOutlet: z.object({
    name: z.string().min(1).max(255),
    addressLine: z.string().min(1),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    placeId: z.string().optional(),
  }),
  vendorDetails: VendorDetails.optional(),
});

function slugify(name: string, userId: string): string {
  const base = name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `${base || 'business'}-${userId.slice(0, 8)}`;
}

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = CreateBody.parse(await req.json());

    // One Vendor / Brand row per BusinessAccount is still enforced
    // (Vendor.businessAccountId @unique), but a single User can now own many
    // Vendor / Brand rows — each in its own BusinessAccount — under the V2.2
    // HCID multi-account architecture. No duplicate check on userId.

    // Lookup the seeded templates we need up-front so the transaction can
    // fail fast if backfill hasn't run.
    const ownerTemplate = await prisma.accountRole.findFirst({
      where: { businessAccountId: null, isTemplate: true, name: 'Owner', scope: 'account' },
      select: { id: true },
    });
    if (!ownerTemplate) throw Errors.badRequest('Owner role template missing. Run data backfill first.');

    let vendorAdminTemplate: { id: string } | null = null;
    if (body.isVendor) {
      vendorAdminTemplate = await prisma.accountRole.findFirst({
        where: { businessAccountId: null, isTemplate: true, name: 'Vendor Admin', scope: 'vendor' },
        select: { id: true },
      });
      if (!vendorAdminTemplate) throw Errors.badRequest('Vendor Admin role template missing. Run data backfill first.');
    }

    let brandAdminTemplate: { id: string } | null = null;
    if (body.isBrand) {
      brandAdminTemplate = await prisma.accountRole.findFirst({
        where: { businessAccountId: null, isTemplate: true, name: 'Brand Admin', scope: 'brand' },
        select: { id: true },
      });
      if (!brandAdminTemplate) throw Errors.badRequest('Brand Admin role template missing. Run data backfill first.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.businessAccount.create({
        data: {
          legalName: body.legalName,
          displayName: body.displayName,
          gstin: body.gstin,
          pan: body.pan,
          businessType: body.businessType,
          isCustomer: body.isCustomer,
          isVendor: body.isVendor,
          isBrand: body.isBrand,
        },
      });
      const outlet = await tx.outlet.create({
        data: {
          businessAccountId: account.id,
          name: body.primaryOutlet.name,
          addressLine: body.primaryOutlet.addressLine,
          city: body.primaryOutlet.city,
          state: body.primaryOutlet.state,
          pincode: body.primaryOutlet.pincode,
          latitude: body.primaryOutlet.latitude,
          longitude: body.primaryOutlet.longitude,
          placeId: body.primaryOutlet.placeId,
          requiresAddressUpdate: !(body.primaryOutlet.latitude && body.primaryOutlet.longitude),
        },
      });
      await tx.businessAccount.update({ where: { id: account.id }, data: { primaryOutletId: outlet.id } });
      await tx.businessAccountMember.create({
        data: { userId: ctx.userId, businessAccountId: account.id, isPrimary: false, acceptedAt: new Date() },
      });
      await tx.userRole.create({
        data: { userId: ctx.userId, businessAccountId: account.id, outletId: null, roleId: ownerTemplate.id },
      });

      // Vendor extension row — without this the storefront/dashboard 403s
      // because resolveVendorContext can't find a Vendor record. When
      // vendorDetails is supplied we populate the FULL KYC payload + seed
      // ServiceArea rows, so the new vendor is operational immediately;
      // otherwise we still create the row but leave KYC fields null (legacy
      // path — caller is expected to PATCH /vendor/settings to complete it).
      if (body.isVendor && vendorAdminTemplate) {
        const vd = body.vendorDetails;
        const vendor = await tx.vendor.create({
          data: {
            userId: ctx.userId,
            businessAccountId: account.id,
            businessName: body.legalName,
            slug: slugify(body.displayName || body.legalName, ctx.userId),
            isActive: false,
            isVerified: false,

            // Tax / billing on the Vendor row (separate from outlet)
            gstNumber: body.gstin ?? null,
            tradeName: body.displayName ?? null,

            ...(vd ? {
              vendorType: vd.vendorType,
              panNumber: vd.panNumber,
              authorizedPersonName: vd.authorizedPersonName,
              authorizedPersonPhone: vd.authorizedPersonPhone,
              authorizedPersonEmail: vd.authorizedPersonEmail || null,

              // Billing / registered office (Bill From on tax invoices)
              addressLine: vd.billingAddress.addressLine,
              city: vd.billingAddress.city,
              state: vd.billingAddress.state,
              addressPincode: vd.billingAddress.pincode,

              // Pickup / warehouse mirrors the primary outlet — that's
              // where the delivery partner physically collects orders.
              pickupAddressLine: body.primaryOutlet.addressLine,
              pickupCity: body.primaryOutlet.city ?? null,
              pickupState: body.primaryOutlet.state ?? null,
              pickupPincode: body.primaryOutlet.pincode ?? null,

              bankAccountName: vd.bankAccountName,
              bankAccountNumber: vd.bankAccountNumber,
              bankIfsc: vd.bankIfsc,
              bankName: vd.bankName,
              bankAccountType: vd.bankAccountType,

              deliveryCapability: vd.deliveryCapability,
              fssaiNumber: vd.fssaiNumber || null,
              udyamNumber: vd.udyamNumber || null,
              cinNumber: vd.cinNumber || null,
            } : {}),
          },
          select: { id: true },
        });
        await tx.userRole.create({
          data: { userId: ctx.userId, businessAccountId: account.id, outletId: null, roleId: vendorAdminTemplate.id },
        });
        // Legacy role field consumed by older routes
        await tx.user.update({ where: { id: ctx.userId }, data: { role: 'vendor' } });

        // Serviceable pincodes — one ServiceArea row per pincode. Dedupe so
        // the user can paste a sloppy list without violating the
        // (vendorId,pincode) unique index.
        if (vd && vd.serviceablePincodes.length > 0) {
          const unique = Array.from(new Set(vd.serviceablePincodes));
          await tx.serviceArea.createMany({
            data: unique.map((pincode) => ({ vendorId: vendor.id, pincode })),
            skipDuplicates: true,
          });
        }
      }

      if (body.isBrand && brandAdminTemplate) {
        await tx.brand.create({
          data: {
            userId: ctx.userId,
            businessAccountId: account.id,
            name: body.legalName,
            slug: slugify(body.displayName || body.legalName, ctx.userId),
          },
        });
        await tx.userRole.create({
          data: { userId: ctx.userId, businessAccountId: account.id, outletId: null, roleId: brandAdminTemplate.id },
        });
      }

      return { account, outlet };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
});
