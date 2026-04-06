export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getIdentitySessionUser } from '@/lib/identitySession';
import { createElevenLabsVoiceFromSamples } from '@/lib/elevenLabsVoiceClone';
import { applySiteAiBudgetDeduction, assertOwnerAiBudgetUsd, IA_USD, readSiteAiBudget } from '@/lib/aiUsdBudget';
import { iaUsdBillingApplies } from '@/lib/iaBillingSubscription';
import { rateLimitLively } from '@/lib/livelyAvatarServer';

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * POST multipart: siteId, file (áudio)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getIdentitySessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!rateLimitLively(`idvc:${ip}:${user.id}`)) {
      return NextResponse.json({ error: 'Muitos pedidos.' }, { status: 429 });
    }

    const form = await req.formData();
    const siteId = typeof form.get('siteId') === 'string' ? String(form.get('siteId')).trim() : '';
    const file = form.get('file');

    if (!siteId || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'siteId e file obrigatórios' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Ficheiro demasiado grande (máx. 12 MB)' }, { status: 400 });
    }

    const db = getDb();
    const { data: site, error: siteErr } = await db
      .from('mini_sites')
      .select('id,user_id,slug,trial_publish_until,ai_free_usd_remaining,ai_paid_usd_balance')
      .eq('id', siteId)
      .maybeSingle();

    if (siteErr || !site || (site as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });
    }

    const { freeUsd, paidUsd } = readSiteAiBudget(site);
    const costUsd = IA_USD.voice_clone();
    const billingApplies = await iaUsdBillingApplies(db, {
      user_id: (site as { user_id: string }).user_id,
      trial_publish_until: (site as { trial_publish_until?: string | null }).trial_publish_until,
    });
    const access = assertOwnerAiBudgetUsd(freeUsd, paidUsd, costUsd, !billingApplies);
    if (!access.ok) {
      return NextResponse.json({ error: access.message, code: 'IA_PAYWALL' }, { status: 402 });
    }

    const ab = await file.arrayBuffer();
    const buffer = Buffer.from(ab);
    const lowerName = ((file as File).name || '').toLowerCase();
    let rawType = (file.type || '').toLowerCase();
    if (!rawType || rawType === 'application/octet-stream') {
      if (lowerName.endsWith('.webm')) rawType = 'audio/webm';
      else if (lowerName.endsWith('.mp3')) rawType = 'audio/mpeg';
      else if (lowerName.endsWith('.wav')) rawType = 'audio/wav';
      else if (lowerName.endsWith('.ogg') || lowerName.endsWith('.oga')) rawType = 'audio/ogg';
      else if (lowerName.endsWith('.m4a') || lowerName.endsWith('.mp4') || lowerName.endsWith('.caf'))
        rawType = 'audio/mp4';
      else if (lowerName.endsWith('.aac')) rawType = 'audio/aac';
      else if (lowerName.endsWith('.flac')) rawType = 'audio/flac';
    }
    const { ext, mime } = (() => {
      const m = rawType || 'application/octet-stream';
      if (m.includes('webm')) return { ext: 'webm' as const, mime: m || 'audio/webm' };
      if (m.includes('mpeg') || m === 'audio/mp3') return { ext: 'mp3' as const, mime: 'audio/mpeg' };
      if (m.includes('wav')) return { ext: 'wav' as const, mime: m || 'audio/wav' };
      if (m.includes('ogg')) return { ext: 'ogg' as const, mime: m || 'audio/ogg' };
      if (m.includes('mp4') || m.includes('m4a')) return { ext: 'm4a' as const, mime: 'audio/mp4' };
      if (m.includes('aac')) return { ext: 'aac' as const, mime: 'audio/aac' };
      if (m.includes('flac')) return { ext: 'flac' as const, mime: 'audio/flac' };
      return { ext: 'webm' as const, mime: 'audio/webm' };
    })();

    const slug = String((site as { slug?: string }).slug || 'site').slice(0, 24);
    const voiceName = `TB-${slug}-${Date.now()}`.slice(0, 80);

    const created = await createElevenLabsVoiceFromSamples({
      name: voiceName,
      files: [{ buffer, filename: `sample.${ext}`, mimeType: mime }],
    });

    if ('error' in created) {
      return NextResponse.json({ error: created.error }, { status: 502 });
    }

    const debOk = await applySiteAiBudgetDeduction(db, siteId, access.deductFreeUsd, access.deductPaidUsd);
    if (!debOk) {
      return NextResponse.json({ error: 'Falha ao debitar orçamento IA' }, { status: 402 });
    }

    const { error: upErr } = await db
      .from('mini_sites')
      .update({
        identity_clone_voice_id: created.voiceId,
        lively_elevenlabs_voice_owner: created.voiceId,
      })
      .eq('id', siteId)
      .eq('user_id', user.id);

    if (upErr) {
      console.error('[identity/voice-clone] update', upErr);
      return NextResponse.json({ error: 'Erro ao gravar voz' }, { status: 500 });
    }

    return NextResponse.json({ voiceId: created.voiceId });
  } catch (e) {
    console.error('[identity/voice-clone]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
