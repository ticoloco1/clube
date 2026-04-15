export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function getSessionUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: (n: string, v: string, o: Record<string, unknown>) => cookieStore.set({ name: n, value: v, ...o }),
        remove: (n: string, o: Record<string, unknown>) => cookieStore.set({ name: n, value: '', ...o }),
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function teaserFromPost(p: Record<string, unknown>): string {
  const t = typeof p.paywall_teaser === 'string' ? p.paywall_teaser.trim() : '';
  if (t) return t;
  const body = typeof p.text === 'string' ? p.text.trim() : '';
  if (!body) return '🔒 Conteúdo exclusivo — desbloqueia para ver tudo.';
  return `${body.slice(0, 140)}${body.length > 140 ? '…' : ''}`;
}

/**
 * Lista posts do feed para o mini-site público, com conteúdo sensível oculto
 * quando `paywall_locked` e o visitante não tem desbloqueio.
 */
export async function GET(req: NextRequest) {
  try {
    const siteId = req.nextUrl.searchParams.get('site_id')?.trim() || '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteId)) {
      return NextResponse.json({ error: 'site_id inválido' }, { status: 400 });
    }

    const db = getDb();
    const user = await getSessionUser();

    const { data: site, error: sErr } = await db
      .from('mini_sites')
      .select('id, user_id, published')
      .eq('id', siteId)
      .maybeSingle();
    if (sErr || !site) {
      return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });
    }
    const s = site as { id: string; user_id: string; published: boolean };
    const isOwner = !!user && user.id === s.user_id;
    if (!s.published && !isOwner) {
      return NextResponse.json({ error: 'Indisponível' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const primary = await db
      .from('feed_posts')
      .select('*')
      .eq('site_id', siteId)
      .or(`pinned.eq.true,expires_at.gt.${now}`)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(40);

    let rows = (primary.data || []) as Record<string, unknown>[];
    if (primary.error) {
      const fallback = await db
        .from('feed_posts')
        .select('*')
        .eq('site_id', siteId)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false })
        .limit(40);
      rows = ((fallback.data || []) as Record<string, unknown>[]).map((row) => ({ ...row, pinned: false }));
    }

    const postIds = rows.map((r) => String(r.id || '')).filter(Boolean);
    const unlocked = new Set<string>();
    if (user && postIds.length) {
      const { data: un } = await db.from('feed_post_unlocks' as never).select('post_id').eq('user_id', user.id).in('post_id', postIds);
      for (const u of un || []) {
        const id = String((u as { post_id?: string }).post_id || '');
        if (id) unlocked.add(id);
      }
    }

    const safe = rows.map((p) => {
      const id = String(p.id || '');
      const locked = Boolean(p.paywall_locked);
      const price = Number(p.paywall_price_usd ?? 0);
      const posterId = String(p.user_id || '');
      const canSee =
        !locked ||
        isOwner ||
        (user && (user.id === posterId || unlocked.has(id)));

      if (canSee) {
        return { ...p, feed_viewer_unlocked: true };
      }
      return {
        ...p,
        text: teaserFromPost(p),
        image_url: null,
        media_urls: [],
        video_embed_url: null,
        feed_viewer_unlocked: false,
        paywall_price_usd: Number.isFinite(price) && price > 0 ? price : null,
      };
    });

    return NextResponse.json({ posts: safe });
  } catch (e) {
    console.error('[mini-site-feed]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
