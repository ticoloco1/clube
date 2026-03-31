import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const { data: site } = await getDb()
    .from('mini_sites')
    .select('site_name, bio, avatar_url, cv_headline, cv_skills, slug, seo_title, seo_description, seo_og_image')
    .eq('slug', params.slug)
    .eq('published', true)
    .maybeSingle();

  if (!site) {
    return {
      title: `/${params.slug} | TrustBank`,
      description: 'This mini site does not exist yet.',
    };
  }

  const title = site.seo_title?.trim() || `${site.site_name} | TrustBank`;
  const description = site.seo_description?.trim() || (site.cv_headline
    ? `${site.cv_headline} — ${site.bio || ''}`
    : site.bio || `${site.site_name}'s professional mini site on TrustBank`);

  const url = `https://${params.slug}.trustbank.xyz`;

  return {
    title,
    description: description.slice(0, 160),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description: description.slice(0, 160),
      url,
      siteName: 'TrustBank',
      type: 'profile',
      images: site.avatar_url
        ? [{ url: site.seo_og_image || site.avatar_url, width: 1200, height: 630, alt: site.site_name }]
        : [{ url: 'https://trustbank.xyz/og-default.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary',
      title,
      description: description.slice(0, 160),
      images: site.seo_og_image ? [site.seo_og_image] : (site.avatar_url ? [site.avatar_url] : []),
    },
    other: {
      // Schema.org Person markup
      'application/ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: site.site_name,
        description: description,
        url,
        image: site.avatar_url,
        sameAs: [`https://${site.slug}.trustbank.xyz`],
        knowsAbout: (site.cv_skills || []).slice(0, 5),
      }),
    },
  };
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
