/**
 * Cliente HTTP para criar sessão Stripe Checkout.
 * - Tenta `/api/pay/start` antes de `/api/checkout` (filtros de privacidade por vezes bloqueiam "checkout").
 * - Com `fallbackBase` (ex. NEXT_PUBLIC_SITE_URL), tenta o mesmo caminho no outro host (www ↔ apex) com CORS no servidor.
 */
export const CHECKOUT_POST_PATHS = ['/api/pay/start', '/api/checkout'] as const;

export function checkoutPostUrlCandidates(fallbackBaseNormalized: string): string[] {
  if (typeof window === 'undefined') {
    return [...CHECKOUT_POST_PATHS];
  }
  const fb = fallbackBaseNormalized.replace(/\/$/, '');
  const origin = window.location.origin;
  const out: string[] = [];
  for (const p of CHECKOUT_POST_PATHS) {
    out.push(p);
    if (fb) {
      try {
        const altOrigin = new URL(fb).origin;
        if (altOrigin !== origin) out.push(`${fb}${p}`);
      } catch {
        out.push(`${fb}${p}`);
      }
    }
  }
  return [...new Set(out)];
}

export type CheckoutPostResult = {
  url?: string;
  amount?: number;
  directToCreator?: boolean;
  pendingId?: string;
  error?: string;
  /** Erro Supabase quando o insert em `checkout_pending` falha (só servidor). */
  details?: {
    message?: string | null;
    code?: string | null;
    hint?: string | null;
    details?: string | null;
  } | null;
};

function checkoutHttpErrorMessage(data: CheckoutPostResult, status: number): string {
  const base = data.error || `Erro ${status}`;
  const d = data.details;
  if (!d) return base;
  const parts = [d.message, d.hint, d.details, d.code].filter(Boolean);
  if (parts.length === 0) return base;
  return `${base}: ${parts.join(' · ')}`;
}

export async function postCheckoutSession(
  body: object,
  fallbackBaseNormalized: string,
): Promise<CheckoutPostResult> {
  const urls = checkoutPostUrlCandidates(fallbackBaseNormalized);
  let lastErr: unknown;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const raw = await res.text();
      let data: CheckoutPostResult = {};
      try {
        data = raw ? (JSON.parse(raw) as CheckoutPostResult) : {};
      } catch {
        data = { error: raw || '' };
      }
      if (!res.ok) {
        // Deploy antigo pode não ter `/api/pay/start`; 404 → tentar próximo candidato.
        if (res.status === 404) {
          lastErr = new Error(`checkout_404:${url}`);
          continue;
        }
        const err = new Error(checkoutHttpErrorMessage(data as CheckoutPostResult, res.status));
        err.name = 'CheckoutHttpError';
        throw err;
      }
      return data;
    } catch (e) {
      // Se já recebemos resposta HTTP da API (4xx/5xx), não mascarar com erro
      // posterior de CORS/rede no fallback entre www ↔ apex.
      if (e instanceof Error && e.name === 'CheckoutHttpError') throw e;
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
