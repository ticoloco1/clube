/** Chamada chat estilo OpenAI (DeepSeek, OpenAI, etc.). */

export type AiConfigRow = {
  enabled?: boolean;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
};

export function resolveAiRuntime(aiConfig: AiConfigRow | null | undefined): {
  apiKey: string;
  baseUrl: string;
  model: string;
} | null {
  const envKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
  const apiKey = (aiConfig?.apiKey || envKey || '').trim();
  if (!apiKey) return null;
  const baseUrl = (aiConfig?.baseUrl || process.env.AI_BASE_URL || 'https://api.deepseek.com/v1').replace(
    /\/$/,
    '',
  );
  const model = aiConfig?.model || process.env.AI_MODEL || 'deepseek-chat';
  return { apiKey, baseUrl, model };
}

export async function openAiCompatibleChat(params: {
  baseUrl: string;
  model: string;
  apiKey: string;
  system: string;
  user: string;
  max_tokens?: number;
  temperature?: number;
}): Promise<string | null> {
  const url = `${params.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      temperature: params.temperature ?? 0.4,
      max_tokens: params.max_tokens ?? 500,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('[openAiCompatibleChat] HTTP', res.status, t.slice(0, 400));
    return null;
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json?.choices?.[0]?.message?.content?.trim() || null;
}

type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

export async function openAiCompatibleChatMessages(params: {
  baseUrl: string;
  model: string;
  apiKey: string;
  messages: ChatMsg[];
  max_tokens?: number;
  temperature?: number;
}): Promise<string | null> {
  const url = `${params.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.45,
      max_tokens: params.max_tokens ?? 600,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('[openAiCompatibleChatMessages] HTTP', res.status, t.slice(0, 400));
    return null;
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json?.choices?.[0]?.message?.content?.trim() || null;
}
