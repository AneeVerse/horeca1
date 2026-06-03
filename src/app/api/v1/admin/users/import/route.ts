import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { parseCustomerImport, type ParsedCustomerRow } from '@/modules/import-export/excel.service';
import { requirePermission } from '@/lib/permissions/engine';
import { uniqueHcid } from '@/lib/hcid';

interface CustomerPreviewItem {
  row: number;
  action: 'create' | 'update' | 'skip';
  name: string;
  phone: string;
  email?: string;
  businessName: string;
  gstin?: string;
  pan?: string;
  fssai?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPincode?: string;
  deliveryAddress: string;
  deliveryPincode: string;
  territory?: string;
  salesExecutive?: string;
  tags?: string[];
  skipReason?: string;
  existing?: {
    id: string;
    fullName: string;
    phone: string;
    businessName?: string | null;
    gstNumber?: string | null;
  };
}

interface CustomerPreviewResponse {
  totalRows: number;
  creates: number;
  updates: number;
  skips: number;
  errors: { row: number; field?: string; message: string }[];
  items: CustomerPreviewItem[];
}

interface CustomerCommitResponse {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'users.create');
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw Errors.notFound('File');

    const vendorId = formData.get('vendorId') as string | null || null;
    const mode = (formData.get('mode') as string) || 'preview'; // 'preview' | 'commit'

    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
      if (!vendor) throw Errors.notFound('Vendor');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, errors: parseErrors } = parseCustomerImport(buffer);

    if (rows.length === 0 && parseErrors.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalRows: 0, creates: 0, updates: 0, skips: 0,
          errors: [{ row: 0, message: 'No valid rows found in file' }],
          items: [],
        } satisfies CustomerPreviewResponse,
      });
    }

    // Resolve existing users by phone number to determine creates vs updates
    const phones = rows.map(r => r.phone);
    const existingUsers = phones.length > 0
      ? await prisma.user.findMany({
          where: { phone: { in: phones } },
          select: { id: true, fullName: true, phone: true, businessName: true, gstNumber: true },
        })
      : [];

    const existingUserMap = new Map<string, typeof existingUsers[0]>();
    for (const u of existingUsers) {
      if (u.phone) existingUserMap.set(u.phone, u);
    }

    // Look up default Owner role template
    const ownerTemplate = await prisma.accountRole.findFirst({
      where: { businessAccountId: null, isTemplate: true, name: 'Owner', scope: 'account' },
      select: { id: true },
    });
    if (!ownerTemplate) {
      throw Errors.badRequest('Owner role template missing. Run data backfill first.');
    }

    if (mode === 'preview') {
      const items: CustomerPreviewItem[] = [];
      let creates = 0;
      let updates = 0;
      const skips = 0;

      rows.forEach((r, idx) => {
        const rowNum = idx + 2;
        const existing = existingUserMap.get(r.phone);

        if (existing) {
          updates++;
          items.push({
            row: rowNum,
            action: 'update',
            name: r.name,
            phone: r.phone,
            email: r.email,
            businessName: r.businessName,
            gstin: r.gstin,
            pan: r.pan,
            fssai: r.fssai,
            billingAddress: r.billingAddress,
            billingCity: r.billingCity,
            billingState: r.billingState,
            billingPincode: r.billingPincode,
            deliveryAddress: r.deliveryAddress,
            deliveryPincode: r.deliveryPincode,
            territory: r.territory,
            salesExecutive: r.salesExecutive,
            tags: r.tags,
            existing: {
              id: existing.id,
              fullName: existing.fullName,
              phone: existing.phone || '',
              businessName: existing.businessName,
              gstNumber: existing.gstNumber,
            },
          });
        } else {
          creates++;
          items.push({
            row: rowNum,
            action: 'create',
            name: r.name,
            phone: r.phone,
            email: r.email,
            businessName: r.businessName,
            gstin: r.gstin,
            pan: r.pan,
            fssai: r.fssai,
            billingAddress: r.billingAddress,
            billingCity: r.billingCity,
            billingState: r.billingState,
            billingPincode: r.billingPincode,
            deliveryAddress: r.deliveryAddress,
            deliveryPincode: r.deliveryPincode,
            territory: r.territory,
            salesExecutive: r.salesExecutive,
            tags: r.tags,
          });
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          totalRows: rows.length,
          creates,
          updates,
          skips,
          errors: parseErrors,
          items,
        } satisfies CustomerPreviewResponse,
      });
    }

    // ── COMMIT MODE ──
    let createdCount = 0;
    let updatedCount = 0;
    const commitErrors: { row: number; message: string }[] = [];

    // Perform creation/updating sequentially in a series of transactions or a single big transaction.
    // Sequentially is safer for row-by-row error tracing.
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const rowNum = idx + 2;

      try {
        await prisma.$transaction(async (tx) => {
          const existing = existingUserMap.get(r.phone);

          let userId: string;
          if (existing) {
            userId = existing.id;
            // Update User fields
            await tx.user.update({
              where: { id: userId },
              data: {
                fullName: r.name,
                email: r.email || undefined,
                businessName: r.businessName,
                gstNumber: r.gstin || undefined,
                pincode: r.deliveryPincode,
              },
            });

            // Find associated BusinessAccount Member
            const membership = await tx.businessAccountMember.findFirst({
              where: { userId, isPrimary: true },
              select: { businessAccountId: true },
            });

            let bizAccountId = membership?.businessAccountId;

            if (bizAccountId) {
              // Update BusinessAccount
              await tx.businessAccount.update({
                where: { id: bizAccountId },
                data: {
                  legalName: r.businessName,
                  displayName: r.tradeName || r.businessName,
                  gstin: r.gstin || undefined,
                  pan: r.pan || undefined,
                  fssaiNumber: r.fssai || undefined,
                  billingAddressLine: r.billingAddress || undefined,
                  billingCity: r.billingCity || undefined,
                  billingState: r.billingState || undefined,
                  billingPincode: r.billingPincode || undefined,
                },
              });

              // Find primary outlet
              const outlet = await tx.outlet.findFirst({
                where: { businessAccountId: bizAccountId },
                orderBy: { createdAt: 'asc' },
              });

              if (outlet) {
                await tx.outlet.update({
                  where: { id: outlet.id },
                  data: {
                    name: r.businessName + ' - Main',
                    addressLine: r.deliveryAddress,
                    pincode: r.deliveryPincode,
                  },
                });
              } else {
                await tx.outlet.create({
                  data: {
                    businessAccountId: bizAccountId,
                    name: r.businessName + ' - Main',
                    addressLine: r.deliveryAddress,
                    pincode: r.deliveryPincode,
                  },
                });
              }
            } else {
              // Create Business Account if missing
              const account = await tx.businessAccount.create({
                data: {
                  legalName: r.businessName,
                  displayName: r.tradeName || r.businessName,
                  gstin: r.gstin || undefined,
                  pan: r.pan || undefined,
                  fssaiNumber: r.fssai || undefined,
                  billingAddressLine: r.billingAddress || undefined,
                  billingCity: r.billingCity || undefined,
                  billingState: r.billingState || undefined,
                  billingPincode: r.billingPincode || undefined,
                  isCustomer: true,
                },
              });
              bizAccountId = account.id;

              await tx.businessAccountMember.create({
                data: { userId, businessAccountId: bizAccountId, isPrimary: true, acceptedAt: new Date() },
              });

              const primaryOutlet = await tx.outlet.create({
                data: {
                  businessAccountId: bizAccountId,
                  name: r.businessName + ' - Main',
                  addressLine: r.deliveryAddress,
                  pincode: r.deliveryPincode,
                },
              });

              await tx.businessAccount.update({
                where: { id: bizAccountId },
                data: { primaryOutletId: primaryOutlet.id },
              });

              await tx.userRole.create({
                data: { userId, businessAccountId: bizAccountId, outletId: null, roleId: ownerTemplate.id },
              });
            }

            updatedCount++;
          } else {
            // Create user
            const hcidDisplay = await uniqueHcid();
            const user = await tx.user.create({
              data: {
                fullName: r.name,
                phone: r.phone,
                email: r.email || null,
                businessName: r.businessName,
                gstNumber: r.gstin || null,
                pincode: r.deliveryPincode,
                role: 'customer',
                isActive: true,
                hcidDisplay,
              },
            });
            userId = user.id;

            const account = await tx.businessAccount.create({
              data: {
                legalName: r.businessName,
                displayName: r.tradeName || r.businessName,
                gstin: r.gstin || null,
                pan: r.pan || null,
                fssaiNumber: r.fssai || null,
                billingAddressLine: r.billingAddress || null,
                billingCity: r.billingCity || null,
                billingState: r.billingState || null,
                billingPincode: r.billingPincode || null,
                isCustomer: true,
              },
            });

            await tx.businessAccountMember.create({
              data: { userId, businessAccountId: account.id, isPrimary: true, acceptedAt: new Date() },
            });

            const primaryOutlet = await tx.outlet.create({
              data: {
                businessAccountId: account.id,
                name: r.businessName + ' - Main',
                addressLine: r.deliveryAddress,
                pincode: r.deliveryPincode,
              },
            });

            await tx.businessAccount.update({
              where: { id: account.id },
              data: { primaryOutletId: primaryOutlet.id },
            });

            await tx.userRole.create({
              data: { userId, businessAccountId: account.id, outletId: null, roleId: ownerTemplate.id },
            });

            createdCount++;
          }

          // Handle vendor customer mapping
          if (vendorId) {
            await tx.vendorCustomer.upsert({
              where: {
                vendorId_userId: { vendorId, userId },
              },
              create: {
                vendorId,
                userId,
                status: 'active',
                salesExecutive: r.salesExecutive || null,
                territory: r.territory || null,
                tags: r.tags || [],
              },
              update: {
                status: 'active',
                salesExecutive: r.salesExecutive || null,
                territory: r.territory || null,
                tags: r.tags || [],
              },
            });

            // Ensure CreditAccount exists
            const existingCredit = await tx.creditAccount.findUnique({
              where: { userId_vendorId: { userId, vendorId } },
            });
            if (!existingCredit) {
              await tx.creditAccount.create({
                data: {
                  userId,
                  vendorId,
                  creditLimit: 0,
                  creditUsed: 0,
                  status: 'active',
                },
              });
            }
          }
        });
      } catch (err: unknown) {
        commitErrors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : 'Unknown database error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created: createdCount,
        updated: updatedCount,
        errors: commitErrors,
      } satisfies CustomerCommitResponse,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
