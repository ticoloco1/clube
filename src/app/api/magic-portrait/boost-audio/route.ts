export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceDb } from '@/lib/livelyAvatarServer';
import { getActiveMagicBoostForSlug } from '@/lib/magicBoostQuery';

/**
 * GET ?slug= — redireciona para o MP3 em cache (patrocínio); 404 se o dono ainda não preparou o áudio.
 */
export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase() || '';
    if (!slug) {
      return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 });
    }

    const boost = await getActiveMagicBoostForSlug(slug);
    const url = boost?.ttsPublicUrl?.trim();
    if (!url) {
      return NextResponse.json({ error: 'Áudio ainda não disponível' }, { status: 404 });
    }

    return NextResponse.redirect(url, 302);
  } catch (e) {
    console.error('[magic-portrait/boost-audio]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
