import type { FulfillmentLine, FulfillmentKind } from '@/lib/paymentFulfillment';
import { IA_TOPUP_MIN_FACE_USD, iaTopupChargeUsd } from '@/lib/aiUsdBudget';

export type CartItemInput = { id: string; label: string; price: number; type: string };

/**
 * Convert a cart row into a fulfillment line (without side effects).
 */
export function cartItemToFulfillmentLine(item: CartItemInput, userId: string): FulfillmentLine {
  const { id, price, type } = item;

  if (id.startsWith('credits_')) {
    return { kind: 'credits', userId, amountUsd: price };
  }

  if (id.startsWith('ai_topup_')) {
    const m = id.match(
      /^ai_topup_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_([0-9]+(?:\.[0-9]+)?)$/i,
    );
    if (!m) {
      throw new Error('ai_topup: id inválido (use ai_topup_{siteUuid}_{faceUsd})');
    }
    const siteId = m[1];
    const face = parseFloat(m[2]);
    if (!Number.isFinite(face) || face < IA_TOPUP_MIN_FACE_USD) {
      throw new Error(`ai_topup: valor útil mínimo US$${IA_TOPUP_MIN_FACE_USD}`);
    }
    const expected = iaTopupChargeUsd(face);
    if (Math.abs(price - expected) > 0.05) {
      throw new Error('ai_topup: preço não corresponde ao pack');
    }
    return {
      kind: 'ai_budget_topup',
      userId,
      itemId: siteId,
      amountUsd: price,
      faceValueUsd: face,
    };
  }

  if (type === 'directory_company' || id.startsWith('directory_company_')) {
    const annual = id.includes('yearly') || id.includes('annual');
    return {
      kind: 'directory_company',
      userId,
      amountUsd: price,
      billingPeriod: annual ? 'yearly' : 'monthly',
    };
  }

  if (id.startsWith('cv_directory_')) {
    const annual = id.includes('annual') || id.includes('year');
    return {
      kind: 'directory_company',
      userId,
      amountUsd: price,
      billingPeriod: annual ? 'yearly' : 'monthly',
    };
  }

  if (type === 'cv' || id.startsWith('cv_unlock_')) {
    const siteId = id.replace(/^cv_unlock_/, '');
    return { kind: 'cv', userId, itemId: siteId, amountUsd: price };
  }

  if (id.startsWith('cv_') && !id.startsWith('cv_unlock_')) {
    const siteId = id.replace(/^cv_/, '');
    return { kind: 'cv', userId, itemId: siteId, amountUsd: price };
  }

  if (type === 'plan' && id.startsWith('plan_')) {
    const m = id.match(/^plan_(.+)_(mo|yr)$/);
    const raw = (m?.[1] || 'pro').toLowerCase();
    const planId = raw === 'pro' || raw === 'pro_ia' || raw === 'studio' ? raw : 'pro';
    return {
      kind: 'subscription',
      userId,
      amountUsd: price,
      planId,
      billingPeriod: m?.[2] === 'yr' ? 'yearly' : 'monthly',
    };
  }

  if (id.startsWith('slug_renewal_')) {
    return { kind: 'slug_renewal', userId, itemId: id.replace(/^slug_renewal_/, ''), amountUsd: price };
  }

  if (id.startsWith('slug_auction_pay_')) {
    const auctionId = id.replace(/^slug_auction_pay_/, '');
    if (!/^[0-9a-f-]{36}$/i.test(auctionId)) {
      throw new Error('Invalid slug auction payment id');
    }
    return { kind: 'slug_auction_settle', userId, itemId: auctionId, amountUsd: price };
  }

  if (id.startsWith('slug_market_')) {
    return { kind: 'slug_market', userId, itemId: id.replace(/^slug_market_/, ''), amountUsd: price };
  }

  if (id.startsWith('slug_bid_')) {
    return { kind: 'slug_bid', userId, itemId: id.replace(/^slug_bid_/, ''), amountUsd: price };
  }

  if (id.startsWith('renew_')) {
    const slugToken = id.replace(/^renew_/, '');
    if (/^[0-9a-f-]{36}$/i.test(slugToken)) {
      throw new Error('Invalid slug renewal cart id: use slug_renewal_{slug}');
    }
    return { kind: 'slug_renewal', userId, itemId: slugToken, amountUsd: price };
  }

  if (type === 'slug' || id.startsWith('slug_')) {
    let slugToken = id;
    if (id.startsWith('slug_prem_')) slugToken = id.slice(10);
    else if (id.startsWith('slug_')) slugToken = id.slice(5);
    return { kind: 'slug', userId, itemId: slugToken, amountUsd: price };
  }

  if (type === 'boost' || id.startsWith('boost_')) {
    if (id.startsWith('boost_classified_')) {
      const m = id.match(/^boost_classified_([0-9a-f-]{36})_(\d+)$/i);
      if (m) {
        return { kind: 'boost', userId, itemId: m[1], amountUsd: price, targetType: 'classified' };
      }
    }
    if (id.startsWith('boost_video_')) {
      const m = id.match(/^boost_video_([0-9a-f-]{36})_(\d+)$/i);
      if (m) {
        return { kind: 'boost', userId, itemId: m[1], amountUsd: price, targetType: 'video' };
      }
    }
    const m = id.match(/^boost_([0-9a-f-]{36})_/i);
    const itemId = m ? m[1] : id.replace(/^boost_/, '').replace(/_\d+$/, '');
    return { kind: 'boost', userId, itemId, amountUsd: price, targetType: 'site' };
  }

  if (type === 'classified' || id.startsWith('classified_')) {
    const listingId = id.replace(/^classified_/, '');
    return { kind: 'classified', userId, itemId: listingId, amountUsd: price };
  }

  if (type === 'brand_ad' || id.startsWith('ad_proposal_')) {
    const proposalId = id.startsWith('ad_proposal_') ? id.replace(/^ad_proposal_/, '') : id;
    return { kind: 'brand_ad', userId, itemId: proposalId, amountUsd: price };
  }

  if (type === 'video' || id.startsWith('video_')) {
    const vid = id.startsWith('video_') ? id.replace(/^video_/, '') : id;
    return { kind: 'video', userId, itemId: vid, amountUsd: price };
  }

  const mysticTarot = id.match(/^mystic_tarot_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if (mysticTarot) {
    return {
      kind: 'mystic_service',
      userId,
      itemId: mysticTarot[1],
      amountUsd: price,
      mysticService: 'tarot',
    };
  }
  const mysticLot = id.match(/^mystic_lottery_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if (mysticLot) {
    return {
      kind: 'mystic_service',
      userId,
      itemId: mysticLot[1],
      amountUsd: price,
      mysticService: 'lottery_premium',
    };
  }

  throw new Error(`Unsupported cart item for checkout: ${id} (type=${type})`);
}

const KNOWN_KINDS: FulfillmentKind[] = [
  'video',
  'cv',
  'cv_directory',
  'boost',
  'credits',
  'subscription',
  'slug_bid',
  'slug',
  'slug_renewal',
  'slug_market',
  'slug_auction_settle',
  'classified',
  'brand_ad',
  'directory_company',
  'ai_budget_topup',
  'mystic_service',
];

export function isFulfillmentKind(k: string): k is FulfillmentKind {
  return (KNOWN_KINDS as string[]).includes(k);
}
