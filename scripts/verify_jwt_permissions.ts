/**
 * Simulates what auth.ts would write into the JWT for every admin + vendor +
 * brand team user that exists in the DB. Confirms that:
 *   - Admin staff get permissions via applyAdminPermissions (legacy path,
 *     read from AdminTeamMember.roleId -> AccountRole.permissions).
 *   - Vendor / brand team users get permissions via loadActiveContext
 *     (V2.2 path, read from UserRole rows scoped to their BusinessAccount).
 *
 * Read-only. Run: npx tsx scripts/verify_jwt_permissions.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { flatten } from '../src/lib/permissions/engine';
import { loadActiveContext } from '../src/lib/activeContext';
import type { PermissionKey, PermissionsJson } from '../src/lib/permissions/registry';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function adminPermissions(userId: string): Promise<PermissionKey[]> {
  const member = await prisma.adminTeamMember.findUnique({
    where: { userId },
    select: { roleRef: { select: { name: true, permissions: true } } },
  });
  let set = flatten(member?.roleRef?.permissions as PermissionsJson | null);
  if (set.size === 0 && !member) {
    const superAdmin = await prisma.accountRole.findFirst({
      where: { name: 'Super Admin', scope: 'admin', isTemplate: true, businessAccountId: null },
      select: { permissions: true },
    });
    set = flatten(superAdmin?.permissions as PermissionsJson | null);
  }
  return Array.from(set);
}

async function loadActiveContextLite(userId: string): Promise<{ accountId: string | null; permissions: PermissionKey[]; roleNames: string[] }> {
  // Call the REAL loadActiveContext so this report can never drift from
  // production behaviour (an earlier version only merged account-wide roles
  // and falsely reported outlet-scoped members as having zero permissions).
  const active = await loadActiveContext(userId, null, null);
  if (!active) return { accountId: null, permissions: [], roleNames: [] };

  // Role names for display — mirrors the OR clause the engine uses.
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      businessAccountId: active.activeBusinessAccountId,
      OR: [{ outletId: null }, ...(active.activeOutletId ? [{ outletId: active.activeOutletId }] : [])],
    },
    select: { role: { select: { name: true } } },
  });
  return {
    accountId: active.activeBusinessAccountId,
    permissions: active.permissions,
    roleNames: userRoles.map((ur) => ur.role.name),
  };
}

async function main() {
  console.log('═══ Simulated JWT permissions per team user ═══\n');

  // ── Admin team ────────────────────────────────────────────────────────
  console.log('Admin users (incl. seeded owner):');
  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { id: true, fullName: true, email: true },
  });
  for (const a of admins) {
    const member = await prisma.adminTeamMember.findUnique({
      where: { userId: a.id },
      select: { roleRef: { select: { name: true } } },
    });
    const adminPerms = await adminPermissions(a.id);
    const ctx = await loadActiveContextLite(a.id);
    const all = new Set<string>([...adminPerms, ...ctx.permissions]);
    const role = member?.roleRef?.name ?? '(no team row — seeded owner)';
    console.log(`  • ${a.fullName} <${a.email}>`);
    console.log(`     role: ${role}`);
    console.log(`     admin perms: ${adminPerms.length} keys (sample: ${adminPerms.slice(0, 5).join(', ')}${adminPerms.length > 5 ? '…' : ''})`);
    if (ctx.accountId) console.log(`     + account perms via BusinessAccount: ${ctx.permissions.length} keys (${ctx.roleNames.join(', ')})`);
    console.log(`     → JWT permissions total (union): ${all.size}`);
  }

  // ── Vendor team ──────────────────────────────────────────────────────
  console.log('\nVendor team members:');
  const vendorTeam = await prisma.vendorTeamMember.findMany({
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      roleRef: { select: { name: true } },
      vendor: { select: { businessName: true } },
    },
  });
  for (const m of vendorTeam) {
    const ctx = await loadActiveContextLite(m.user.id);
    const role = m.roleRef?.name ?? '(no roleRef)';
    console.log(`  • ${m.user.fullName} <${m.user.email}> on ${m.vendor.businessName}`);
    console.log(`     team role: ${role}`);
    console.log(`     loadActiveContext permissions: ${ctx.permissions.length} keys, roles applied: ${ctx.roleNames.join(', ') || '(none — JWT will have no permissions!)'}`);
  }

  // ── Brand team ──────────────────────────────────────────────────────
  console.log('\nBrand team members:');
  const brandTeam = await prisma.brandTeamMember.findMany({
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      roleRef: { select: { name: true } },
      brand: { select: { name: true } },
    },
  });
  if (brandTeam.length === 0) console.log('  (no brand team members in DB)');
  for (const m of brandTeam) {
    const ctx = await loadActiveContextLite(m.user.id);
    const role = m.roleRef?.name ?? '(no roleRef)';
    console.log(`  • ${m.user.fullName} <${m.user.email}> on ${m.brand.name}`);
    console.log(`     team role: ${role}`);
    console.log(`     loadActiveContext permissions: ${ctx.permissions.length} keys, roles applied: ${ctx.roleNames.join(', ') || '(none — JWT will have no permissions!)'}`);
  }
}

main()
  .catch((err) => { console.error('verify failed:', err); process.exit(2); })
  .finally(() => prisma.$disconnect());
