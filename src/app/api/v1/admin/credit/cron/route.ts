// POST /api/v1/admin/credit/cron — daily credit job: accrue interest/penalties,
// auto-blacklist, and send due reminders. Call once/day from the droplet cron:
//   curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost/api/v1/admin/credit/cron
// Gated by CRON_SECRET (no session needed so a headless scheduler can call it).
import { NextRequest, NextResponse } from 'next/server';
import { creditWalletService } from '@/modules/credit/creditWallet.service';
import { errorResponse } from '@/middleware/errorHandler';

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const provided = req.headers.get('x-cron-secret');
    if (!secret || provided !== secret) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }
    const result = await creditWalletService.runDailyCreditTasks();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
