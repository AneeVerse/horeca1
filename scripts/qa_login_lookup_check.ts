/**
 * QA: simulate the auth.ts authorize() lookup for every user that has login
 * credentials — by email and by 10-digit phone (with legacy-prefix variants).
 * Confirms post phone-normalization that nobody is unreachable at login.
 *
 * Read-only. Run: npx tsx --env-file=.env scripts/qa_login_lookup_check.ts
 */
import { prisma } from '../src/lib/prisma';
import { normalizePhone, phoneLookupVariants } from '../src/lib/phone';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, phone: true, fullName: true, isActive: true, password: true, role: true },
  });

  let pass = 0, fail = 0, inactive = 0;
  for (const u of users) {
    if (!u.isActive) {
      console.log(`INACTIVE (login blocked by design): ${u.fullName} <${u.email ?? u.phone}> role=${u.role}`);
      inactive++;
      continue;
    }
    // Email path — exact lowercase findUnique, as authorize() does.
    if (u.email) {
      const byEmail = await prisma.user.findUnique({ where: { email: u.email.toLowerCase() }, select: { id: true } });
      if (byEmail?.id !== u.id) { console.log(`FAIL email lookup: ${u.email}`); fail++; continue; }
    }
    // Phone path — the user types the 10-digit number; authorize() searches variants.
    if (u.phone) {
      const ten = normalizePhone(u.phone);
      if (!ten) { console.log(`FAIL phone unparseable: ${u.fullName} "${u.phone}"`); fail++; continue; }
      const byPhone = await prisma.user.findFirst({ where: { phone: { in: phoneLookupVariants(ten) } }, select: { id: true } });
      if (!byPhone) { console.log(`FAIL phone lookup: ${u.fullName} "${u.phone}"`); fail++; continue; }
      if (byPhone.id !== u.id) {
        console.log(`AMBIGUOUS phone (duplicate number, resolves to another account): ${u.fullName} "${u.phone}"`);
      }
    }
    if (!u.email && !u.phone) { console.log(`NO IDENTIFIER: ${u.fullName} (${u.id}) — cannot log in at all`); fail++; continue; }
    pass++;
  }
  console.log(`\nDone. reachable=${pass} failures=${fail} inactive=${inactive} total=${users.length}`);
  await prisma.$disconnect();
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
