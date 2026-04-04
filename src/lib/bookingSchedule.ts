import { addDays, addMinutes, getISODay } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';

export type DayWindow = { from: string; to: string };
export type WeeklyHours = Record<string, DayWindow[]>;

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  mon: [{ from: '09:00', to: '18:00' }],
  tue: [{ from: '09:00', to: '18:00' }],
  wed: [{ from: '09:00', to: '18:00' }],
  thu: [{ from: '09:00', to: '18:00' }],
  fri: [{ from: '09:00', to: '18:00' }],
  sat: [],
  sun: [],
};

/** Fallback ao gravar se o JSON manual estiver inválido. */
export const DEFAULT_BOOKING_SERVICES: { label: string; minutes: number }[] = [
  { label: 'Consultation', minutes: 30 },
];

export function parseWeeklyHours(raw: unknown): WeeklyHours {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_WEEKLY_HOURS };
  const o = raw as Record<string, unknown>;
  const out: WeeklyHours = { ...DEFAULT_WEEKLY_HOURS };
  for (const k of DAY_KEYS) {
    const w = o[k];
    if (!Array.isArray(w)) continue;
    const windows: DayWindow[] = [];
    for (const item of w) {
      if (!item || typeof item !== 'object') continue;
      const from = String((item as DayWindow).from || '').trim();
      const to = String((item as DayWindow).to || '').trim();
      if (/^\d{1,2}:\d{2}$/.test(from) && /^\d{1,2}:\d{2}$/.test(to)) {
        windows.push({ from, to });
      }
    }
    out[k] = windows;
  }
  return out;
}

/** Chave mon..sun para a data civil em `timeZone`. */
export function dayKeyForCalendarDate(dateStr: string, timeZone: string): DayKey {
  const anchor = toDate(`${dateStr}T12:00:00`, { timeZone });
  const isoD = getISODay(anchor);
  return DAY_KEYS[isoD - 1] ?? 'mon';
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** Inícios UTC de cada slot livre num dia civil (YYYY-MM-DD) no fuso do site. */
export function listAvailableSlotStarts(params: {
  dateStr: string;
  timeZone: string;
  weekly: WeeklyHours;
  slotMinutes: number;
  busy: { start: Date; end: Date }[];
}): Date[] {
  const { dateStr, timeZone, weekly, slotMinutes, busy } = params;
  const slot = Math.max(15, Math.min(180, slotMinutes || 30));
  const key = dayKeyForCalendarDate(dateStr, timeZone);
  const windows = weekly[key] || [];
  const slots: Date[] = [];

  for (const w of windows) {
    const [fh, fm] = w.from.split(':').map((x) => parseInt(x, 10));
    const [th, tm] = w.to.split(':').map((x) => parseInt(x, 10));
    if (Number.isNaN(fh) || Number.isNaN(th)) continue;
    let cur = toDate(`${dateStr}T${pad2(fh)}:${pad2(fm || 0)}:00`, { timeZone });
    const endW = toDate(`${dateStr}T${pad2(th)}:${pad2(tm || 0)}:00`, { timeZone });
    if (!(cur < endW)) continue;

    while (cur < endW) {
      const slotEnd = addMinutes(cur, slot);
      if (slotEnd > endW) break;
      const overlaps = busy.some((b) => cur < b.end && slotEnd > b.start);
      if (!overlaps) slots.push(cur);
      cur = slotEnd;
    }
  }

  return slots;
}

export function bookingsToBusyIntervals(
  rows: { starts_at: string; ends_at: string; status?: string }[],
): { start: Date; end: Date }[] {
  return rows
    .filter((r) => (r.status || 'pending') !== 'cancelled')
    .map((r) => ({
      start: new Date(r.starts_at),
      end: new Date(r.ends_at),
    }))
    .filter((b) => !Number.isNaN(b.start.getTime()) && !Number.isNaN(b.end.getTime()) && b.start < b.end);
}

/** Resumo de vagas para o prompt do avatar (DeepSeek / IA da plataforma). */
export function buildBookingAiAppendix(params: {
  timeZone: string;
  weekly: WeeklyHours;
  slotMinutes: number;
  bookingRows: { starts_at: string; ends_at: string; status?: string }[];
  langHint: 'en' | 'pt';
}): string {
  const { timeZone, weekly, slotMinutes, bookingRows, langHint } = params;
  const head =
    langHint === 'pt'
      ? `Agendamento online ativo. Fuso: ${timeZone}. Duração do slot: ${slotMinutes} min.`
      : `Online scheduling enabled. Time zone: ${timeZone}. Slot length: ${slotMinutes} min.`;
  const lines: string[] = [head];

  for (let i = 0; i < 7; i++) {
    const dayUtc = addDays(new Date(), i);
    const dateStr = formatInTimeZone(dayUtc, timeZone, 'yyyy-MM-dd');
    const dayStart = toDate(`${dateStr}T00:00:00`, { timeZone });
    const dayEnd = addDays(dayStart, 1);
    const dayRows = bookingRows.filter((r) => {
      const s = new Date(r.starts_at);
      const e = new Date(r.ends_at);
      return !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && s < dayEnd && e > dayStart;
    });
    const busy = bookingsToBusyIntervals(dayRows);
    const slots = listAvailableSlotStarts({
      dateStr,
      timeZone,
      weekly,
      slotMinutes,
      busy,
    });
    if (slots.length === 0) continue;
    const sample = slots
      .slice(0, 4)
      .map((s) => formatInTimeZone(s, timeZone, 'HH:mm'))
      .join(', ');
    lines.push(`- ${dateStr}: ${slots.length} opening(s), e.g. ${sample}`);
  }

  lines.push(
    langHint === 'pt'
      ? 'Orienta o visitante a marcar no calendário desta página. Não inventes horários fora desta disponibilidade.'
      : 'Guide the visitor to book using the calendar on this page. Do not invent times outside this availability.',
  );
  return lines.join('\n');
}

export function bookingVerticalPrompt(vertical: string | null | undefined, langHint: 'en' | 'pt'): string {
  const v = (vertical || 'general').toLowerCase();
  if (langHint === 'pt') {
    if (v === 'medical')
      return 'Contexto: saúde / clínica. Tom empático; nunca diagnósticos nem substituir emergência — encaminha para serviço presencial ou emergência quando adequado.';
    if (v === 'legal')
      return 'Contexto: escritório jurídico. Tom formal; não prestes aconselhamento legal definitivo — sugere consulta marcada para casos concretos.';
    if (v === 'business')
      return 'Contexto: empresa / negócios. Foco em clareza, próximos passos e marcação de reuniões.';
    return 'Contexto: geral. Profissional e útil.';
  }
  if (v === 'medical')
    return 'Context: healthcare. Empathetic tone; never diagnose or replace emergency care — direct to in-person or emergency services when appropriate.';
  if (v === 'legal')
    return 'Context: law office. Formal tone; do not give definitive legal advice — suggest a booked consultation for specific cases.';
  if (v === 'business')
    return 'Context: business. Focus on clarity, next steps, and scheduling meetings.';
  return 'Context: general professional assistant.';
}
