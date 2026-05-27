// POST /api/v1/vendor/onboarding/submit
// Final-step submit for the /vendor/register wizard. Creates a brand-new
// vendor account (User + BusinessAccount + Outlet + Vendor + ServiceAreas)
// in one transaction. Vendor row starts isActive=false, isVerified=false —
// admin must approve at /admin/vendors/[id] before the storefront goes live.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { withRateLimit } from '@/middleware/withRateLimit';
import { uniqueHcid } from '@/lib/hcid';
import { emitEvent } from '@/events/emitter';

const PHONE_RE = /^\d{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PINCODE_RE = /^\d{6}$/;

const Address = z.object({
  addressLine: z.string().min(5).max(500),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().regex(PINCODE_RE, 'Invalid pincode'),
});

const Body = z.object({
  // Step 1 — phone (already verified via /auth/otp/verify)
  phone: z.string().regex(PHONE_RE, 'Invalid phone number'),

  // Step 2 — vendor type
  vendorType: z.enum(['distributor', 'wholesaler', 'manufacturer', 'importer', 'producer']),

  // Step 3 — basic details
  fullName: z.string().min(2).max(255),
  businessName: z.string().min(2).max(255),
  tradeName: z.string().min(2).max(255),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6).optional().or(z.literal('')),
  authorizedPersonName: z.string().min(2).max(255),
  authorizedPersonPhone: z.string().regex(PHONE_RE, 'Invalid authorized person phone'),
  authorizedPersonEmail: z.string().email().optional().or(z.literal('')),

  // Step 4 — GST & PAN
  gstNumber: z.string().regex(GST_RE, 'Invalid GSTIN format'),
  panNumber: z.string().regex(PAN_RE, 'Invalid PAN format'),

  // Step 5 — bank details
  bankAccountName: z.string().min(2).max(100),
  bankAccountNumber: z.string().min(8).max(30),
  bankIfsc: z.string().regex(IFSC_RE, 'Invalid IFSC format'),
  bankName: z.string().min(2).max(100),
  bankAccountType: z.enum(['savings', 'current']),

  // Step 6 — addresses
  billingAddress: Address,
  pickupAddress: Address,

  // Step 7 — service & KYC
  serviceablePincodes: z.array(z.string().regex(PINCODE_RE)).min(1, 'Add at least one pincode').max(200),
  deliveryCapability: z.enum(['own_fleet', 'third_party', 'both']),
  fssaiNumber: z.string().max(50).optional().or(z.literal('')),
  udyamNumber: z.string().max(50).optional().or(z.literal('')),
  cinNumber: z.string().max(50).optional().or(z.literal('')),
});

function slugify(name: string, suffix: string): string {
  const base = name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `${base || 'vendor'}-${suffix.slice(0, 8)}`;
}

async function postHandler(req: NextRequest) {
  try {
    const input = Body.parse(await req.json());
    const phone = input.phone;
    const email = input.email?.trim().toLowerCase() || null;

    const verifiedOtp = await prisma.otpCode.findFirst({
      where: {
        phone,
        used: true,
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!verifiedOtp) {
      throw Errors.badRequest('Phone number is not verified. Please verify your number first.');
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ phone }, ...(email ? [{ email }] : [])] },
      select: { id: true, phone: true, email: true },
    });
    if (existing) {
      throw Errors.duplicate(existing.phone === phone ? 'Phone' : 'Email');
    }

    const vendorAdminTemplate = await prisma.accountRole.findFirst({
      where: { businessAccountId: null, isTemplate: true, name: 'Vendor Admin', scope: 'vendor' },
      select: { id: true },
    });
    if (!vendorAdminTemplate) {
      throw Errors.badRequest('Vendor Admin role template missing. Run seed migration.');
    }

    const hashedPassword = input.password ? await bcrypt.hash(input.password, 12) : null;
    const hcidDisplay = await uniqueHcid();

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone,
          email,
          password: hashedPassword,
          fullName: input.fullName,
          businessName: input.businessName,
          gstNumber: input.gstNumber,
          pincode: input.billingAddress.pincode,
          role: 'vendor',
          hcidDisplay,
        },
        select: { id: true, hcidDisplay: true },
      });

      const account = await tx.businessAccount.create({
        data: {
          legalName: input.businessName,
          displayName: input.tradeName,
          gstin: input.gstNumber,
          pan: input.panNumber,
          businessType: 'vendor',
          isCustomer: true,
          isVendor: true,
          isBrand: false,
          status: 'active',
        },
      });

      const outlet = await tx.outlet.create({
        data: {
          businessAccountId: account.id,
          name: input.tradeName,
          addressLine: input.pickupAddress.addressLine,
          city: input.pickupAddress.city,
          state: input.pickupAddress.state,
          pincode: input.pickupAddress.pincode,
          requiresAddressUpdate: false,
        },
      });

      await tx.businessAccount.update({
        where: { id: account.id },
        data: { primaryOutletId: outlet.id },
      });

      await tx.businessAccountMember.create({
        data: { userId: user.id, businessAccountId: account.id, isPrimary: true, acceptedAt: new Date() },
      });

      await tx.userRole.create({
        data: { userId: user.id, businessAccountId: account.id, outletId: null, roleId: vendorAdminTemplate.id },
      });

      const slug = slugify(input.tradeName, user.id);
      const slugTaken = await tx.vendor.findUnique({ where: { slug }, select: { id: true } });
      if (slugTaken) {
        throw Errors.conflict('A vendor with this trade name already exists.');
      }

      const vendor = await tx.vendor.create({
        data: {
          userId: user.id,
          businessAccountId: account.id,
          businessName: input.businessName,
          slug,
          isActive: false,
          isVerified: false,

          gstNumber: input.gstNumber,
          addressLine: input.billingAddress.addressLine,
          city: input.billingAddress.city,
          state: input.billingAddress.state,
          addressPincode: input.billingAddress.pincode,

          bankAccountName: input.bankAccountName,
          bankAccountNumber: input.bankAccountNumber,
          bankIfsc: input.bankIfsc,
          bankName: input.bankName,
          bankAccountType: input.bankAccountType,

          tradeName: input.tradeName,
          vendorType: input.vendorType,
          panNumber: input.panNumber,
          authorizedPersonName: input.authorizedPersonName,
          authorizedPersonPhone: input.authorizedPersonPhone,
          authorizedPersonEmail: input.authorizedPersonEmail || null,
          pickupAddressLine: input.pickupAddress.addressLine,
          pickupCity: input.pickupAddress.city,
          pickupState: input.pickupAddress.state,
          pickupPincode: input.pickupAddress.pincode,
          deliveryCapability: input.deliveryCapability,
          fssaiNumber: input.fssaiNumber || null,
          udyamNumber: input.udyamNumber || null,
          cinNumber: input.cinNumber || null,
        },
        select: { id: true, slug: true },
      });

      const uniquePincodes = Array.from(new Set(input.serviceablePincodes));
      if (uniquePincodes.length > 0) {
        await tx.serviceArea.createMany({
          data: uniquePincodes.map((pincode) => ({ vendorId: vendor.id, pincode })),
          skipDuplicates: true,
        });
      }

      return { user, vendor };
    });

    emitEvent('UserRegistered', {
      userId: result.user.id,
      email: email ?? '',
      role: 'vendor',
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          vendorId: result.vendor.id,
          hcidDisplay: result.user.hcidDisplay,
          message: 'Vendor application submitted. Our team will review and contact you shortly.',
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export const POST = withRateLimit(postHandler, 'auth');
