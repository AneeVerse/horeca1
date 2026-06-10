/**
 * One-off data fix: normalize users.phone to canonical 10-digit form.
 * Rows stored as "+91XXXXXXXXXX" / "91XXXXXXXXXX" broke phone login lookups.
 * Skips (and reports) rows whose canonical form collides with another user.
 *
 * Run: npx tsx --env-file=.env scripts/fix_phone_formats.ts
 */
import { prisma } from '../src/lib/prisma';
import { normalizePhone } from '../src/lib/phone';

async function main() {
  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true, email: true, fullName: true },
  });

  let fixed = 0, skipped = 0, conflicts = 0;
  for (const u of users) {
    const canonical = normalizePhone(u.phone);
    if (!canonical) {
      console.log(`SKIP (unparseable): ${u.fullName} <${u.email}> phone="${u.phone}"`);
      skipped++;
      continue;
    }
    if (canonical === u.phone) continue;

    const clash = await prisma.user.findFirst({
      where: { phone: canonical, id: { not: u.id } },
      select: { id: true, email: true },
    });
    if (clash) {
      console.log(`CONFLICT: ${u.fullName} <${u.email}> "${u.phone}" -> "${canonical}" already used by <${clash.email}>`);
      conflicts++;
      continue;
    }
    await prisma.user.update({ where: { id: u.id }, data: { phone: canonical } });
    console.log(`FIXED: ${u.fullName} <${u.email}> "${u.phone}" -> "${canonical}"`);
    fixed++;
  }
  console.log(`\nDone. fixed=${fixed} conflicts=${conflicts} unparseable=${skipped} total=${users.length}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
