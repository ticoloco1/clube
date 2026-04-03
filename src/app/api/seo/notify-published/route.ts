export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { notifySearchEnginesForMiniSiteSlug } from '@/lib/seoSearchPings';

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
        set: (n: string, v: string, o: Record<string, unknown>) =>
          cookieStore.set({ name: n, value: v, ...o }),
        remove: (n: string, o: Record<string, unknown>) =>
          cookieStore.set({ name: n, value: '', ...o }),
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * POST { slug } — após publicar: ping sitemap (Google/Bing) + IndexNow opcional.
 * Só para o dono do mini-site com `published === true`.
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') : '';
    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    const db = getDb();
    const { data: row, error } = await db
      .from('mini_sites')
      .select('user_id, published')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    if ((row as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!(row as { published?: boolean }).published) {
      return NextResponse.json({ error: 'Site not published' }, { status: 400 });
    }

    const pings = await notifySearchEnginesForMiniSiteSlug(slug);
    return NextResponse.json({ ok: true, pings });
  } catch (e) {
    console.error('[notify-published]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
