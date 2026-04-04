/** TTS OpenAI (áudio). Independente do endpoint de chat (DeepSeek, etc.). */

const OPENAI_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

export async function openAiTtsMp3(text: string, voice?: string): Promise<ArrayBuffer | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const input = text.replace(/\s+/g, ' ').trim().slice(0, 2500);
  if (!input) return null;
  const v = (voice || process.env.OPENAI_TTS_VOICE || 'shimmer').trim().toLowerCase();
  const picked = (OPENAI_TTS_VOICES as readonly string[]).includes(v) ? v : 'shimmer';
  const model = process.env.OPENAI_TTS_MODEL?.trim() === 'tts-1' ? 'tts-1' : 'tts-1-hd';
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice: picked,
      input,
      response_format: 'mp3',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[openAiTtsMp3]', res.status, err.slice(0, 300));
    return null;
  }
  return res.arrayBuffer();
}
