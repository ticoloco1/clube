/**
 * Cria voz personalizada na ElevenLabs a partir de ficheiros de áudio (clone instantâneo).
 * Docs: POST /v1/voices/add (multipart)
 */

export async function createElevenLabsVoiceFromSamples(params: {
  name: string;
  files: { buffer: Buffer; filename: string; mimeType: string }[];
}): Promise<{ voiceId: string } | { error: string }> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    return { error: 'ELEVENLABS_API_KEY não configurado' };
  }
  if (!params.files.length) {
    return { error: 'Nenhum ficheiro de áudio' };
  }

  const form = new FormData();
  form.append('name', params.name.slice(0, 80));
  form.append('description', 'TrustBank identity voice clone');

  for (const f of params.files) {
    const u8 = Uint8Array.from(f.buffer);
    const blob = new Blob([u8], { type: f.mimeType || 'audio/webm' });
    form.append('files', blob, f.filename);
  }

  const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: {
      'xi-api-key': key,
    },
    body: form as unknown as BodyInit,
  });

  const json = (await res.json()) as { voice_id?: string; detail?: { message?: string }; message?: string };

  if (!res.ok) {
    const msg = json.detail?.message || json.message || res.statusText;
    console.error('[elevenLabsVoiceClone]', res.status, msg);
    return { error: String(msg) };
  }
  if (!json.voice_id) {
    return { error: 'Resposta sem voice_id' };
  }
  return { voiceId: json.voice_id };
}
