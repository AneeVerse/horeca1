/**
 * V2.2 HCID Architecture — Data Backfill (Step B)
 *
 * Idempotent script that:
 *   1. Seeds system AccountRole templates (Owner, Procurement Manager, etc.)
 *   2. Backfills User.hcid_display for every user
 *   3. Auto-provisions a BusinessAccount for every Vendor / Brand / customer User
 *   4. Creates Outlets from existing Vendor / Brand / SavedAddress data
 *   5. Migrates VendorTeamMember / BrandTeamMember → BusinessAccountMember + UserRole
 *   6. Stamps businessAccountId + outletId on Cart / Order / QuickOrderList / CustomerVendor
 *   7. Links SavedAddress → Outlet
 *
 * Run AFTER `migration.sql` for 20260520_hcid_architecture_step_a is applied
 * and BEFORE 20260520_hcid_architecture_step_c is applied.
 *
 * Usage:  npx tsx prisma/migrations/20260520_hcid_architecture_step_a/data_migrate.ts
 *
 * Safe to re-run on partial failure (every step checks existence before inserting).
 */

import { PrismaClient, type Prisma, type TeamRole } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ─── permission JSON helpers ─────────────────────────────────────────────

type PermissionsJson = Record<string, Record<string, boolean>>;

const ALL_MODULES = [
  'dashboard', 'products', 'brandStore', 'orders', 'repeatOrders', 'inventory',
  'grn', 'dispatch', 'deliveries', 'payments', 'creditLine', 'customers',
  'vendors', 'brands', 'users', 'outlets', 'analytics', 'promotions',
  'support', 'logistics', 'auditLogs', 'settings',
] as const;

const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'] as const;

function allPermissions(): PermissionsJson {
  const out: PermissionsJson = {};
  for (const m of ALL_MODULES) {
    out[m] = {};
    for (const a of ALL_ACTIONS) out[m][a] = true;
  }
  return out;
}

function viewOnly(modules: readonly string[]): PermissionsJson {
  const out: PermissionsJson = {};
  for (const m of modules) out[m] = { view: true };
  return out;
}

function perms(spec: Record<string, readonly string[]>): PermissionsJson {
  const out: PermissionsJson = {};
  for (const [m, actions] of Object.entries(spec)) {
    out[m] = {};
    for (const a of actions) out[m][a] = true;
  }
  return out;
}

// ─── seeded templates (businessAccountId = null, isTemplate = true) ─────

const SEED_TEMPLATES: Array<{
  name: string;
  scope: 'account' | 'vendor' | 'brand' | 'admin' | 'delivery';
  description: string;
  permissions: PermissionsJson;
}> = [
  // CUSTOMER scope
  { name: 'Owner', scope: 'account', description: 'Account owner — full access', permissions: allPermissions() },
  { name: 'Procurement Manager', scope: 'account', description: 'Manages procurement, orders, repeat orders', permissions: perms({
    dashboard: ['view'], orders: ['view','create','edit','approve'], repeatOrders: ['view','create','edit'],
    products: ['view'], inventory: ['view'], grn: ['view','create'], payments: ['view'],
    vendors: ['view'], outlets: ['view'], analytics: ['view'],
  })},
  { name: 'Store Manager', scope: 'account', description: 'Operates a single outlet', permissions: perms({
    dashboard: ['view'], orders: ['view','create','edit'], grn: ['view','create','edit'],
    inventory: ['view','edit'], deliveries: ['view'], outlets: ['view'],
  })},
  { name: 'Chef', scope: 'account', description: 'Creates orders from approved lists', permissions: perms({
    orders: ['view','create'], repeatOrders: ['view','create'], products: ['view'], outlets: ['view'],
  })},
  { name: 'Accountant', scope: 'account', description: 'Finance + payments visibility', permissions: perms({
    dashboard: ['view'], orders: ['view'], payments: ['view','approve'], creditLine: ['view','approve'],
    analytics: ['view'], auditLogs: ['view'],
  })},
  { name: 'Viewer', scope: 'account', description: 'Read-only across modules', permissions: viewOnly(ALL_MODULES) },

  // VENDOR scope
  { name: 'Vendor Admin', scope: 'vendor', description: 'Full vendor portal access', permissions: allPermissions() },
  { name: 'Sales Rep', scope: 'vendor', description: 'Customer-facing sales', permissions: perms({
    dashboard: ['view'], orders: ['view','create','edit'], customers: ['view','create','edit'],
    products: ['view'], inventory: ['view'], promotions: ['view','create','edit'],
  })},
  { name: 'Order Manager', scope: 'vendor', description: 'Order processing + dispatch', permissions: perms({
    dashboard: ['view'], orders: ['view','edit','approve'], dispatch: ['view','create','edit'],
    deliveries: ['view','edit'], grn: ['view'], inventory: ['view'],
  })},
  { name: 'Warehouse Manager', scope: 'vendor', description: 'Inventory + GRN', permissions: perms({
    inventory: ['view','create','edit','delete'], grn: ['view','create','edit'],
    dispatch: ['view','create'], products: ['view'],
  })},
  { name: 'Finance Executive', scope: 'vendor', description: 'Payments + ledgers', permissions: perms({
    dashboard: ['view'], payments: ['view','create','approve'], creditLine: ['view','approve'],
    orders: ['view'], analytics: ['view'], auditLogs: ['view'],
  })},

  // BRAND scope
  { name: 'Brand Admin', scope: 'brand', description: 'Full brand portal access', permissions: allPermissions() },
  { name: 'Brand Manager', scope: 'brand', description: 'Catalog + mappings', permissions: perms({
    dashboard: ['view'], brandStore: ['view','edit'], products: ['view','create','edit'],
    brands: ['view','edit'], analytics: ['view'],
  })},
  { name: 'Marketing Executive', scope: 'brand', description: 'Promotions + analytics', permissions: perms({
    dashboard: ['view'], brandStore: ['view'], promotions: ['view','create','edit'],
    analytics: ['view'],
  })},

  // ADMIN scope (Horeca1 internal)
  { name: 'Super Admin', scope: 'admin', description: 'Full platform access', permissions: allPermissions() },
  { name: 'Ops Admin', scope: 'admin', description: 'Operations: orders, vendors, customers', permissions: perms({
    dashboard: ['view'], orders: ['view','edit','approve'], vendors: ['view','edit','approve'],
    customers: ['view','edit'], deliveries: ['view','edit','approve'], support: ['view','edit'],
    auditLogs: ['view'], settings: ['view'],
  })},
  { name: 'Finance Admin', scope: 'admin', description: 'Finance + credit oversight', permissions: perms({
    dashboard: ['view'], payments: ['view','approve'], creditLine: ['view','approve'],
    analytics: ['view'], auditLogs: ['view'],
  })},
  { name: 'Support Agent', scope: 'admin', description: 'Customer support tickets', permissions: perms({
    support: ['view','edit'], orders: ['view'], customers: ['view'], auditLogs: ['view'],
  })},
];

// TeamRole → seeded role-name map (for migrating VendorTeamMember/BrandTeamMember)
const VENDOR_TEAM_ROLE_MAP: Record<TeamRole, string> = {
  owner: 'Vendor Admin',
  manager: 'Order Manager',
  editor: 'Warehouse Manager',
  viewer: 'Viewer',
};

const BRAND_TEAM_ROLE_MAP: Record<TeamRole, string> = {
  owner: 'Brand Admin',
  manager: 'Brand Manager',
  editor: 'Marketing Executive',
  viewer: 'Viewer',
};

// ─── helpers ─────────────────────────────────────────────────────────────

function generateHcid(): string {
  // 5 random bytes → 8 base32 chars → "HC-XXXX-XXXX"
  const buf = crypto.randomBytes(5);
  const b32 = buf.toString('base64')
    .replace(/[+/=]/g, '')
    .toUpperCase()
    .slice(0, 8)
    .padEnd(8, '0');
  return `HC-${b32.slice(0, 4)}-${b32.slice(4, 8)}`;
}

async function uniqueHcid(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = generateHcid();
    const existing = await prisma.user.findUnique({ where: { hcidDisplay: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  throw new Error('Could not generate unique HCID after 10 attempts');
}

// Wrap permissions JSON for Prisma
function asJson(p: PermissionsJson): Prisma.InputJsonValue {
  return p as unknown as Prisma.InputJsonValue;
}

// ─── steps ───────────────────────────────────────────────────────────────

async function seedRoleTemplates() {
  console.log('→ Seeding system role templates …');
  let created = 0, skipped = 0;
  for (const tpl of SEED_TEMPLATES) {
    // businessAccountId NULL + unique on (businessAccountId, name); use findFirst because Prisma
    // can't compose unique-with-NULL lookups via findUnique.
    const existing = await prisma.accountRole.findFirst({
      where: { businessAccountId: null, name: tpl.name, isTemplate: true },
      select: { id: true },
    });
    if (existing) { skipped++; continue; }
    await prisma.accountRole.create({
      data: {
        businessAccountId: null,
        name: tpl.name,
        description: tpl.description,
        permissions: asJson(tpl.permissions),
        isTemplate: true,
        scope: tpl.scope,
      },
    });
    created++;
  }
  console.log(`   ${created} created, ${skipped} already present`);
}

async function backfillHcid() {
  console.log('→ Backfilling User.hcid_display …');
  const users = await prisma.user.findMany({
    where: { hcidDisplay: null },
    select: { id: true },
  });
  let done = 0;
  for (const u of users) {
    const hcid = await uniqueHcid();
    await prisma.user.update({ where: { id: u.id }, data: { hcidDisplay: hcid } });
    done++;
  }
  console.log(`   ${done} users assigned HCID`);
}

async function getTemplateId(name: string, scope: string): Promise<string> {
  const r = await prisma.accountRole.findFirst({
    where: { businessAccountId: null, name, isTemplate: true, scope: scope as 'account' | 'vendor' | 'brand' | 'admin' | 'delivery' },
    select: { id: true },
  });
  if (!r) throw new Error(`Missing seeded template: ${scope}/${name}`);
  return r.id;
}

async function migrateVendors() {
  console.log('→ Migrating Vendors → BusinessAccount + Outlet + Owner UserRole …');
  const vendors = await prisma.vendor.findMany({
    where: { businessAccountId: null },
    select: {
      id: true, userId: true, businessName: true, gstNumber: true,
      addressLine: true, city: true, state: true, addressPincode: true,
    },
  });

  const vendorAdminTemplateId = await getTemplateId('Vendor Admin', 'vendor');
  let done = 0;

  for (const v of vendors) {
    await prisma.$transaction(async (tx) => {
      const ba = await tx.businessAccount.create({
        data: {
          legalName: v.businessName,
          displayName: v.businessName,
          gstin: v.gstNumber ?? null,
          businessType: 'vendor',
          isCustomer: true,
          isVendor: true,
          isBrand: false,
          status: 'active',
        },
      });

      const outlet = await tx.outlet.create({
        data: {
          businessAccountId: ba.id,
          name: `${v.businessName} — Primary`,
          addressLine: v.addressLine ?? `${v.businessName} (address pending)`,
          city: v.city,
          state: v.state,
          pincode: v.addressPincode,
          latitude: null,
          longitude: null,
          requiresAddressUpdate: !v.addressLine,
        },
      });

      await tx.businessAccount.update({
        where: { id: ba.id },
        data: { primaryOutletId: outlet.id },
      });

      await tx.businessAccountMember.create({
        data: {
          userId: v.userId,
          businessAccountId: ba.id,
          isPrimary: true,
          acceptedAt: new Date(),
        },
      });

      await tx.userRole.create({
        data: {
          userId: v.userId,
          businessAccountId: ba.id,
          outletId: null,
          roleId: vendorAdminTemplateId,
        },
      });

      await tx.vendor.update({ where: { id: v.id }, data: { businessAccountId: ba.id } });
    });
    done++;
  }
  console.log(`   ${done} vendors migrated`);
}

async function migrateBrands() {
  console.log('→ Migrating Brands → BusinessAccount + Brand HQ Outlet + Owner UserRole …');
  const brands = await prisma.brand.findMany({
    where: { businessAccountId: null },
    select: { id: true, userId: true, name: true },
  });

  const brandAdminTemplateId = await getTemplateId('Brand Admin', 'brand');
  let done = 0;

  for (const b of brands) {
    await prisma.$transaction(async (tx) => {
      const ba = await tx.businessAccount.create({
        data: {
          legalName: b.name,
          displayName: b.name,
          businessType: 'brand',
          isCustomer: false,
          isVendor: false,
          isBrand: true,
          status: 'active',
        },
      });

      const outlet = await tx.outlet.create({
        data: {
          businessAccountId: ba.id,
          name: `${b.name} — Brand HQ`,
          addressLine: 'Brand HQ — address pending',
          latitude: null,
          longitude: null,
          requiresAddressUpdate: true,
        },
      });

      await tx.businessAccount.update({
        where: { id: ba.id },
        data: { primaryOutletId: outlet.id },
      });

      await tx.businessAccountMember.create({
        data: {
          userId: b.userId,
          businessAccountId: ba.id,
          isPrimary: true,
          acceptedAt: new Date(),
        },
      });

      await tx.userRole.create({
        data: {
          userId: b.userId,
          businessAccountId: ba.id,
          outletId: null,
          roleId: brandAdminTemplateId,
        },
      });

      await tx.brand.update({ where: { id: b.id }, data: { businessAccountId: ba.id } });
    });
    done++;
  }
  console.log(`   ${done} brands migrated`);
}

async function migrateCustomers() {
  console.log('→ Provisioning BusinessAccount for customer Users with no membership …');
  const customers = await prisma.user.findMany({
    where: {
      role: 'customer',
      accountMemberships: { none: {} },
    },
    select: {
      id: true, fullName: true, businessName: true, gstNumber: true,
      savedAddresses: {
        where: { isDefault: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });

  const ownerTemplateId = await getTemplateId('Owner', 'account');
  let done = 0;

  for (const u of customers) {
    const addr = u.savedAddresses[0];
    await prisma.$transaction(async (tx) => {
      const ba = await tx.businessAccount.create({
        data: {
          legalName: u.businessName ?? u.fullName ?? 'My Business',
          displayName: u.businessName ?? u.fullName ?? null,
          gstin: u.gstNumber ?? null,
          businessType: 'customer',
          isCustomer: true,
          isVendor: false,
          isBrand: false,
          status: 'active',
        },
      });

      const outlet = await tx.outlet.create({
        data: {
          businessAccountId: ba.id,
          name: u.businessName ?? 'Primary Outlet',
          addressLine: addr?.fullAddress ?? 'Address pending',
          flatInfo: addr?.flatInfo ?? null,
          landmark: addr?.landmark ?? null,
          city: addr?.city ?? null,
          state: addr?.state ?? null,
          pincode: addr?.pincode ?? null,
          latitude: addr?.latitude ?? null,
          longitude: addr?.longitude ?? null,
          placeId: addr?.placeId ?? null,
          requiresAddressUpdate: !addr,
        },
      });

      await tx.businessAccount.update({
        where: { id: ba.id },
        data: { primaryOutletId: outlet.id },
      });

      await tx.businessAccountMember.create({
        data: {
          userId: u.id,
          businessAccountId: ba.id,
          isPrimary: true,
          acceptedAt: new Date(),
        },
      });

      await tx.userRole.create({
        data: {
          userId: u.id,
          businessAccountId: ba.id,
          outletId: null,
          roleId: ownerTemplateId,
        },
      });

      if (addr) {
        await tx.savedAddress.update({ where: { id: addr.id }, data: { outletId: outlet.id } });
      }
    });
    done++;
  }
  console.log(`   ${done} customer accounts provisioned`);
}

async function migrateVendorTeamMembers() {
  console.log('→ Migrating VendorTeamMembers → BusinessAccountMember + UserRole …');
  const members = await prisma.vendorTeamMember.findMany({
    include: { vendor: { select: { businessAccountId: true } } },
  });
  let done = 0, skipped = 0;
  for (const m of members) {
    const baId = m.vendor.businessAccountId;
    if (!baId) { skipped++; continue; }
    const templateName = VENDOR_TEAM_ROLE_MAP[m.role];
    const scope = templateName === 'Viewer' ? 'account' : 'vendor';
    const templateId = await getTemplateId(templateName, scope);

    await prisma.$transaction(async (tx) => {
      // Membership: upsert by (userId, businessAccountId)
      await tx.businessAccountMember.upsert({
        where: { userId_businessAccountId: { userId: m.userId, businessAccountId: baId } },
        update: {},
        create: {
          userId: m.userId,
          businessAccountId: baId,
          isPrimary: false,
          invitedBy: m.invitedBy,
          acceptedAt: m.createdAt,
        },
      });
      // UserRole: idempotent (unique on userId, baId, outletId NULL, roleId)
      const existing = await tx.userRole.findFirst({
        where: { userId: m.userId, businessAccountId: baId, outletId: null, roleId: templateId },
        select: { id: true },
      });
      if (!existing) {
        await tx.userRole.create({
          data: { userId: m.userId, businessAccountId: baId, outletId: null, roleId: templateId },
        });
      }
    });
    done++;
  }
  console.log(`   ${done} vendor team members migrated (${skipped} skipped — vendor not yet linked)`);
}

async function migrateBrandTeamMembers() {
  console.log('→ Migrating BrandTeamMembers → BusinessAccountMember + UserRole …');
  const members = await prisma.brandTeamMember.findMany({
    include: { brand: { select: { businessAccountId: true } } },
  });
  let done = 0, skipped = 0;
  for (const m of members) {
    const baId = m.brand.businessAccountId;
    if (!baId) { skipped++; continue; }
    const templateName = BRAND_TEAM_ROLE_MAP[m.role];
    const scope = templateName === 'Viewer' ? 'account' : 'brand';
    const templateId = await getTemplateId(templateName, scope);

    await prisma.$transaction(async (tx) => {
      await tx.businessAccountMember.upsert({
        where: { userId_businessAccountId: { userId: m.userId, businessAccountId: baId } },
        update: {},
        create: {
          userId: m.userId,
          businessAccountId: baId,
          isPrimary: false,
          invitedBy: m.invitedBy,
          acceptedAt: m.createdAt,
        },
      });
      const existing = await tx.userRole.findFirst({
        where: { userId: m.userId, businessAccountId: baId, outletId: null, roleId: templateId },
        select: { id: true },
      });
      if (!existing) {
        await tx.userRole.create({
          data: { userId: m.userId, businessAccountId: baId, outletId: null, roleId: templateId },
        });
      }
    });
    done++;
  }
  console.log(`   ${done} brand team members migrated (${skipped} skipped — brand not yet linked)`);
}

async function migrateSavedAddresses() {
  console.log('→ Backfilling Outlet rows from SavedAddress (non-default) …');
  // Default addresses for customer accounts were already linked during migrateCustomers().
  // Here we handle the rest: every SavedAddress without an outletId becomes an Outlet
  // under the user's primary BusinessAccount.
  const addresses = await prisma.savedAddress.findMany({
    where: { outletId: null },
    include: {
      user: {
        select: {
          accountMemberships: {
            where: { isPrimary: true },
            select: { businessAccountId: true },
            take: 1,
          },
        },
      },
    },
  });

  let done = 0, skipped = 0;
  for (const a of addresses) {
    const baId = a.user.accountMemberships[0]?.businessAccountId;
    if (!baId) { skipped++; continue; }
    await prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.create({
        data: {
          businessAccountId: baId,
          name: a.label || a.businessName || 'Outlet',
          addressLine: a.fullAddress,
          flatInfo: a.flatInfo,
          landmark: a.landmark,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          latitude: a.latitude,
          longitude: a.longitude,
          placeId: a.placeId,
        },
      });
      await tx.savedAddress.update({ where: { id: a.id }, data: { outletId: outlet.id } });
    });
    done++;
  }
  console.log(`   ${done} saved addresses → outlets (${skipped} skipped — owner has no primary account)`);
}

async function stampOrders() {
  console.log('→ Stamping orders with businessAccountId + outletId + deliveryAddressSnapshot …');
  const orders = await prisma.order.findMany({
    where: { businessAccountId: null },
    include: {
      user: {
        select: {
          accountMemberships: {
            where: { isPrimary: true },
            select: {
              businessAccount: {
                select: {
                  id: true,
                  primaryOutletId: true,
                  outlets: { take: 1, orderBy: { createdAt: 'asc' }, select: { id: true } },
                },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  let done = 0, skipped = 0;
  for (const o of orders) {
    const membership = o.user.accountMemberships[0];
    const ba = membership?.businessAccount;
    if (!ba) { skipped++; continue; }
    const outletId = ba.primaryOutletId ?? ba.outlets[0]?.id;
    if (!outletId) { skipped++; continue; }

    // Snapshot delivery address from outlet
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
    const snapshot = outlet ? {
      addressLine: outlet.addressLine, flatInfo: outlet.flatInfo, landmark: outlet.landmark,
      city: outlet.city, state: outlet.state, pincode: outlet.pincode,
      latitude: outlet.latitude, longitude: outlet.longitude,
    } : null;

    await prisma.order.update({
      where: { id: o.id },
      data: {
        businessAccountId: ba.id,
        outletId,
        deliveryAddressSnapshot: snapshot as Prisma.InputJsonValue | undefined,
      },
    });
    done++;
  }
  console.log(`   ${done} orders stamped (${skipped} skipped — no inferable account/outlet)`);
}

async function stampCarts() {
  console.log('→ Stamping carts …');
  const carts = await prisma.cart.findMany({
    where: { businessAccountId: null },
    include: {
      user: {
        select: {
          accountMemberships: {
            where: { isPrimary: true },
            select: {
              businessAccount: { select: { id: true, primaryOutletId: true } },
            },
            take: 1,
          },
        },
      },
    },
  });
  let done = 0, skipped = 0;
  for (const c of carts) {
    const ba = c.user.accountMemberships[0]?.businessAccount;
    if (!ba?.primaryOutletId) { skipped++; continue; }
    await prisma.cart.update({
      where: { id: c.id },
      data: { businessAccountId: ba.id, outletId: ba.primaryOutletId },
    });
    done++;
  }
  console.log(`   ${done} carts stamped (${skipped} skipped)`);
}

async function stampQuickOrderLists() {
  console.log('→ Stamping quick order lists …');
  const lists = await prisma.quickOrderList.findMany({
    where: { businessAccountId: null },
    include: {
      user: {
        select: {
          accountMemberships: {
            where: { isPrimary: true },
            select: { businessAccountId: true },
            take: 1,
          },
        },
      },
    },
  });
  let done = 0, skipped = 0;
  for (const l of lists) {
    const baId = l.user.accountMemberships[0]?.businessAccountId;
    if (!baId) { skipped++; continue; }
    await prisma.quickOrderList.update({ where: { id: l.id }, data: { businessAccountId: baId } });
    done++;
  }
  console.log(`   ${done} quick-order lists stamped (${skipped} skipped)`);
}

async function stampCustomerVendors() {
  console.log('→ Stamping customer-vendor follows …');
  const links = await prisma.customerVendor.findMany({
    where: { businessAccountId: null },
    include: {
      user: {
        select: {
          accountMemberships: {
            where: { isPrimary: true },
            select: { businessAccountId: true },
            take: 1,
          },
        },
      },
    },
  });
  let done = 0, skipped = 0;
  for (const cv of links) {
    const baId = cv.user.accountMemberships[0]?.businessAccountId;
    if (!baId) { skipped++; continue; }
    await prisma.customerVendor.update({ where: { id: cv.id }, data: { businessAccountId: baId } });
    done++;
  }
  console.log(`   ${done} follows stamped (${skipped} skipped)`);
}

// ─── main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══ V2.2 HCID Architecture — Data Backfill ═══');
  const start = Date.now();

  await seedRoleTemplates();
  await backfillHcid();
  await migrateVendors();
  await migrateBrands();
  await migrateCustomers();
  await migrateVendorTeamMembers();
  await migrateBrandTeamMembers();
  await migrateSavedAddresses();
  await stampOrders();
  await stampCarts();
  await stampQuickOrderLists();
  await stampCustomerVendors();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`═══ Done in ${elapsed}s ═══`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
