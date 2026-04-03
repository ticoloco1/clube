/**
 * Efeitos de voz no browser (Web Audio API) — sem custo de servidor.
 * Ajuste fino por tema para combinar com o preset visual.
 */

import type { VoiceEffectId } from '@/lib/identityStylePresets';

export async function decodeAudioToBuffer(ctx: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const copy = arrayBuffer.slice(0);
  return ctx.decodeAudioData(copy);
}

/** Reproduz um buffer com filtro + playbackRate (Web Audio, sem servidor). */
export async function playBufferWithVoiceEffect(
  ctx: AudioContext,
  buffer: AudioBuffer,
  effect: VoiceEffectId,
): Promise<void> {
  await ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';

  switch (effect) {
    case 'buccaneer':
      filter.frequency.value = 3200;
      src.playbackRate.value = 0.94;
      break;
    case 'glitch':
      filter.type = 'highpass';
      filter.frequency.value = 450;
      src.playbackRate.value = 0.97;
      break;
    case 'manga_hero':
      filter.frequency.value = 10000;
      src.playbackRate.value = 1.05;
      break;
    case 'galactic_knight':
      filter.frequency.value = 6500;
      src.playbackRate.value = 1;
      break;
    default:
      filter.frequency.value = 16000;
      src.playbackRate.value = 1;
  }

  src.connect(filter);
  filter.connect(ctx.destination);

  return new Promise((resolve, reject) => {
    src.onended = () => resolve();
    try {
      src.start(0);
    } catch (e) {
      reject(e);
    }
  });
}
