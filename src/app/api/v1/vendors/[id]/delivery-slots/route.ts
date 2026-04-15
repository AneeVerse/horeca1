// GET /api/v1/vendors/:id/delivery-slots?days=3
// WHY: Checkout needs available slots per vendor for the next N days.
//      Past-cutoff slots for today are filtered out so users can't pick them.
// PUBLIC: Anyone browsing checkout can read slot availability.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse } from '@/middleware/errorHandler';

// DeliverySlot.dayOfWeek is 1..7 (Mon..Sun). JS getDay() is 0..6 (Sun..Sat).
function jsDayToSlotDay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

function toHM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;
    const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get('days')) || 3, 1), 14);

    const slots = await prisma.deliverySlot.findMany({
      where: { vendorId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { slotStart: 'asc' }],
      select: { id: true, dayOfWeek: true, slotStart: true, slotEnd: true, cutoffTime: true },
    });

    const now = new Date();
    const nowHM = toHM(now);
    const todaySlotDay = jsDayToSlotDay(now.getDay());

    const out: Array<{
      date: string;
      dayOfWeek: number;
      dayLabel: string;
      slots: Array<{ id: string; slotStart: string; slotEnd: string; cutoffTime: string; pastCutoff: boolean }>;
    }> = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const slotDay = jsDayToSlotDay(d.getDay());
      const isoDate = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

      const daySlots = slots
        .filter(s => s.dayOfWeek === slotDay)
        .map(s => {
          const pastCutoff = i === 0 && slotDay === todaySlotDay && nowHM >= s.cutoffTime;
          return {
            id: s.id,
            slotStart: s.slotStart,
            slotEnd: s.slotEnd,
            cutoffTime: s.cutoffTime,
            pastCutoff,
          };
        });

      if (daySlots.length > 0) out.push({ date: isoDate, dayOfWeek: slotDay, dayLabel, slots: daySlots });
    }

    return NextResponse.json({ success: true, data: { vendorId, days: out } });
  } catch (error) {
    return errorResponse(error);
  }
}
