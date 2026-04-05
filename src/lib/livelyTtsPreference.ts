export type LivelyTtsProvider = 'auto' | 'openai' | 'elevenlabs';

export function normalizeLivelyTtsProvider(raw: unknown): LivelyTtsProvider {
  if (raw === 'openai' || raw === 'elevenlabs' || raw === 'auto') return raw;
  return 'auto';
}
