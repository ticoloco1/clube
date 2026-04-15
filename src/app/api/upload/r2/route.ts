import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { putBufferToR2 } from '@/lib/r2Server';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;
const ALLOWED_PREFIXES = ['image/', 'video/', 'audio/'];

function sanitizePart(v: string) {
  return v.replace(/[^a-z0-9/_-]/gi, '_').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
}

function extFromFile(file: File) {
  const byName = file.name.split('.').pop()?.trim().toLowerCase();
  if (byName && /^[a-z0-9]{1,8}$/.test(byName)) return byName;
  const byMime = (file.type.split('/')[1] || '').toLowerCase();
  if (byMime && /^[a-z0-9.+-]{1,12}$/.test(byMime)) return byMime.replace(/[.+-]/g, '');
  return 'bin';
}

async function requireUser() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) return null;
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get: (n: string) => cookieStore.get(n)?.value,
      set: (n: string, v: string, o: Record<string, unknown>) => cookieStore.set({ name: n, value: v, ...o }),
      remove: (n: string, o: Record<string, unknown>) => cookieStore.set({ name: n, value: '', ...o }),
    },
  });
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file');
    const folderRaw = String(form.get('folder') || 'uploads');
    const userIdRaw = String(form.get('userId') || '').trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    if (!ALLOWED_PREFIXES.some((p) => file.type.startsWith(p))) {
      return NextResponse.json({ error: 'Unsupported media type' }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `Invalid file size (max ${MAX_UPLOAD_BYTES} bytes)` }, { status: 400 });
    }

    const safeFolder = sanitizePart(folderRaw || 'uploads');
    const ownerId = sanitizePart(userIdRaw || user.id);
    if (!ownerId || ownerId !== sanitizePart(user.id)) {
      return NextResponse.json({ error: 'Invalid user for upload' }, { status: 403 });
    }

    const ext = extFromFile(file);
    const key = `${ownerId}/${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const body = Buffer.from(await file.arrayBuffer());

    const url = await putBufferToR2({
      key,
      body,
      contentType: file.type || 'application/octet-stream',
    });
    return NextResponse.json({ ok: true, url, key });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
