'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';

type Slot = { start: string; label: string };

export function SiteBookingWidget({
  slug,
  accentColor,
  textColor,
  borderColor,
  bgCard,
  servicesJson,
  ownerWhatsappDigits,
}: {
  slug: string;
  accentColor: string;
  textColor: string;
  borderColor: string;
  bgCard: string;
  servicesJson?: string | null;
  /** Digits only — shows optional WhatsApp hint when set */
  ownerWhatsappDigits?: string;
}) {
  const T = useT();
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [service, setService] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const services = useMemo(() => {
    try {
      const p = servicesJson ? JSON.parse(servicesJson) : [];
      return Array.isArray(p) ? p.filter((x: unknown) => x && typeof x === 'object' && String((x as { label?: string }).label || '').trim()) : [];
    } catch {
      return [];
    }
  }, [servicesJson]);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setPicked('');
    setSlots([]);
    try {
      const r = await fetch(`/api/public/booking/slots?slug=${encodeURIComponent(slug)}&date=${encodeURIComponent(dateStr)}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof j.error === 'string' ? j.error : 'fail');
      setSlots(Array.isArray(j.slots) ? j.slots : []);
    } catch {
      toast.error(T('site_booking_err'));
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [T, dateStr, slug]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const submit = async () => {
    if (!picked || !email.trim()) {
      toast.error(T('site_booking_err'));
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch('/api/public/booking/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          slotStart: picked,
          visitorName: name.trim(),
          visitorEmail: email.trim(),
          visitorPhone: phone.trim(),
          notes: notes.trim(),
          serviceLabel: service,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof j.error === 'string' ? j.error : 'fail');
      toast.success(T('site_booking_ok'));
      setNotes('');
      void loadSlots();
      setPicked('');
    } catch {
      toast.error(T('site_booking_err'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1.5px solid ${borderColor}`,
        background: bgCard,
        padding: 20,
        marginBottom: 32,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <CalendarClock style={{ width: 22, height: 22, color: accentColor }} />
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: textColor }}>{T('site_booking_title')}</h2>
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 12, opacity: 0.75, color: textColor, lineHeight: 1.45 }}>
        {T('site_booking_intro')}
      </p>
      {ownerWhatsappDigits ? (
        <p style={{ margin: '0 0 14px', fontSize: 11, opacity: 0.65, color: textColor, lineHeight: 1.45 }}>
          {T('site_booking_whatsapp_foot')}
        </p>
      ) : null}

      <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{T('site_booking_pick_date')}</span>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${borderColor}`,
              background: 'transparent',
              color: textColor,
              fontSize: 14,
            }}
          />
        </label>

        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: textColor, display: 'block', marginBottom: 6 }}>
            {T('site_booking_pick_slot')}
          </span>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: textColor, fontSize: 13 }}>
              <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} />
              {T('site_booking_loading')}
            </div>
          ) : slots.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, opacity: 0.7, color: textColor }}>{T('site_booking_none')}</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {slots.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  onClick={() => setPicked(s.start)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: `1.5px solid ${picked === s.start ? accentColor : borderColor}`,
                    background: picked === s.start ? `${accentColor}22` : 'transparent',
                    color: textColor,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {services.length > 0 && (
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{T('site_booking_service')}</span>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${borderColor}`,
                background: 'transparent',
                color: textColor,
                fontSize: 14,
              }}
            >
              <option value="">—</option>
              {services.map((sv: { label?: string }) => (
                <option key={String(sv.label)} value={String(sv.label)}>
                  {String(sv.label)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{T('site_booking_name')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${borderColor}`,
              background: 'transparent',
              color: textColor,
              fontSize: 14,
            }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{T('site_booking_email')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${borderColor}`,
              background: 'transparent',
              color: textColor,
              fontSize: 14,
            }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{T('site_booking_phone')}</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${borderColor}`,
              background: 'transparent',
              color: textColor,
              fontSize: 14,
            }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{T('site_booking_notes')}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${borderColor}`,
              background: 'transparent',
              color: textColor,
              fontSize: 14,
              resize: 'vertical',
            }}
          />
        </label>

        <button
          type="button"
          disabled={submitting || !picked || !email.trim()}
          onClick={() => void submit()}
          style={{
            marginTop: 4,
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            background: accentColor,
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            cursor: submitting ? 'wait' : 'pointer',
            opacity: submitting || !picked || !email.trim() ? 0.5 : 1,
          }}
        >
          {submitting ? '…' : T('site_booking_submit')}
        </button>
      </div>
    </div>
  );
}
