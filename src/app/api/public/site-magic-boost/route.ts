export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb } from '@/lib/livelyAvatarServer';
import { getActiveMagicBoostForSlug } from '@/lib/magicBoostQuery';

/**
 * GET ?slug= — dados públicos para o Retrato Mágico (sem expor PII).
 */
export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase() || '';
    if (!slug) {
      return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 });
    }

    const db = getServiceDb();
    const { data: site, error } = await db
      .from('mini_sites')
      .select(
        'magic_portrait_enabled, identity_portrait_url, avatar_url, identity_voice_effect, site_name, published',
      )
      .eq('slug', slug)
      .maybeSingle();

    if (error || !site || !(site as { published?: boolean }).published) {
      return NextResponse.json({ enabled: false });
    }

    const enabled = (site as { magic_portrait_enabled?: boolean }).magic_portrait_enabled === true;
    if (!enabled) {
      return NextResponse.json({ enabled: false });
    }

    const boost = await getActiveMagicBoostForSlug(slug);
    const portraitUrl =
      (typeof (site as { identity_portrait_url?: string }).identity_portrait_url === 'string' &&
        (site as { identity_portrait_url: string }).identity_portrait_url) ||
      (typeof (site as { avatar_url?: string }).avatar_url === 'string' && (site as { avatar_url: string }).avatar_url) ||
      null;

    return NextResponse.json({
      enabled: true,
      boost,
      portraitUrl,
      voiceEffect: (site as { identity_voice_effect?: string }).identity_voice_effect || 'neutral',
      siteName: (site as { site_name?: string }).site_name || '',
      audioReady: !!boost?.ttsPublicUrl,
    });
  } catch (e) {
    console.error('[public/site-magic-boost]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
