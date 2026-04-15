export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { assertAdminApiAccess } from '@/lib/adminOwnerEmail';

function getServiceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const db = getServiceDb();
    if (!(await assertAdminApiAccess(user, db))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1);
    const perPage = Math.min(100, Math.max(10, parseInt(req.nextUrl.searchParams.get('perPage') || '30', 10) || 30));
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await db
      .from('mini_sites')
      .select('id,user_id,slug,site_name,avatar_url,published,updated_at,contact_email', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      rows: data || [],
      page,
      perPage,
      total: typeof count === 'number' ? count : 0,
      hasMore: (data || []).length === perPage,
    });
  } catch (e) {
    console.error('[admin/minisites GET]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    const db = getServiceDb();
    if (!(await assertAdminApiAccess(user, db))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });

    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      action?: 'publish' | 'block';
    };
    const id = String(body.id || '').trim();
    const action = body.action;
    if (!id || !action) {
      return NextResponse.json({ error: 'id and action required' }, { status: 400 });
    }

    const published = action === 'publish';
    const { error } = await db.from('mini_sites').update({ published }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, published });
  } catch (e) {
    console.error('[admin/minisites PATCH]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    const db = getServiceDb();
    if (!(await assertAdminApiAccess(user, db))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!db) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });

    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data: site, error: findErr } = await db
      .from('mini_sites')
      .select('id,user_id,slug')
      .eq('id', id)
      .maybeSingle();
    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });
    if (!site) return NextResponse.json({ error: 'Mini-site not found' }, { status: 404 });

    const row = site as { id: string; user_id: string; slug: string };
    await Promise.all([
      db.from('mini_site_links').delete().eq('site_id', row.id),
      db.from('mini_site_videos').delete().eq('site_id', row.id),
      (db as any).from('feed_posts').delete().eq('site_id', row.id),
      (db as any).from('site_visits').delete().eq('site_id', row.id),
      (db as any).from('site_link_clicks').delete().eq('site_id', row.id),
    ]);
    await (db as any).from('slug_registrations').delete().eq('user_id', row.user_id).eq('slug', row.slug);

    const { error } = await db.from('mini_sites').delete().eq('id', row.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/minisites DELETE]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
