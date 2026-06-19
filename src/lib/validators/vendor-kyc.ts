/**
 * Vendor KYC validation — single source of truth.
 *
 * The same KYC payload is accepted by:
 *   - POST /api/v1/account            (user self-creates a vendor BA)
 *   - POST /api/v1/admin/vendors      (admin creates a vendor on behalf of a new user)
 *   - POST /api/v1/vendor/onboarding  (legacy public onboarding endpoint)
 *
 * Refs are exported so callers can validate individual fields outside a
 * full schema (e.g. inline UI validation on a single field blur).
 */

import { z } from 'zod';

export const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const PHONE_RE = /^\d{10}$/;
export const PINCODE_RE = /^\d{6}$/;

export const BillingAddressSchema = z.object({
  addressLine: z.string().min(5).max(500),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().regex(PINCODE_RE, 'Invalid pincode'),
});
export type BillingAddressInput = z.infer<typeof BillingAddressSchema>;

export const VENDOR_TYPES = ['distributor', 'wholesaler', 'brand_store', 'manufacturer', 'dark_store'] as const;
export type VendorType = (typeof VENDOR_TYPES)[number];

export const DELIVERY_CAPABILITIES = ['own_fleet', 'third_party', 'both'] as const;
export type DeliveryCapability = (typeof DELIVERY_CAPABILITIES)[number];

/**
 * Full vendor KYC block. Required to seed a workable vendor profile —
 * settlement, dispatch, and tax-compliant invoicing all depend on these.
 */
export const VendorDetailsSchema = z.object({
  vendorType: z.enum(VENDOR_TYPES),
  // PAN is optional with no format check — vendors can be onboarded before KYC
  // docs are in hand; admin verifies later at /admin/vendors/[id].
  panNumber: z.string().regex(PAN_RE, 'Invalid PAN format').optional().or(z.literal('')),
  authorizedPersonName: z.string().min(2).max(255),
  authorizedPersonPhone: z.string().regex(PHONE_RE, 'Invalid authorized person phone'),
  authorizedPersonEmail: z.string().email().optional().or(z.literal('')),
  billingAddress: BillingAddressSchema,
  bankAccountName: z.string().min(2).max(100),
  bankAccountNumber: z.string().min(8).max(30),
  bankIfsc: z.string().regex(IFSC_RE, 'Invalid IFSC format'),
  bankName: z.string().min(2).max(100),
  bankAccountType: z.enum(['savings', 'current']),
  serviceablePincodes: z.array(z.string().regex(PINCODE_RE)).min(1, 'Add at least one pincode').max(200),
  deliveryCapability: z.enum(DELIVERY_CAPABILITIES),
  fssaiNumber: z.string().max(50).optional().or(z.literal('')),
  udyamNumber: z.string().max(50).optional().or(z.literal('')),
  cinNumber: z.string().max(50).optional().or(z.literal('')),
});
export type VendorDetailsInput = z.infer<typeof VendorDetailsSchema>;

/** Primary outlet (pickup / warehouse) address attached to the BusinessAccount. */
export const PrimaryOutletSchema = z.object({
  name: z.string().min(1).max(255),
  addressLine: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  flatInfo: z.string().optional(),
  landmark: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  placeId: z.string().optional(),
});
export type PrimaryOutletInput = z.infer<typeof PrimaryOutletSchema>;
