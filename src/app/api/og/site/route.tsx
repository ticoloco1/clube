import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const SITE_NAME = 'TrustBank';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get('slug') || '').trim().toLowerCase().slice(0, 80);

  let displayName = slug
    ? slug
        .split('-')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : SITE_NAME;
  let tagline = 'Mini site profissional na TrustBank';
  let accent = '#6366f1';

  if (slug && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { data: site } = await getDb()
        .from('mini_sites')
        .select('site_name, slug, bio, cv_headline, accent_color, published')
        .eq('slug', slug)
        .maybeSingle();

      if (site) {
        const pub = !!(site as { published?: boolean }).published;
        const ac = (site as { accent_color?: string }).accent_color;
        if (ac && /^#[0-9A-Fa-f]{6}$/.test(ac)) accent = ac;

        if (pub) {
          displayName = ((site as { site_name?: string }).site_name || slug).trim() || displayName;
          const bio = ((site as { bio?: string }).bio || '').replace(/\s+/g, ' ').trim();
          const head = ((site as { cv_headline?: string }).cv_headline || '').trim();
          tagline = (head || bio || tagline).slice(0, 140);
        } else {
          displayName = SITE_NAME;
          tagline = 'Mini site em TrustBank';
        }
      }
    } catch {
      /* fallback card */
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(145deg, #0f172a 0%, ${accent}35 42%, #020617 100%)`,
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: accent,
            }}
          />
          <div style={{ fontSize: 36, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>{SITE_NAME}</div>
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: '#ffffff',
            textAlign: 'center',
            maxWidth: 1040,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
          }}
        >
          {displayName}
        </div>
        <div
          style={{
            fontSize: 26,
            color: 'rgba(248,250,252,0.78)',
            marginTop: 28,
            textAlign: 'center',
            maxWidth: 920,
            lineHeight: 1.35,
          }}
        >
          {tagline}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 44,
            fontSize: 22,
            color: accent,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {slug ? `${slug}.trustbank.xyz` : 'trustbank.xyz'}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
