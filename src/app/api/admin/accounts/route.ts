export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = (process.env.ADMIN_OWNER_EMAIL || 'arytcf@gmail.com').toLowerCase();

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

function isUserBlocked(bannedUntil?: string | null): boolean {
  if (!bannedUntil) return false;
  const t = new Date(bannedUntil).getTime();
  return Number.isFinite(t) && t > Date.now();
}

/** GET ?page=1&perPage=50 — lista contas Auth (service role). */
export async function GET(req: NextRequest) {
  try {
    const admin = await getSessionUser();
    if (!admin?.email || admin.email.toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getServiceDb();
    if (!db) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
    }

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1);
    const perPage = Math.min(
      200,
      Math.max(10, parseInt(req.nextUrl.searchParams.get('perPage') || '50', 10) || 50),
    );

    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    const payload = data as {
      users?: Array<{
        id: string;
        email?: string | null;
        phone?: string | null;
        created_at?: string;
        last_sign_in_at?: string | null;
        banned_until?: string | null;
      }>;
      total?: number;
    };
    const list = payload.users || [];
    const users = list.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      phone: u.phone ?? null,
      created_at: u.created_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
      banned_until: u.banned_until ?? null,
      blocked: isUserBlocked(u.banned_until),
    }));

    return NextResponse.json({
      users,
      page,
      perPage,
      hasMore: list.length === perPage,
      total: typeof payload.total === 'number' ? payload.total : null,
    });
  } catch (e) {
    console.error('[admin/accounts GET]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** PATCH { userId, blocked } — banir (Auth) ou habilitar (remover ban). */
export async function PATCH(req: Request) {
  try {
    const admin = await getSessionUser();
    if (!admin?.email || admin.email.toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getServiceDb();
    if (!db) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      blocked?: boolean;
    };
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const blocked = Boolean(body.blocked);
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    if (blocked && userId === admin.id) {
      return NextResponse.json({ error: 'Cannot block your own account' }, { status: 400 });
    }

    const { data, error } = await db.auth.admin.updateUserById(userId, {
      ban_duration: blocked ? '876000h' : 'none',
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    const u = data.user;
    return NextResponse.json({
      ok: true,
      user: u
        ? {
            id: u.id,
            email: u.email ?? null,
            banned_until: u.banned_until ?? null,
            blocked: isUserBlocked(u.banned_until),
          }
        : null,
    });
  } catch (e) {
    console.error('[admin/accounts PATCH]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** DELETE { userId } — remove conta Auth (admin only). */
export async function DELETE(req: Request) {
  try {
    const admin = await getSessionUser();
    if (!admin?.email || admin.email.toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getServiceDb();
    if (!db) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as { userId?: string };
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    if (userId === admin.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const { error } = await db.auth.admin.deleteUser(userId, true);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/accounts DELETE]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
