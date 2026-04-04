import type { SupabaseClient } from '@supabase/supabase-js';
import { isAdminOwnerEmail } from './adminOwnerEmail';

async function siteOwnerEmailIsAdminBypass(db: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await db.auth.admin.getUserById(userId);
    if (error || !data?.user?.email) return false;
    return isAdminOwnerEmail(data.user.email);
  } catch {
    return false;
  }
}

/** Dono do mini-site é admin da plataforma — IA USD não debita (testes). */
export async function siteOwnerHasIaTestBypass(
  db: SupabaseClient,
  userId: string | undefined,
): Promise<boolean> {
  if (!userId) return false;
  return siteOwnerEmailIsAdminBypass(db, userId);
}

export async function ownerHasActiveSubscription(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.from('subscriptions' as never).select('expires_at').eq('user_id', userId).maybeSingle();
  const row = data as { expires_at?: string | null } | null;
  return !!(row?.expires_at && new Date(row.expires_at) > new Date());
}

/** Trial de publicação gratuita (ex.: 24h) ainda ativo — sem assinatura paga. */
export function sitePlatformTrialActive(site: { trial_publish_until?: string | null }): boolean {
  const t = site.trial_publish_until;
  if (!t) return false;
  return new Date(t).getTime() > Date.now();
}

/**
 * Orçamento USD de IA aplica-se só quando o dono tem plano pago.
 * Durante o trial de 24h (sem sub), a IA não debita saldo.
 */
export async function iaUsdBillingApplies(
  db: SupabaseClient,
  site: { user_id: string; trial_publish_until?: string | null },
): Promise<boolean> {
  if (await siteOwnerEmailIsAdminBypass(db, site.user_id)) return false;
  if (await ownerHasActiveSubscription(db, site.user_id)) return true;
  if (sitePlatformTrialActive(site)) return false;
  return true;
}
