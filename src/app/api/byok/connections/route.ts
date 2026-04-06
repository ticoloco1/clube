export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { encryptByokPlaintext } from '@/lib/byokCrypto';
import { BYOK_PROVIDERS, byokProviderById } from '@/lib/byokProviders';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
        set: (n: string, v: string, o: Record<string, unknown>) => cookieStore.set({ name: n, value: v, ...o }),
        remove: (n: string, o: Record<string, unknown>) => cookieStore.set({ name: n, value: '', ...o }),
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const db = getDb();
    const { data, error } = await db
      .from('user_api_connections' as never)
      .select('provider, is_active, last_checked_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[byok/connections GET]', error);
      return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 });
    }

    return NextResponse.json({
      providers: BYOK_PROVIDERS,
      connections: data || [],
    });
  } catch (e) {
    console.error('[byok/connections GET]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const provider = typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : '';
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'provider and apiKey are required' }, { status: 400 });
    }
    if (!byokProviderById(provider)) {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }
    if (apiKey.length < 12 || apiKey.length > 1024) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
    }

    let apiKeyEnc: string;
    try {
      apiKeyEnc = encryptByokPlaintext(apiKey);
    } catch {
      return NextResponse.json({ error: 'BYOK encryption is not configured' }, { status: 503 });
    }

    const db = getDb();
    const { error } = await db
      .from('user_api_connections' as never)
      .upsert(
        {
          user_id: user.id,
          provider,
          api_key_enc: apiKeyEnc,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' },
      );
    if (error) {
      console.error('[byok/connections POST]', error);
      return NextResponse.json({ error: 'Could not save API key' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[byok/connections POST]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const provider = req.nextUrl.searchParams.get('provider')?.trim().toLowerCase() || '';
    if (!provider) return NextResponse.json({ error: 'provider is required' }, { status: 400 });
    if (!byokProviderById(provider)) return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });

    const db = getDb();
    const { error } = await db
      .from('user_api_connections' as never)
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider);
    if (error) {
      console.error('[byok/connections DELETE]', error);
      return NextResponse.json({ error: 'Could not remove API key' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[byok/connections DELETE]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

