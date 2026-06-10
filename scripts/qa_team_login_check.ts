/**
 * QA: dump login-relevant state for every team member (vendor/brand/admin)
 * to diagnose the "team member can't log in" report.
 * Run: npx tsx scripts/qa_team_login_check.ts
 */
import { prisma } from '../src/lib/prisma';

async function main() {
  const members = await prisma.vendorTeamMember.findMany({
    include: {
      user: {
        select: {
          id: true, email: true, phone: true, fullName: true, role: true,
          isActive: true, password: true,
          accountMemberships: { select: { businessAccountId: true, isPrimary: true } },
          userRoles: { select: { businessAccountId: true, outletId: true, role: { select: { name: true } } } },
        },
      },
      vendor: { select: { businessName: true, businessAccountId: true } },
    },
  });
  console.log('--- vendor team members:', members.length, '---');
  for (const m of members) {
    console.log(JSON.stringify({
      member: m.user.fullName, email: m.user.email, phone: m.user.phone, role: m.user.role,
      isActive: m.user.isActive, hasPassword: !!m.user.password,
      vendor: m.vendor.businessName,
      vendorBA: m.vendor.businessAccountId,
      baMemberships: m.user.accountMemberships,
      userRoles: m.user.userRoles,
    }, null, 0));
  }

  const adminMembers = await prisma.adminTeamMember.findMany({
    include: { user: { select: { email: true, phone: true, fullName: true, role: true, isActive: true, password: true } } },
  });
  console.log('--- admin team members:', adminMembers.length, '---');
  for (const m of adminMembers) {
    console.log(JSON.stringify({ member: m.user.fullName, email: m.user.email, phone: m.user.phone, role: m.user.role, isActive: m.user.isActive, hasPassword: !!m.user.password, teamRole: m.role, roleId: m.roleId }));
  }

  const brandMembers = await prisma.brandTeamMember.findMany({
    include: { user: { select: { email: true, fullName: true, role: true, isActive: true, password: true } }, brand: { select: { name: true } } },
  });
  console.log('--- brand team members:', brandMembers.length, '---');
  for (const m of brandMembers) {
    console.log(JSON.stringify({ member: m.user.fullName, email: m.user.email, role: m.user.role, isActive: m.user.isActive, hasPassword: !!m.user.password, brand: m.brand.name }));
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
