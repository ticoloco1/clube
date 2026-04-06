export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { decryptByokCiphertext } from '@/lib/byokCrypto';

type CreativeMode = 'script' | 'seo';

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

function providerOpenAiCompat(provider: string): { baseUrl: string; model: string } | null {
  switch (provider) {
    case 'openai':
      return { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' };
    case 'deepseek':
      return { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' };
    case 'groq':
      return { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.1-70b-versatile' };
    case 'mistral':
      return { baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-large-latest' };
    default:
      return null;
  }
}

function buildPrompt(mode: CreativeMode, input: string, siteContext: string): { system: string; user: string } {
  if (mode === 'seo') {
    return {
      system:
        'You are an expert SEO copywriter. Return only valid JSON with keys: seoTitle, seoDescription, tags (array of up to 8), ctaHeadline, ctaBody. Keep concise and conversion-focused.',
      user: `Context: ${siteContext}\n\nTopic: ${input}\n\nCreate SEO pack now.`,
    };
  }
  return {
    system:
      'You are an ad copy and short-video script writer. Return plain text with: hook line, 20-40s script, CTA line, and 3 short shot suggestions.',
    user: `Context: ${siteContext}\n\nBrief: ${input}\n\nGenerate a high-conversion script.`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const provider = typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : '';
    const mode = (body.mode === 'seo' ? 'seo' : 'script') as CreativeMode;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const siteContext = typeof body.siteContext === 'string' ? body.siteContext.trim() : '';

    if (!provider || !prompt) {
      return NextResponse.json({ error: 'provider and prompt are required' }, { status: 400 });
    }
    const runtime = providerOpenAiCompat(provider);
    if (!runtime) {
      return NextResponse.json({ error: 'Provider not supported yet for generation' }, { status: 400 });
    }

    const db = getDb();
    const { data: row } = await db
      .from('user_api_connections' as never)
      .select('api_key_enc, is_active')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle();
    const enc = (row as { api_key_enc?: string; is_active?: boolean } | null)?.api_key_enc || '';
    const active = !!(row as { is_active?: boolean } | null)?.is_active;
    if (!enc || !active) {
      return NextResponse.json({ error: `No active ${provider} API key found in API Hub` }, { status: 400 });
    }
    const apiKey = decryptByokCiphertext(enc)?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'Could not decrypt API key' }, { status: 500 });
    }

    const prompts = buildPrompt(mode, prompt, siteContext || 'Creator mini-site');
    const resp = await fetch(`${runtime.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: runtime.model,
        temperature: 0.7,
        messages: [
          { role: 'system', content: prompts.system },
          { role: 'user', content: prompts.user },
        ],
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg =
        typeof (data as { error?: { message?: string } }).error?.message === 'string'
          ? (data as { error: { message: string } }).error.message
          : `Provider request failed (${resp.status})`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const text = (data as any)?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No content returned by provider' }, { status: 400 });
    }

    if (mode === 'seo') {
      // Try to parse JSON; fallback with raw text if provider wrapped with markdown.
      let payload: any = null;
      const stripped = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
      try {
        payload = JSON.parse(stripped);
      } catch {
        payload = {
          seoTitle: '',
          seoDescription: stripped.slice(0, 300),
          tags: [],
          ctaHeadline: '',
          ctaBody: stripped,
        };
      }
      return NextResponse.json({ ok: true, mode, provider, data: payload, raw: text });
    }

    return NextResponse.json({ ok: true, mode, provider, text });
  } catch (e) {
    console.error('[byok/creative]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

