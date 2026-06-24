/**
 * SMS DOCTOR — end-to-end diagnostic for order SMS (customer + vendor).
 *
 * The order-SMS pipeline has 4 stages, any of which can silently break:
 *   1. Event      OrderCreated emitted (app process)
 *   2. Enqueue    notifications.send() writes a Notification row + adds a BullMQ job
 *   3. Worker     horeca1-worker container consumes the job → calls sendSms()
 *   4. Provider   MSG91 Flow API actually delivers to the operator
 *
 * In-app notifications appear even if stages 3–4 are dead (the row is written in
 * stage 2), so "the bell works but no SMS" usually means the worker or MSG91.
 *
 * USAGE
 *   Read-only audit (env + DB):     npx tsx scripts/sms_doctor.ts
 *   Live send test (costs 1 SMS):   npx tsx scripts/sms_doctor.ts --send 9XXXXXXXXX
 *
 * Run it ON THE DROPLET for the truth (prod env + prod DB):
 *   docker exec -it horeca1-worker npx tsx scripts/sms_doctor.ts
 *   docker exec -it horeca1-worker npx tsx scripts/sms_doctor.ts --send 9XXXXXXXXX
 * Locally it uses whatever is in .env / .env.local (and DB needs the SSH tunnel).
 */
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Next.js loads .env.local for dev; plain dotenv does not. Load both so a local
// run reflects the same keys dev uses. On the droplet the worker container gets
// its env from .env.production via docker-compose env_file (already in process.env).
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });

// ── Mirror of src/lib/providers/smsTemplates.ts (kept inline so the script is
//    standalone and runs without @/ path-alias resolution under tsx) ──────────
const SMS_TEMPLATES = {
  orderConfirmCustomer: process.env.MSG91_SMS_ORDER_CONFIRM_CUSTOMER_TEMPLATE_ID ?? '67163e54d6fc0538fe0edca4',
  orderConfirmVendor: process.env.MSG91_SMS_ORDER_CONFIRM_VENDOR_TEMPLATE_ID ?? '67163ee4d6fc0504f7711282',
  orderCancelCustomer: process.env.MSG91_SMS_ORDER_CANCEL_TEMPLATE_ID ?? '671644c1d6fc0562a36369a2',
  generalPurpose: process.env.MSG91_SMS_GENERAL_TEMPLATE_ID ?? '671108dcd6fc054e50057712',
};

function mask(v?: string): string {
  if (!v) return '\x1b[31m(MISSING)\x1b[0m';
  if (v.length <= 8) return v.slice(0, 2) + '****';
  return v.slice(0, 4) + '…' + v.slice(-4) + ` (len ${v.length})`;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

// IST window check — these DLT templates are time-gated ~9am–9pm IST.
function istWindowStatus(): string {
  const nowUtcMs = Date.now();
  const istMs = nowUtcMs + (5 * 60 + 30) * 60 * 1000;
  const ist = new Date(istMs);
  const h = ist.getUTCHours();
  const inWindow = h >= 9 && h < 21;
  const hhmm = `${String(h).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`;
  return inWindow
    ? `\x1b[32m✓ inside\x1b[0m 9am–9pm IST (now ${hhmm} IST)`
    : `\x1b[31m✗ OUTSIDE\x1b[0m 9am–9pm IST (now ${hhmm} IST) — DLT will reject "Invalid SMS Timing"`;
}

async function liveSend(to: string) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID || 'HCXGBL';
  const templateId = SMS_TEMPLATES.orderConfirmVendor; // vendor template = verified-good, single ##number## var
  if (!authKey) {
    console.log('\n\x1b[31mCannot send: MSG91_AUTH_KEY is missing.\x1b[0m');
    return;
  }
  const normalized = normalizePhone(to);
  const payload = {
    template_id: templateId,
    sender: senderId,
    recipients: [{ mobiles: normalized, number: 'TEST-' + Date.now().toString().slice(-5) }],
  };
  console.log('\n── STAGE 4: LIVE MSG91 FLOW SEND ──────────────────────────────');
  console.log(`  → POST https://api.msg91.com/api/v5/flow/`);
  console.log(`  → to=${normalized}  sender=${senderId}  template_id=${templateId}`);
  const res = await fetch('https://api.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { authkey: authKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text().catch(() => '(no body)');
  console.log(`  ← HTTP ${res.status} ${res.statusText}`);
  console.log(`  ← body: ${text}`);
  console.log(
    '\n  NOTE: MSG91 Flow returns {"type":"success"} EVEN when the send later fails\n' +
    '  (wrong template / DLT timing / no balance). Confirm real delivery in the\n' +
    '  MSG91 dashboard → SMS → Logs and API Failed Logs (look for the Failure Reason).',
  );
}

async function dbAudit() {
  if (!process.env.DATABASE_URL) {
    console.log('\n── DB AUDIT skipped (no DATABASE_URL — start the SSH tunnel or run on the droplet) ──');
    return;
  }
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const url = process.env.DATABASE_URL.replace(/:[^:@/]+@/, ':****@');
    console.log(`\n── STAGE 2–3: NOTIFICATION TABLE AUDIT ── (${url})`);

    await prisma.$queryRaw`SELECT 1`.catch((e) => {
      throw new Error(`DB unreachable (${(e as { code?: string }).code ?? 'conn'}). ` +
        `Start the SSH tunnel (npm run tunnel) or run this inside the droplet container.`);
    });

    const grouped = await prisma.notification.groupBy({
      by: ['status'],
      where: { channel: 'sms' },
      _count: { _all: true },
    });
    if (grouped.length === 0) {
      console.log('  \x1b[31mNo sms-channel notifications exist at all.\x1b[0m');
      console.log('  → Stage 1/2 broken: OrderCreated never fired, or listeners not registered,');
      console.log('    or no order placed yet. Place a test order, then re-run.');
    } else {
      console.log('  sms notifications by status:');
      for (const g of grouped) {
        const flag = g.status === 'pending' ? ' \x1b[33m← stuck: worker not consuming\x1b[0m'
          : g.status === 'failed' ? ' \x1b[31m← worker ran but sendSms threw\x1b[0m'
          : '';
        console.log(`    ${g.status.padEnd(8)} ${g._count._all}${flag}`);
      }
    }

    const recent = await prisma.notification.findMany({
      where: { channel: 'sms' },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { id: true, status: true, title: true, body: true, createdAt: true, userId: true },
    });
    if (recent.length) {
      console.log('\n  most recent sms notifications:');
      for (const n of recent) {
        const errMatch = n.body.match(/\[delivery error\]\s*(.+)$/s);
        const err = errMatch ? `  \x1b[31mERR: ${errMatch[1].slice(0, 120)}\x1b[0m` : '';
        const ts = n.createdAt.toISOString().slice(5, 16).replace('T', ' ');
        console.log(`    ${ts}  ${n.status.padEnd(8)} ${n.title.slice(0, 28).padEnd(28)}${err}`);
      }
    }

    // Do the relevant users even have phone numbers? (stage 3 throws "no phone")
    const usersOnSms = [...new Set(recent.map((n) => n.userId))];
    if (usersOnSms.length) {
      const users = await prisma.user.findMany({
        where: { id: { in: usersOnSms } },
        select: { id: true, phone: true, role: true },
      });
      const noPhone = users.filter((u) => !u.phone);
      console.log(`\n  recipients with NO phone number: ${noPhone.length}/${users.length}` +
        (noPhone.length ? ` \x1b[31m← these throw "User has no phone number"\x1b[0m` : ' ✓'));
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('\x1b[1m\n══════════════ SMS DOCTOR ══════════════\x1b[0m');

  console.log('\n── STAGE 4 CONFIG: ENV AUDIT ──────────────────────────────────');
  console.log(`  MSG91_AUTH_KEY                        ${mask(process.env.MSG91_AUTH_KEY)}`);
  console.log(`  MSG91_SENDER_ID                       ${process.env.MSG91_SENDER_ID || '\x1b[33m(default HCXGBL)\x1b[0m'}`);
  console.log(`  MSG91_TEMPLATE_ID (login OTP)         ${mask(process.env.MSG91_TEMPLATE_ID)}`);
  console.log('  ── per-purpose Flow templates (fall back to hardcoded hex if unset) ──');
  console.log(`  ..ORDER_CONFIRM_CUSTOMER_TEMPLATE_ID  ${mask(process.env.MSG91_SMS_ORDER_CONFIRM_CUSTOMER_TEMPLATE_ID)}`);
  console.log(`  ..ORDER_CONFIRM_VENDOR_TEMPLATE_ID    ${mask(process.env.MSG91_SMS_ORDER_CONFIRM_VENDOR_TEMPLATE_ID)}`);
  console.log(`  REDIS_URL                             ${process.env.REDIS_URL ? '✓ set' : '\x1b[33m(default localhost)\x1b[0m'}`);

  console.log('\n── RESOLVED TEMPLATE IDs (what the worker will actually send) ──');
  console.log(`  customer (orderConfirmCustomer): ${SMS_TEMPLATES.orderConfirmCustomer}`);
  console.log(`  vendor   (orderConfirmVendor):   ${SMS_TEMPLATES.orderConfirmVendor}`);

  console.log('\n── DLT TIME WINDOW ────────────────────────────────────────────');
  console.log(`  ${istWindowStatus()}`);

  if (!process.env.MSG91_AUTH_KEY) {
    console.log('\n  \x1b[31m⚠ MSG91_AUTH_KEY missing → sendSms() takes the dev-log fallback:\x1b[0m');
    console.log('    it returns WITHOUT calling MSG91 and the notification is marked "sent".');
    console.log('    This is a silent no-send. Set the key in the worker env and redeploy.');
  }

  await dbAudit().catch((e) => console.log(`\n── DB AUDIT failed: ${e instanceof Error ? e.message : e} ──`));

  const sendIdx = process.argv.indexOf('--send');
  if (sendIdx !== -1 && process.argv[sendIdx + 1]) {
    await liveSend(process.argv[sendIdx + 1]);
  } else {
    console.log('\n── STAGE 4 live test skipped ──');
    console.log('  Add `--send 9XXXXXXXXX` to fire one real SMS through MSG91 (costs 1 credit).');
  }

  console.log('\n\x1b[1m════════════════════════════════════════\x1b[0m\n');
}

main().catch((e) => {
  console.error('\x1b[31msms_doctor crashed:\x1b[0m', e);
  process.exit(1);
});
