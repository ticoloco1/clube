export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { assertAdminApiAccess } from '@/lib/adminOwnerEmail';

const MAX_LINES = 80;

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

function normalizeSlugPart(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function defaultSiteNameFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim() || slug;
}

type ParsedLine = { slug: string; site_name: string };

function parseBulkLines(text: string): ParsedLine[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: ParsedLine[] = [];
  const seen = new Set<string>();
  for (const line of lines.slice(0, MAX_LINES)) {
    const parts = line.split(/[,|\t]/).map((p) => p.trim()).filter(Boolean);
    const slugRaw = parts[0] || '';
    const slug = normalizeSlugPart(slugRaw);
    if (!slug || slug.length < 2) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    const nameRest = parts.slice(1).join(' ').trim();
    const site_name = nameRest || defaultSiteNameFromSlug(slug);
    out.push({ slug, site_name });
  }
  return out;
}

/**
 * POST { text?: string, lines?: { slug: string; site_name?: string }[] }
 * Cria mini_sites na conta do admin (service role). Um slug por linha; opcional nome após vírgula ou tab.
 */
export async function POST(req: Request) {
  try {
    const db = getServiceDb();
    const user = await getSessionUser();
    if (!(await assertAdminApiAccess(user, db))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!db || !user?.id) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      text?: string;
      lines?: Array<{ slug?: string; site_name?: string }>;
    };

    let items: ParsedLine[] = [];
    if (Array.isArray(body.lines) && body.lines.length) {
      const seen = new Set<string>();
      for (const row of body.lines.slice(0, MAX_LINES)) {
        const slug = normalizeSlugPart(String(row.slug || ''));
        if (!slug || slug.length < 2) continue;
        if (seen.has(slug)) continue;
        seen.add(slug);
        const site_name =
          (typeof row.site_name === 'string' && row.site_name.trim()) || defaultSiteNameFromSlug(slug);
        items.push({ slug, site_name });
      }
    } else if (typeof body.text === 'string' && body.text.trim()) {
      items = parseBulkLines(body.text);
    }

    if (!items.length) {
      return NextResponse.json({ error: 'Nenhum slug válido (mín. 2 caracteres).' }, { status: 400 });
    }

    const results: { slug: string; ok: boolean; error?: string; id?: string }[] = [];

    for (const { slug, site_name } of items) {
      const { data: exists } = await db.from('mini_sites').select('id').eq('slug', slug).maybeSingle();
      if (exists) {
        results.push({ slug, ok: false, error: 'slug já existe' });
        continue;
      }

      const { data: inserted, error } = await db
        .from('mini_sites')
        .insert({
          user_id: user.id,
          slug,
          site_name,
          published: true,
          lively_avatar_enabled: true,
        })
        .select('id')
        .maybeSingle();

      if (error) {
        results.push({ slug, ok: false, error: error.message });
        continue;
      }
      results.push({
        slug,
        ok: true,
        id: (inserted as { id?: string } | null)?.id,
      });
    }

    const okCount = results.filter((r) => r.ok).length;
    return NextResponse.json({ ok: true, results, okCount, total: results.length });
  } catch (e) {
    console.error('[create-mini-sites-bulk]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
