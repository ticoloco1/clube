import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { isFulfillmentKind } from '@/lib/cartFulfillment';
import { fulfillLine, type FulfillmentLine } from '@/lib/paymentFulfillment';

export function paymentRefFromCheckoutSession(session: Stripe.Checkout.Session): string {
  const pi = session.payment_intent;
  if (typeof pi === 'string') return pi;
  if (pi && typeof pi === 'object' && 'id' in pi) return (pi as { id: string }).id;
  return session.id;
}

export type CheckoutPendingRow = {
  id: string;
  user_id: string;
  lines: unknown;
  fulfilled: boolean;
  stripe_checkout_session_id?: string | null;
  stripe_connect_account_id?: string | null;
};

/**
 * Idempotente: marca checkout_pending como cumprido e corre fulfillLine por linha.
 */
export async function fulfillCheckoutPendingRow(
  db: SupabaseClient,
  session: Stripe.Checkout.Session,
  pendingRow: CheckoutPendingRow,
): Promise<boolean> {
  if (pendingRow.fulfilled) return true;
  if (session.payment_status !== 'paid') return false;

  const paymentRef = paymentRefFromCheckoutSession(session);

  const lines = pendingRow.lines as Omit<FulfillmentLine, 'userId'>[];
  const userId = pendingRow.user_id;
  for (const partial of lines || []) {
    const line: FulfillmentLine = { ...partial, userId } as FulfillmentLine;
    if (isFulfillmentKind(line.kind)) {
      await fulfillLine(db, line, paymentRef);
    }
  }

  await db.from('checkout_pending' as any).update({ fulfilled: true }).eq('id', pendingRow.id);
  return true;
}
