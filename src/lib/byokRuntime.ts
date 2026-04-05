import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveAiRuntime, type AiConfigRow } from '@/lib/aiOpenAiCompatible';
import { decryptByokCiphertext } from '@/lib/byokCrypto';

export type AiRuntimePicked = NonNullable<ReturnType<typeof resolveAiRuntime>>;

export async function pickAiRuntimeForSite(
  db: SupabaseClient,
  siteId: string,
  platformConfig: AiConfigRow,
): Promise<{ runtime: AiRuntimePicked; useSiteUsdBudget: boolean } | null> {
  const { data: row } = await db
    .from('mini_site_ai_secrets' as never)
    .select('deepseek_api_enc')
    .eq('site_id', siteId)
    .maybeSingle();

  const enc = (row as { deepseek_api_enc?: string } | null)?.deepseek_api_enc?.trim();
  if (enc) {
    const apiKey = decryptByokCiphertext(enc)?.trim();
    if (apiKey) {
      // BYOK = conta DeepSeek do criador — não misturar com baseUrl/modelo do painel Admin.
      const baseUrl = (process.env.AI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
      const model = process.env.AI_MODEL || 'deepseek-chat';
      return {
        runtime: { apiKey, baseUrl, model },
        useSiteUsdBudget: false,
      };
    }
  }

  const platform = resolveAiRuntime(platformConfig);
  if (!platform) return null;
  return { runtime: platform, useSiteUsdBudget: true };
}
