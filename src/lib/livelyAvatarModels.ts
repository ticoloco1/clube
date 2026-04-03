export type LivelyModelId = 'neo' | 'aria' | 'sol' | 'zen';

export const LIVELY_AVATAR_MODELS: {
  id: LivelyModelId;
  label: { pt: string; en: string };
  skin: string;
  accent: string;
  mouthStroke: string;
}[] = [
  { id: 'neo', label: { pt: 'Neo (índigo)', en: 'Neo (indigo)' }, skin: '#c4b5fd', accent: '#312e81', mouthStroke: '#1e1b4b' },
  { id: 'aria', label: { pt: 'Aria (rosa)', en: 'Aria (rose)' }, skin: '#fbcfe8', accent: '#9d174d', mouthStroke: '#831843' },
  { id: 'sol', label: { pt: 'Sol (âmbar)', en: 'Sol (amber)' }, skin: '#fde68a', accent: '#b45309', mouthStroke: '#78350f' },
  { id: 'zen', label: { pt: 'Zen (esmeralda)', en: 'Zen (emerald)' }, skin: '#6ee7b7', accent: '#065f46', mouthStroke: '#064e3b' },
];

export function resolveLivelyModel(id: string | null | undefined) {
  const found = LIVELY_AVATAR_MODELS.find((m) => m.id === id);
  return found || LIVELY_AVATAR_MODELS[0];
}
