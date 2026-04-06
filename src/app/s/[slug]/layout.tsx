import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import { getSiteBaseUrl, getProductRootDomain, miniSiteCanonicalUrl } from '@/lib/siteBaseUrl';
import { resolvePublicSiteFaceUrl } from '@/lib/floatingAgentImage';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const SITE_BASE = getSiteBaseUrl();

function miniSiteUrl(slug: string): string {
  return `https://${slug}.${getProductRootDomain()}`;
}

function buildJsonLd(
  site: {
    site_name: string;
    bio: string | null;
    avatar_url: string | null;
    cv_skills: string[] | null;
    slug: string;
    seo_json_ld?: string | null;
  },
  description: string,
  url: string,
  /** Imagem pública do perfil (já respeita retrato mágico on/off). */
  publicProfileImage?: string | null,
): string {
  const personNode: Record<string, unknown> = {
    '@type': 'Person',
    name: site.site_name,
    description,
    url,
    image: (publicProfileImage && publicProfileImage.trim()) || undefined,
    sameAs: [miniSiteUrl(site.slug)],
    knowsAbout: (site.cv_skills || []).slice(0, 5),
  };

  const raw = site.seo_json_ld?.trim();
  if (!raw) {
    return JSON.stringify({ '@context': 'https://schema.org', ...personNode });
  }
    try {
      const parsed = JSON.parse(raw) as unknown;
      const graph: unknown[] = [personNode];
      if (Array.isArray(parsed)) {
        graph.push(...parsed);
      } else if (parsed && typeof parsed === 'object' && parsed !== null) {
        const g = (parsed as Record<string, unknown>)['@graph'];
        if (Array.isArray(g)) {
          graph.push(...g);
        } else {
          graph.push(parsed);
        }
      }
      return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  } catch {
    return JSON.stringify({ '@context': 'https://schema.org', ...personNode });
  }
}

export async function generateMetadata(
  { params }: { params: { slug: string } },
): Promise<Metadata> {
  const { data: site } = await getDb()
    .from('mini_sites')
    .select(
      'site_name, bio, avatar_url, cv_headline, cv_skills, slug, seo_title, seo_description, seo_og_image, seo_search_tags, seo_json_ld, magic_portrait_enabled, identity_portrait_url',
    )
    .eq('slug', params.slug)
    .eq('published', true)
    .maybeSingle();

  if (!site) {
    return {
      title: `/${params.slug} | TrustBank`,
      description: 'This mini site does not exist yet.',
    };
  }

  const magicAgent =
    (site as { magic_portrait_enabled?: boolean }).magic_portrait_enabled === true
      ? `Agente IA de ${site.site_name} — Parcerias`
      : null;
  const title =
    site.seo_title?.trim() ||
    (magicAgent ? `${magicAgent} | TrustBank` : `${site.site_name} | TrustBank`);
  const description = (
    site.seo_description?.trim() ||
    (site.cv_headline ? `${site.cv_headline} — ${site.bio || ''}` : site.bio || `${site.site_name}'s professional mini site on TrustBank`)
  ).slice(0, 160);

  const url = miniSiteUrl(params.slug);
  const autoOg = `${SITE_BASE}/api/og/site?slug=${encodeURIComponent(params.slug)}`;

  const customOg = site.seo_og_image?.trim();
  const magicOn = (site as { magic_portrait_enabled?: boolean }).magic_portrait_enabled === true;
  const publicFaceOg = resolvePublicSiteFaceUrl({
    avatarUrl: site.avatar_url,
    identityPortraitUrl: (site as { identity_portrait_url?: string | null }).identity_portrait_url,
    magicPortraitEnabled: magicOn,
  });
  let ogImageUrl: string;
  if (customOg) {
    ogImageUrl = customOg;
  } else if (publicFaceOg) {
    ogImageUrl = publicFaceOg;
  } else {
    ogImageUrl = autoOg;
  }

  const kw = Array.isArray(site.seo_search_tags)
    ? site.seo_search_tags.map((k) => String(k).trim()).filter(Boolean)
    : [];

  return {
    title,
    description,
    keywords: kw.length ? kw : undefined,
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'TrustBank',
      type: 'profile',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: site.site_name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    other: {
      'application/ld+json': buildJsonLd(
        site as typeof site & { seo_json_ld?: string | null },
        description,
        url,
        publicFaceOg,
      ),
    },
  };
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
