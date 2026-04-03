export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getIdentitySessionUser } from '@/lib/identitySession';
import { getServiceDb, rateLimitLively } from '@/lib/livelyAvatarServer';
import { elevenLabsTtsMp3 } from '@/lib/elevenLabsTts';
import { polishMagicBoostScript, type MagicTone } from '@/lib/magicBoostPolish';
import { applySiteAiBudgetDeduction, assertOwnerAiBudgetUsd, IA_USD, readSiteAiBudget } from '@/lib/aiUsdBudget';
import { iaUsdBillingApplies } from '@/lib/iaBillingSubscription';
import type { AiConfigRow } from '@/lib/aiOpenAiCompatible';

async function loadAiConfig(db: ReturnType<typeof getServiceDb>): Promise<AiConfigRow> {
  const { data } = await db.from('platform_settings' as never).select('value').eq('key', 'ai_config').maybeSingle();
  const row = data as { value?: string } | null;
  if (!row?.value) return {};
  try {
    return JSON.parse(row.value) as AiConfigRow;
  } catch {
    return {};
  }
}

/**
 * POST { slug } — dono do mini-site: polir copy + TTS com clone + upload público + atualizar magic_boost.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getIdentitySessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!rateLimitLively(`mbprep:${ip}:${user.id}`)) {
      return NextResponse.json({ error: 'Muitos pedidos.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    if (!slug) {
      return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 });
    }

    const db = getServiceDb();
    const { data: site, error: siteErr } = await db
      .from('mini_sites')
      .select(
        'id,user_id,site_name,trial_publish_until,ai_free_usd_remaining,ai_paid_usd_balance,identity_clone_voice_id,lively_elevenlabs_voice_owner,magic_portrait_enabled',
      )
      .eq('slug', slug)
      .maybeSingle();

    if (siteErr || !site || (site as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });
    }

    if ((site as { magic_portrait_enabled?: boolean }).magic_portrait_enabled !== true) {
      return NextResponse.json({ error: 'Retrato mágico desativado no editor' }, { status: 400 });
    }

    const voiceId =
      (typeof (site as { identity_clone_voice_id?: string }).identity_clone_voice_id === 'string' &&
        (site as { identity_clone_voice_id: string }).identity_clone_voice_id.trim()) ||
      (typeof (site as { lively_elevenlabs_voice_owner?: string }).lively_elevenlabs_voice_owner === 'string' &&
        (site as { lively_elevenlabs_voice_owner: string }).lively_elevenlabs_voice_owner.trim()) ||
      '';

    if (!voiceId) {
      return NextResponse.json({ error: 'Configura um clone de voz (Identidade) primeiro' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: campaigns } = await db
      .from('ad_campaigns' as never)
      .select('id, magic_boost')
      .eq('site_id', (site as { id: string }).id)
      .eq('status', 'active')
      .gt('ends_at', now)
      .order('starts_at', { ascending: false })
      .limit(3);

    type Camp = { id: string; magic_boost: Record<string, unknown> | null };
    let chosen: Camp | null = null;
    for (const c of (campaigns || []) as Camp[]) {
      const m = c.magic_boost;
      if (!m || typeof m !== 'object') continue;
      if (typeof m.ttsPublicUrl === 'string' && m.ttsPublicUrl.startsWith('http')) continue;
      chosen = c;
      break;
    }

    if (!chosen) {
      return NextResponse.json({ error: 'Nenhuma campanha patrocinada pendente de áudio' }, { status: 400 });
    }

    const m = chosen.magic_boost || {};
    const { freeUsd, paidUsd } = readSiteAiBudget(site);
    const costUsd = IA_USD.magic_boost_prepare();
    const billingApplies = await iaUsdBillingApplies(db, {
      user_id: (site as { user_id: string }).user_id,
      trial_publish_until: (site as { trial_publish_until?: string | null }).trial_publish_until,
    });
    const access = assertOwnerAiBudgetUsd(freeUsd, paidUsd, costUsd, !billingApplies);
    if (!access.ok) {
      return NextResponse.json({ error: access.message, code: 'IA_PAYWALL' }, { status: 402 });
    }

    const aiConfig = await loadAiConfig(db);
    const tone: MagicTone = m.tone === 'wild_monkey' ? 'wild_monkey' : 'professional';
    const rawScript = typeof m.scriptRaw === 'string' ? m.scriptRaw : '';
    const productLabel = typeof m.productLabel === 'string' ? m.productLabel : 'produto';
    const brandColor = typeof m.brandColor === 'string' ? m.brandColor : '#ffffff';

    const polished =
      (typeof m.polishedScript === 'string' && m.polishedScript.trim() && m.polishedScript) ||
      (await polishMagicBoostScript({
        aiConfig,
        rawScript: rawScript || `Apresenta ${productLabel} de forma apelativa.`,
        tone,
        productLabel,
        brandColor,
        creatorName: (site as { site_name?: string }).site_name || 'criador',
      }));

    if (!polished) {
      return NextResponse.json({ error: 'Falha ao polir texto (IA não configurada?)' }, { status: 503 });
    }

    const buf = await elevenLabsTtsMp3(polished, voiceId);
    if (!buf) {
      return NextResponse.json({ error: 'ElevenLabs indisponível' }, { status: 503 });
    }

    const path = `magic-boost/${chosen.id}.mp3`;
    const upload = await db.storage.from('platform-assets').upload(path, Buffer.from(buf), {
      contentType: 'audio/mpeg',
      upsert: true,
    });

    if (upload.error) {
      console.error('[prepare-boost-audio] storage', upload.error);
      return NextResponse.json({ error: 'Falha no armazenamento' }, { status: 500 });
    }

    const { data: pub } = db.storage.from('platform-assets').getPublicUrl(path);
    const ttsPublicUrl = pub?.publicUrl || '';

    const debOk = await applySiteAiBudgetDeduction(
      db,
      (site as { id: string }).id,
      access.deductFreeUsd,
      access.deductPaidUsd,
    );
    if (!debOk) {
      return NextResponse.json({ error: 'Falha ao debitar orçamento IA' }, { status: 402 });
    }

    const nextBoost = {
      ...m,
      polishedScript: polished,
      ttsPublicUrl,
      preparedAt: new Date().toISOString(),
    };

    const { error: upErr } = await db
      .from('ad_campaigns' as never)
      .update({ magic_boost: nextBoost as never })
      .eq('id', chosen.id);

    if (upErr) {
      console.error('[prepare-boost-audio] update', upErr);
      return NextResponse.json({ error: 'Erro ao gravar campanha' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ttsPublicUrl, polishedScript: polished });
  } catch (e) {
    console.error('[magic-portrait/prepare-boost-audio]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
