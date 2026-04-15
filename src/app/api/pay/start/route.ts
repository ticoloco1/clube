/**
 * Alias do checkout Stripe — mesmo handler que `/api/checkout`.
 * Alguns bloqueadores de anúncios bloqueiam URLs com "checkout"; este caminho costuma passar.
 */
export const dynamic = 'force-dynamic';
import {
  handleCheckoutGet,
  handleCheckoutOptions,
  handleCheckoutPost,
} from '@/lib/checkoutApiHandlers';

export const POST = handleCheckoutPost;
export const GET = handleCheckoutGet;
export const OPTIONS = handleCheckoutOptions;
