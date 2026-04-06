export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { isDbPaywallEnabled, isValidYouTubeVideoId } from '@/lib/utils';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getSecret() {
  return process.env.VIDEO_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

type TokenPayload = { v: string; yt: string; exp: number };

function signToken(payload: TokenPayload): string {
  const secret = getSecret();
  if (!secret) throw new Error('VIDEO_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY required');
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySignedToken(token: string): TokenPayload | null {
  const secret = getSecret();
  if (!secret) return null;
  const i = token.indexOf('.');
  if (i <= 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  try {
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!json.v || !json.yt || typeof json.exp !== 'number') return null;
    return json;
  } catch {
    return null;
  }
}

async function getSessionUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: (n: string, v: string, o: Record<string, unknown>) =>
          cookieStore.set({ name: n, value: v, ...o }),
        remove: (n: string, o: Record<string, unknown>) =>
          cookieStore.set({ name: n, value: '', ...o }),
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/** POST: emite token assinado para embed do YouTube (não expõe o ID no HTML até liberar). */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    const siteSlug = typeof body.siteSlug === 'string' ? body.siteSlug.trim().toLowerCase() : '';

    if (!videoId) {
      return NextResponse.json({ error: 'videoId obrigatório' }, { status: 400 });
    }

    const db = getDb();
    const { data: video, error: vErr } = await db
      .from('mini_site_videos')
      .select('id, site_id, youtube_video_id, paywall_enabled, paywall_price')
      .eq('id', videoId)
      .maybeSingle();

    if (vErr) {
      console.error('[video-token]', vErr);
      return NextResponse.json({ error: 'Erro ao carregar vídeo' }, { status: 500 });
    }
    if (!video || !(video as { youtube_video_id?: string }).youtube_video_id) {
      return NextResponse.json({ error: 'Vídeo não encontrado' }, { status: 404 });
    }

    const { data: site } = await db
      .from('mini_sites')
      .select('id, slug, user_id, published')
      .eq('id', (video as { site_id: string }).site_id)
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });
    }

    const s = site as { slug: string; user_id: string; published: boolean };
    if (siteSlug && s.slug.toLowerCase() !== siteSlug) {
      return NextResponse.json({ error: 'Slug inválido' }, { status: 400 });
    }
    if (!s.published && user.id !== s.user_id) {
      return NextResponse.json({ error: 'Indisponível' }, { status: 403 });
    }

    const paywall = isDbPaywallEnabled((video as { paywall_enabled?: unknown }).paywall_enabled);
    const isOwner = user.id === s.user_id;

    // Antes de validar o ID do YouTube: visitante sem desbloqueio deve ver pagamento (402), não erro genérico.
    if (paywall && !isOwner) {
      const { data: unlock } = await db
        .from('paywall_unlocks' as never)
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (!unlock) {
        return NextResponse.json({ error: 'Paywall' }, { status: 402 });
      }
    }

    const ytRaw = (video as { youtube_video_id?: string | null }).youtube_video_id;
    const yt = typeof ytRaw === 'string' ? ytRaw.trim() : '';
    if (!isValidYouTubeVideoId(yt)) {
      return NextResponse.json({ error: 'ID de vídeo inválido' }, { status: 400 });
    }

    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = signToken({ v: videoId, yt, exp });

    return NextResponse.json({ token });
  } catch (e) {
    console.error('[video-token] POST', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/** GET: valida token e devolve ytId para o iframe (sem sessão). */
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t');
  if (!t) {
    return NextResponse.json({ valid: false });
  }
  const payload = verifySignedToken(t);
  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) {
    return NextResponse.json({ valid: false });
  }
  return NextResponse.json({ valid: true, ytId: payload.yt });
}
