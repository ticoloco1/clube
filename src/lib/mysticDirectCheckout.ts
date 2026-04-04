import type { FulfillmentLine } from '@/lib/paymentFulfillment';
import { getSiteBaseUrl } from '@/lib/siteBaseUrl';

const SITE_URL = getSiteBaseUrl();

function rootDomain(): string {
  const raw = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (raw) return raw.replace(/^www\./i, '');
  try {
    return new URL(SITE_URL).hostname.replace(/^www\./i, '');
  } catch {
    return 'trustbank.xyz';
  }
}

/**
 * Carrinho só com serviços místicos do mesmo mini-site → checkout directo na conta Stripe do criador.
 */
export function mysticDirectCheckoutEligibility(
  lines: FulfillmentLine[],
): { ok: true; siteId: string } | { ok: false } {
  const mystic = lines.filter((l) => l.kind === 'mystic_service');
  if (!mystic.length) return { ok: false };
  if (lines.some((l) => l.kind !== 'mystic_service')) return { ok: false };
  const ids = [...new Set(mystic.map((l) => l.itemId).filter(Boolean) as string[])];
  if (ids.length !== 1) return { ok: false };
  return { ok: true, siteId: ids[0] };
}

export function mysticCheckoutSuccessUrl(slug: string, pendingId: string): string {
  const pending = encodeURIComponent(pendingId);
  const isLocal =
    SITE_URL.includes('localhost') ||
    SITE_URL.includes('127.0.0.1') ||
    SITE_URL.includes('.vercel.app');
  if (isLocal) {
    return `${SITE_URL}/s/${encodeURIComponent(slug)}?mystic_paid=${pending}`;
  }
  const host = `${slug.toLowerCase()}.${rootDomain()}`;
  return `https://${host}/?mystic_paid=${pending}`;
}

export function mysticCheckoutCancelUrl(slug: string): string {
  const isLocal =
    SITE_URL.includes('localhost') ||
    SITE_URL.includes('127.0.0.1') ||
    SITE_URL.includes('.vercel.app');
  if (isLocal) {
    return `${SITE_URL}/s/${encodeURIComponent(slug)}?mystic_cancel=1`;
  }
  return `https://${slug.toLowerCase()}.${rootDomain()}/?mystic_cancel=1`;
}
