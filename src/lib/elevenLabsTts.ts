/** TTS ElevenLabs — vozes por ID (owner vs agent no dual-agent). */

function parseEnvFloat(name: string, fallback: number): number {
  const v = parseFloat(process.env[name] || '');
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

export async function elevenLabsTtsMp3(text: string, voiceId: string): Promise<ArrayBuffer | null> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  const vid = voiceId.trim();
  if (!key || !vid) return null;
  const input = text.replace(/\s+/g, ' ').trim().slice(0, 2500);
  if (!input) return null;

  const voice_settings = {
    stability: parseEnvFloat('ELEVENLABS_STABILITY', 0.42),
    similarity_boost: parseEnvFloat('ELEVENLABS_SIMILARITY', 0.82),
    style: parseEnvFloat('ELEVENLABS_STYLE', 0.12),
    use_speaker_boost: process.env.ELEVENLABS_SPEAKER_BOOST === '0' ? false : true,
  };

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vid)}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: input,
      model_id: process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2',
      voice_settings,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[elevenLabsTtsMp3]', res.status, err.slice(0, 400));
    return null;
  }
  return res.arrayBuffer();
}

export function defaultElevenVoice(which: 'owner' | 'agent'): string {
  if (which === 'owner') {
    return (
      process.env.ELEVENLABS_VOICE_OWNER_DEFAULT?.trim() ||
      process.env.ELEVENLABS_VOICE_DEFAULT?.trim() ||
      ''
    );
  }
  return (
    process.env.ELEVENLABS_VOICE_AGENT_DEFAULT?.trim() ||
    process.env.ELEVENLABS_VOICE_DEFAULT?.trim() ||
    ''
  );
}
