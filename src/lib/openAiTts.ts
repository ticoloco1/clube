/** TTS OpenAI (áudio). Independente do endpoint de chat (DeepSeek, etc.). */

export async function openAiTtsMp3(text: string, voice: string = 'nova'): Promise<ArrayBuffer | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const input = text.replace(/\s+/g, ' ').trim().slice(0, 2500);
  if (!input) return null;
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voice) ? voice : 'nova',
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
