import { NextRequest, NextResponse } from 'next/server';
import { addMinutes } from 'date-fns';
import { addDays } from 'date-fns';
import { getServiceDb, rateLimitLively } from '@/lib/livelyAvatarServer';
import {
  bookingsToBusyIntervals,
  listAvailableSlotStarts,
  parseWeeklyHours,
} from '@/lib/bookingSchedule';
import { formatInTimeZone, toDate } from 'date-fns-tz';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!rateLimitLively(`booking-req:${ip}`)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    const slotStartIso = typeof body.slotStart === 'string' ? body.slotStart.trim() : '';
    const visitorName = typeof body.visitorName === 'string' ? body.visitorName.trim().slice(0, 120) : '';
    const visitorEmail = typeof body.visitorEmail === 'string' ? body.visitorEmail.trim().toLowerCase().slice(0, 254) : '';
    const visitorPhone = typeof body.visitorPhone === 'string' ? body.visitorPhone.trim().slice(0, 40) : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : '';
    const serviceLabel = typeof body.serviceLabel === 'string' ? body.serviceLabel.trim().slice(0, 120) : '';

    if (!slug || !slotStartIso || !visitorEmail || !EMAIL_RE.test(visitorEmail)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const start = new Date(slotStartIso);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
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

    const dateStr = formatInTimeZone(start, tz, 'yyyy-MM-dd');

    const dayStart = toDate(`${dateStr}T00:00:00`, { timeZone: tz });
    const dayEnd = addMinutes(dayStart, 24 * 60);

    const { data: bookingRows } = await db
      .from('site_bookings')
      .select('starts_at,ends_at,status')
      .eq('site_id', row.id)
      .lt('starts_at', dayEnd.toISOString())
      .gt('ends_at', dayStart.toISOString());

    const busy = bookingsToBusyIntervals((bookingRows || []) as { starts_at: string; ends_at: string; status?: string }[]);

    const allowed = listAvailableSlotStarts({
      dateStr,
      timeZone: tz,
      weekly,
      slotMinutes,
      busy,
    });

    const match = allowed.find((d) => Math.abs(d.getTime() - start.getTime()) < 5000);
    if (!match) {
      return NextResponse.json({ error: 'Slot no longer available' }, { status: 409 });
    }

    const ends = addMinutes(match, slotMinutes);

    const { error: insErr } = await db.from('site_bookings').insert({
      site_id: row.id,
      starts_at: match.toISOString(),
      ends_at: ends.toISOString(),
      visitor_name: visitorName || null,
      visitor_email: visitorEmail,
      visitor_phone: visitorPhone || null,
      service_label: serviceLabel || null,
      notes: notes || null,
      status: 'pending',
    });

    if (insErr) {
      console.error('[booking/request] insert', insErr);
      return NextResponse.json({ error: 'Could not save booking' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      startsAt: match.toISOString(),
      endsAt: ends.toISOString(),
      label: formatInTimeZone(match, tz, 'yyyy-MM-dd HH:mm'),
    });
  } catch (e) {
    console.error('[booking/request]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
