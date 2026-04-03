import { openAiCompatibleChat, resolveAiRuntime, type AiConfigRow } from '@/lib/aiOpenAiCompatible';

export type MagicTone = 'wild_monkey' | 'professional';

export async function polishMagicBoostScript(params: {
  aiConfig: AiConfigRow;
  rawScript: string;
  tone: MagicTone;
  productLabel: string;
  brandColor: string;
  creatorName: string;
}): Promise<string | null> {
  const runtime = resolveAiRuntime(params.aiConfig);
  if (!runtime) return null;
  const raw = params.rawScript.replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (!raw) return null;

  const toneGuide =
    params.tone === 'wild_monkey'
      ? 'Tom “macaco pirado”: energia alta, humor absurdo leve, gírias criativas, mas SEM ofensas, SEM marcas registadas de terceiros, SEM promessas médicas/financeiras. Máx. 3 frases curtas para locução.'
      : 'Tom profissional: claro, confiante, adequado a patrocínio. Máx. 3 frases curtas para locução.';

  const system = `És um copywriter para spot de voz curto. ${toneGuide}
O criador chama-se "${params.creatorName.replace(/"/g, '')}".
Produto/serviço a mencionar: "${params.productLabel.replace(/"/g, '')}".
Cor de marca (referência visual, não precisas repetir o hex): ${params.brandColor || 'n/d'}.
Reescreve o rascunho do anunciante para soar natural falado em voz alta. Responde APENAS com o texto final, sem aspas nem prefixos.`;

  const out = await openAiCompatibleChat({
    baseUrl: runtime.baseUrl,
    model: runtime.model,
    apiKey: runtime.apiKey,
    system,
    user: `Rascunho do anunciante:\n${raw}`,
    max_tokens: 350,
    temperature: params.tone === 'wild_monkey' ? 0.85 : 0.45,
  });

  return out?.replace(/^["']|["']$/g, '').trim().slice(0, 1200) || null;
}
