export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = (process.env.ADMIN_OWNER_EMAIL || 'arytcf@gmail.com').toLowerCase();

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Remove mini-site e dados relacionados (bypass RLS). Só o email admin. */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.email || user.email.toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!slug && !email) {
      return NextResponse.json({ error: 'Informe slug ou email' }, { status: 400 });
    }

    const db = getDb();
    let q = db.from('mini_sites').select('id,user_id,slug,site_name,contact_email').limit(1);
    if (slug) q = q.eq('slug', slug);
    else q = q.eq('contact_email', email);

    const { data: site, error: findErr } = await q.maybeSingle();
    if (findErr) {
      console.error('[delete-mini-site]', findErr);
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }
    if (!site) {
      return NextResponse.json({ error: 'Mini-site não encontrado' }, { status: 404 });
    }

    const row = site as { id: string; user_id: string; slug: string };

    await Promise.all([
      db.from('mini_site_links').delete().eq('site_id', row.id),
      db.from('mini_site_videos').delete().eq('site_id', row.id),
      (db as any).from('feed_posts').delete().eq('site_id', row.id),
      (db as any).from('site_visits').delete().eq('site_id', row.id),
      (db as any).from('site_link_clicks').delete().eq('site_id', row.id),
    ]);

    await (db as any).from('slug_registrations').delete().eq('user_id', row.user_id).eq('slug', row.slug);

    const { error: delErr } = await db.from('mini_sites').delete().eq('id', row.id);
    if (delErr) {
      console.error('[delete-mini-site] delete', delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, slug: row.slug });
  } catch (e) {
    console.error('[delete-mini-site]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
