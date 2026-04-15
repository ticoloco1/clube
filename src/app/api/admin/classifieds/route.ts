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
      .from('classified_listings')
      .select('id,user_id,site_id,type,title,price,currency,status,created_at,mini_sites(slug,site_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
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
    console.error('[admin/classifieds GET]', e);
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

    const body = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
    const id = String(body.id || '').trim();
    const status = String(body.status || '').trim();
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });
    if (!['pending', 'active', 'blocked'].includes(status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }

    const { error } = await db.from('classified_listings').update({ status }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/classifieds PATCH]', e);
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

    const { error } = await db.from('classified_listings').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/classifieds DELETE]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
