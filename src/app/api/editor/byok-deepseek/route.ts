export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { encryptByokPlaintext } from '@/lib/byokCrypto';

const OWNER_EMAIL = (process.env.ADMIN_OWNER_EMAIL || 'arytcf@gmail.com').toLowerCase();

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

async function assertSiteOwner(db: ReturnType<typeof getDb>, siteId: string, userId: string, email: string) {
  const { data: site, error } = await db.from('mini_sites').select('id,user_id').eq('id', siteId).maybeSingle();
  if (error || !site) return { ok: false as const, status: 404 as const };
  const row = site as { user_id: string };
  if (row.user_id !== userId && email !== OWNER_EMAIL) {
    return { ok: false as const, status: 403 as const };
  }
  return { ok: true as const };
}

function looksLikeDeepseekKey(k: string): boolean {
  const t = k.trim();
  return t.length >= 20 && t.length <= 512;
}

/** GET ?siteId= — { configured: boolean } */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const siteId = req.nextUrl.searchParams.get('siteId')?.trim() || '';
    if (!siteId) {
      return NextResponse.json({ error: 'siteId obrigatório' }, { status: 400 });
    }

    const db = getDb();
    const gate = await assertSiteOwner(db, siteId, user.id, (user.email || '').toLowerCase());
    if (!gate.ok) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: gate.status });
    }

    const { data } = await db.from('mini_site_ai_secrets').select('site_id').eq('site_id', siteId).maybeSingle();

    return NextResponse.json({ configured: !!data });
  } catch (e) {
    console.error('[byok-deepseek GET]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/** POST { siteId, apiKey } — guarda (substitui). Corpo nunca é logado. */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : '';
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

    if (!siteId || !apiKey) {
      return NextResponse.json({ error: 'siteId e apiKey obrigatórios' }, { status: 400 });
    }
    if (!looksLikeDeepseekKey(apiKey)) {
      return NextResponse.json({ error: 'Chave API inválida' }, { status: 400 });
    }

    const db = getDb();
    const gate = await assertSiteOwner(db, siteId, user.id, (user.email || '').toLowerCase());
    if (!gate.ok) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: gate.status });
    }

    let deepseek_api_enc: string;
    try {
      deepseek_api_enc = encryptByokPlaintext(apiKey);
    } catch {
      return NextResponse.json(
        { error: 'Servidor sem BYOK_ENCRYPTION_SECRET (mín. 32 caracteres).' },
        { status: 503 },
      );
    }
    const { error } = await db.from('mini_site_ai_secrets').upsert(
      { site_id: siteId, deepseek_api_enc, updated_at: new Date().toISOString() },
      { onConflict: 'site_id' },
    );

    if (error) {
      console.error('[byok-deepseek POST]', error.message);
      return NextResponse.json({ error: 'Falha ao guardar' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[byok-deepseek POST]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/** DELETE ?siteId= ou POST body — remove chave */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const siteId = req.nextUrl.searchParams.get('siteId')?.trim() || '';
    if (!siteId) {
      return NextResponse.json({ error: 'siteId obrigatório' }, { status: 400 });
    }

    const db = getDb();
    const gate = await assertSiteOwner(db, siteId, user.id, (user.email || '').toLowerCase());
    if (!gate.ok) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: gate.status });
    }

    await db.from('mini_site_ai_secrets').delete().eq('site_id', siteId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[byok-deepseek DELETE]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
