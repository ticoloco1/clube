import { NextRequest, NextResponse } from 'next/server';
import { addDays } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { getServiceDb, rateLimitLively } from '@/lib/livelyAvatarServer';
import {
  bookingsToBusyIntervals,
  listAvailableSlotStarts,
  parseWeeklyHours,
} from '@/lib/bookingSchedule';

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const { searchParams } = new URL(req.url);
    const slug = (searchParams.get('slug') || '').trim().toLowerCase();
    const dateStr = (searchParams.get('date') || '').trim();

    if (!slug || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: 'slug and date (YYYY-MM-DD) required' }, { status: 400 });
    }

    if (!rateLimitLively(`booking-slots:${ip}`)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const db = getServiceDb();
    const { data: site, error } = await db
      .from('mini_sites')
      .select(
        'id,slug,published,booking_enabled,booking_slot_minutes,booking_timezone,booking_weekly_hours',
      )
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();

    if (error || !site || !(site as { booking_enabled?: boolean }).booking_enabled) {
      return NextResponse.json({ error: 'Booking not available' }, { status: 404 });
    }

    const row = site as {
      id: string;
      booking_slot_minutes?: number | null;
      booking_timezone?: string | null;
      booking_weekly_hours?: unknown;
    };

    const tz = (row.booking_timezone || 'America/Sao_Paulo').trim() || 'America/Sao_Paulo';
    const slotMinutes = Math.max(15, Math.min(180, Number(row.booking_slot_minutes) || 30));
    const weekly = parseWeeklyHours(row.booking_weekly_hours);

    const dayStart = toDate(`${dateStr}T00:00:00`, { timeZone: tz });
    const dayEnd = addDays(dayStart, 1);

    const { data: bookingRows } = await db
      .from('site_bookings')
      .select('starts_at,ends_at,status')
      .eq('site_id', row.id)
      .lt('starts_at', dayEnd.toISOString())
      .gt('ends_at', dayStart.toISOString());

    const busy = bookingsToBusyIntervals((bookingRows || []) as { starts_at: string; ends_at: string; status?: string }[]);

    const starts = listAvailableSlotStarts({
      dateStr,
      timeZone: tz,
      weekly,
      slotMinutes,
      busy,
    });

    return NextResponse.json({
      timezone: tz,
      slotMinutes,
      slots: starts.map((d) => ({
        start: d.toISOString(),
        label: formatInTimeZone(d, tz, 'HH:mm'),
      })),
    });
  } catch (e) {
    console.error('[booking/slots]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
