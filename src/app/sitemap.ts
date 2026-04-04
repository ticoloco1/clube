import type { MetadataRoute } from 'next';
import { getSeoUrlInventory, inventoryToMetadataSitemap } from '@/lib/seoUrlInventory';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const inv = await getSeoUrlInventory();
  return inventoryToMetadataSitemap(inv);
}
