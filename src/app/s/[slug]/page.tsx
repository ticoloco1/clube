import { fetchPublishedMiniSiteForSsr } from '@/lib/miniSitePublicServer';
import SitePageClient from './SitePageClient';

export const dynamic = 'force-dynamic';

export default async function MiniSitePage({ params }: { params: { slug: string } }) {
  const slug = params.slug || '';
  const ssrSite = await fetchPublishedMiniSiteForSsr(slug);
  return <SitePageClient slug={slug} ssrSite={ssrSite} />;
}
