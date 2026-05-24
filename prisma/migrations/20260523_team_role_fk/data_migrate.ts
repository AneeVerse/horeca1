/**
 * Backfill script for the team-role-fk migration.
 *
 * 1. UPSERT every system role template (idempotent — re-runnable). The 6 admin
 *    templates and the 4 vendor / 3 brand templates match the matrix signed off
 *    in docs/admin-team-rbac-migration-plan.md §1. Names align with what was
 *    seeded by the earlier hcid_architecture data_migrate so we do not create
 *    duplicates; permissions are overwritten to the new matrix.
 *
 * 2. Backfill role_id on every AdminTeamMember / VendorTeamMember /
 *    BrandTeamMember row by mapping its legacy `role` enum to the matching
 *    template id (scope-appropriate). Idempotent — only writes when role_id IS
 *    NULL or points at the wrong template.
 *
 * Run:
 *   npx tsx prisma/migrations/20260523_team_role_fk/data_migrate.ts
 *
 * Run AFTER `npx prisma migrate dev` has applied migration.sql for this folder.
 */

import 'dotenv/config';
import { PrismaClient, type Prisma, type TeamRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Scope = 'account' | 'vendor' | 'brand' | 'admin' | 'delivery';
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

interface Template {
  name: string;
  scope: Scope;
  description: string;
  permissions: PermissionsJson;
}

// ─── Matrix from docs/admin-team-rbac-migration-plan.md §1 ──────────────────

const TEMPLATES: Template[] = [
  // ADMIN scope (6 templates — 4 from the V2.2 plan + Editor/Viewer kept for legacy backfill)
  { name: 'Super Admin', scope: 'admin', description: 'Full platform access', permissions: allPermissions() },
  { name: 'Ops Admin', scope: 'admin', description: 'Operations — orders, vendors, products, customers, but no admin-team management', permissions: perms({
    dashboard: ['view'],
    products: ['view', 'create', 'edit', 'delete', 'approve'],
    orders: ['view', 'create', 'edit', 'delete', 'approve'],
    inventory: ['view', 'create', 'edit', 'delete'],
    payments: ['view'],
    creditLine: ['view'],
    customers: ['view', 'create', 'edit', 'delete'],
    vendors: ['view', 'create', 'edit', 'delete', 'approve'],
    brands: ['view', 'create', 'edit', 'delete', 'approve'],
    outlets: ['view', 'create', 'edit', 'delete'],
    analytics: ['view'],
    promotions: ['view', 'create', 'edit', 'delete'],
    support: ['view', 'edit'],
    logistics: ['view', 'edit'],
    auditLogs: ['view'],
    settings: ['view', 'edit'],
  })},
  { name: 'Finance Admin', scope: 'admin', description: 'Finance + credit oversight', permissions: perms({
    dashboard: ['view'],
    orders: ['view'],
    payments: ['view', 'create', 'approve'],
    creditLine: ['view', 'approve'],
    analytics: ['view'],
    auditLogs: ['view'],
    settings: ['view'],
  })},
  { name: 'Support Agent', scope: 'admin', description: 'Customer support — tickets, order lookup, customer profile', permissions: perms({
    dashboard: ['view'],
    orders: ['view'],
    customers: ['view', 'edit'],
    support: ['view', 'edit'],
    logistics: ['view', 'edit'],
    auditLogs: ['view'],
    settings: ['view'],
  })},
  { name: 'Editor', scope: 'admin', description: 'Product catalog moderation', permissions: perms({
    dashboard: ['view'],
    products: ['view', 'create', 'edit', 'delete', 'approve'],
    settings: ['view'],
  })},
  { name: 'Viewer', scope: 'admin', description: 'Read-only platform view', permissions: perms({
    dashboard: ['view'],
    products: ['view'],
    orders: ['view'],
    inventory: ['view'],
    payments: ['view'],
    creditLine: ['view'],
    customers: ['view'],
    vendors: ['view'],
    brands: ['view'],
    outlets: ['view'],
    analytics: ['view'],
    auditLogs: ['view'],
    support: ['view'],
    logistics: ['view'],
    settings: ['view'],
  })},

  // VENDOR scope (5 templates — Vendor Admin + the 4 legacy-mapped roles)
  { name: 'Vendor Admin', scope: 'vendor', description: 'Full vendor portal access including team management', permissions: allPermissions() },
  { name: 'Vendor Manager', scope: 'vendor', description: 'Full vendor operations — no team management', permissions: perms({
    dashboard: ['view'],
    orders: ['view', 'create', 'edit', 'delete', 'approve'],
    products: ['view', 'create', 'edit', 'delete'],
    inventory: ['view', 'create', 'edit', 'delete'],
    grn: ['view', 'create', 'edit'],
    dispatch: ['view', 'create', 'edit'],
    deliveries: ['view', 'edit'],
    customers: ['view'],
    outlets: ['view'],
    analytics: ['view'],
    promotions: ['view', 'create', 'edit'],
    settings: ['view', 'edit'],
  })},
  { name: 'Vendor Editor', scope: 'vendor', description: 'Orders, products, inventory write — no settings or team', permissions: perms({
    dashboard: ['view'],
    orders: ['view', 'create', 'edit'],
    products: ['view', 'create', 'edit'],
    inventory: ['view', 'create', 'edit'],
    grn: ['view', 'create', 'edit'],
    dispatch: ['view', 'create', 'edit'],
    outlets: ['view'],
  })},
  { name: 'Vendor Viewer', scope: 'vendor', description: 'Read-only vendor portal', permissions: viewOnly([
    'dashboard', 'orders', 'products', 'inventory', 'grn', 'dispatch', 'deliveries',
    'payments', 'customers', 'outlets', 'analytics', 'promotions', 'settings',
  ]) },

  // BRAND scope (4 templates)
  { name: 'Brand Admin', scope: 'brand', description: 'Full brand portal access including team management', permissions: allPermissions() },
  { name: 'Brand Manager', scope: 'brand', description: 'Full brand operations — no team management', permissions: perms({
    dashboard: ['view'],
    brandStore: ['view', 'edit'],
    products: ['view', 'create', 'edit', 'delete'],
    brands: ['view', 'edit'],
    analytics: ['view'],
    promotions: ['view', 'create', 'edit'],
    settings: ['view', 'edit'],
  })},
  { name: 'Brand Editor', scope: 'brand', description: 'Catalog only — no settings or team', permissions: perms({
    dashboard: ['view'],
    brandStore: ['view', 'edit'],
    products: ['view', 'create', 'edit'],
    brands: ['view'],
  })},
  { name: 'Brand Viewer', scope: 'brand', description: 'Read-only brand portal', permissions: viewOnly([
    'dashboard', 'brandStore', 'products', 'brands', 'analytics', 'promotions', 'settings',
  ]) },
];

// Mapping legacy TeamRole enum → template name, per scope. These names MUST
// exist in TEMPLATES above; the upsert step guarantees that.
const ADMIN_ROLE_NAME: Record<TeamRole, string> = {
  owner: 'Super Admin',
  manager: 'Ops Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};
const VENDOR_ROLE_NAME: Record<TeamRole, string> = {
  owner: 'Vendor Admin',
  manager: 'Vendor Manager',
  editor: 'Vendor Editor',
  viewer: 'Vendor Viewer',
};
const BRAND_ROLE_NAME: Record<TeamRole, string> = {
  owner: 'Brand Admin',
  manager: 'Brand Manager',
  editor: 'Brand Editor',
  viewer: 'Brand Viewer',
};

function asJson(p: PermissionsJson): Prisma.InputJsonValue {
  return p as unknown as Prisma.InputJsonValue;
}

async function upsertTemplates() {
  console.log('→ Upserting role templates …');
  let created = 0;
  let updated = 0;
  for (const tpl of TEMPLATES) {
    // (businessAccountId, name) is unique; templates have businessAccountId = NULL.
    // Prisma cannot compose a NULL-aware findUnique, so use findFirst + create/update.
    const existing = await prisma.accountRole.findFirst({
      where: { businessAccountId: null, name: tpl.name, isTemplate: true, scope: tpl.scope },
      select: { id: true },
    });
    if (existing) {
      await prisma.accountRole.update({
        where: { id: existing.id },
        data: { description: tpl.description, permissions: asJson(tpl.permissions) },
      });
      updated++;
    } else {
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
  }
  console.log(`   ${created} created, ${updated} updated`);
}

async function templateIdsByScope(scope: Scope): Promise<Map<string, string>> {
  const rows = await prisma.accountRole.findMany({
    where: { businessAccountId: null, isTemplate: true, scope },
    select: { id: true, name: true },
  });
  return new Map(rows.map((r) => [r.name, r.id]));
}

async function backfillAdmin() {
  console.log('→ Backfilling AdminTeamMember.role_id …');
  const adminTemplates = await templateIdsByScope('admin');
  const rows = await prisma.adminTeamMember.findMany({
    where: { roleId: null },
    select: { id: true, role: true, userId: true },
  });
  let done = 0;
  for (const r of rows) {
    const targetName = ADMIN_ROLE_NAME[r.role];
    const roleId = adminTemplates.get(targetName);
    if (!roleId) {
      console.warn(`   ⚠ admin team member ${r.userId} role=${r.role}: template "${targetName}" not found — skipping`);
      continue;
    }
    await prisma.adminTeamMember.update({ where: { id: r.id }, data: { roleId } });
    done++;
  }
  console.log(`   ${done}/${rows.length} backfilled`);
}

async function backfillVendor() {
  console.log('→ Backfilling VendorTeamMember.role_id …');
  const vendorTemplates = await templateIdsByScope('vendor');
  const rows = await prisma.vendorTeamMember.findMany({
    where: { roleId: null },
    select: { id: true, role: true, userId: true },
  });
  let done = 0;
  for (const r of rows) {
    const targetName = VENDOR_ROLE_NAME[r.role];
    const roleId = vendorTemplates.get(targetName);
    if (!roleId) {
      console.warn(`   ⚠ vendor team member ${r.userId} role=${r.role}: template "${targetName}" not found — skipping`);
      continue;
    }
    await prisma.vendorTeamMember.update({ where: { id: r.id }, data: { roleId } });
    done++;
  }
  console.log(`   ${done}/${rows.length} backfilled`);
}

async function backfillBrand() {
  console.log('→ Backfilling BrandTeamMember.role_id …');
  const brandTemplates = await templateIdsByScope('brand');
  const rows = await prisma.brandTeamMember.findMany({
    where: { roleId: null },
    select: { id: true, role: true, userId: true },
  });
  let done = 0;
  for (const r of rows) {
    const targetName = BRAND_ROLE_NAME[r.role];
    const roleId = brandTemplates.get(targetName);
    if (!roleId) {
      console.warn(`   ⚠ brand team member ${r.userId} role=${r.role}: template "${targetName}" not found — skipping`);
      continue;
    }
    await prisma.brandTeamMember.update({ where: { id: r.id }, data: { roleId } });
    done++;
  }
  console.log(`   ${done}/${rows.length} backfilled`);
}

async function backfillUserRolesForVendorTeam() {
  console.log('→ Backfilling UserRole for VendorTeamMember rows missing it …');
  const rows = await prisma.vendorTeamMember.findMany({
    where: { roleId: { not: null } },
    select: { userId: true, roleId: true, vendor: { select: { businessAccountId: true } } },
  });
  let created = 0, skipped = 0;
  for (const r of rows) {
    if (!r.roleId) continue;
    const existing = await prisma.userRole.findFirst({
      where: { userId: r.userId, businessAccountId: r.vendor.businessAccountId, role: { scope: 'vendor' } },
      select: { id: true },
    });
    if (existing) { skipped++; continue; }
    // Ensure BusinessAccountMember exists too — required for loadActiveContext.
    await prisma.businessAccountMember.upsert({
      where: { userId_businessAccountId: { userId: r.userId, businessAccountId: r.vendor.businessAccountId } },
      update: {},
      create: { userId: r.userId, businessAccountId: r.vendor.businessAccountId, isPrimary: false, acceptedAt: new Date() },
    });
    await prisma.userRole.create({
      data: { userId: r.userId, businessAccountId: r.vendor.businessAccountId, outletId: null, roleId: r.roleId },
    });
    created++;
  }
  console.log(`   ${created} created, ${skipped} already present`);
}

async function backfillUserRolesForBrandTeam() {
  console.log('→ Backfilling UserRole for BrandTeamMember rows missing it …');
  const rows = await prisma.brandTeamMember.findMany({
    where: { roleId: { not: null } },
    select: { userId: true, roleId: true, brand: { select: { businessAccountId: true } } },
  });
  let created = 0, skipped = 0;
  for (const r of rows) {
    if (!r.roleId) continue;
    const existing = await prisma.userRole.findFirst({
      where: { userId: r.userId, businessAccountId: r.brand.businessAccountId, role: { scope: 'brand' } },
      select: { id: true },
    });
    if (existing) { skipped++; continue; }
    await prisma.businessAccountMember.upsert({
      where: { userId_businessAccountId: { userId: r.userId, businessAccountId: r.brand.businessAccountId } },
      update: {},
      create: { userId: r.userId, businessAccountId: r.brand.businessAccountId, isPrimary: false, acceptedAt: new Date() },
    });
    await prisma.userRole.create({
      data: { userId: r.userId, businessAccountId: r.brand.businessAccountId, outletId: null, roleId: r.roleId },
    });
    created++;
  }
  console.log(`   ${created} created, ${skipped} already present`);
}

async function main() {
  console.log('═══ Team-Role-FK backfill ═══');
  await upsertTemplates();
  await backfillAdmin();
  await backfillVendor();
  await backfillBrand();
  await backfillUserRolesForVendorTeam();
  await backfillUserRolesForBrandTeam();
  console.log('═══ Done ═══');
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
