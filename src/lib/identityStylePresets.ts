/** Temas sem marcas registadas — apenas descrições visuais para o InstantID. */

export type IdentityStyleId = 'buccaneer' | 'glitch' | 'manga_hero' | 'galactic_knight';

export const IDENTITY_STYLE_PRESETS: {
  id: IdentityStyleId;
  labelKey: 'id_style_buccaneer' | 'id_style_glitch' | 'id_style_manga' | 'id_style_galactic';
  prompt: string;
  negative: string;
}[] = [
  {
    id: 'buccaneer',
    labelKey: 'id_style_buccaneer',
    prompt:
      'portrait of the same person as a historical sea captain, weathered tricorn hat, colonial era coat, ocean and tall ship in soft background, golden hour cinematic lighting, highly detailed fabric, photorealistic, 85mm lens',
    negative:
      'blurry, lowres, deformed face, extra limbs, watermark, logo, text overlay, signature, stock photo mark, corner badge, modern clothing, cartoon, anime',
  },
  {
    id: 'glitch',
    labelKey: 'id_style_glitch',
    prompt:
      'portrait of the same person in a dark leather long coat, dark sunglasses, underground tunnel with green falling code and digital rain reflections, cold green rim light, cyber noir, photorealistic, dramatic contrast',
    negative:
      'blurry, lowres, deformed face, extra limbs, watermark, logo, text overlay, signature, stock photo mark, bright daylight, cartoon',
  },
  {
    id: 'manga_hero',
    labelKey: 'id_style_manga',
    prompt:
      'same person as japanese anime hero portrait, clean cel shading, vibrant colors, sharp lineart, studio lighting, heroic expression, detailed eyes, high quality anime illustration',
    negative:
      'photorealistic, blurry, lowres, deformed, watermark, logo, text overlay, signature, stock photo mark, 3d render',
  },
  {
    id: 'galactic_knight',
    labelKey: 'id_style_galactic',
    prompt:
      'portrait of the same person wearing futuristic metallic armor with subtle bioluminescent accents, nebula and stars in background, epic sci-fi lighting, cinematic, photorealistic armor texture',
    negative:
      'blurry, lowres, deformed face, cartoon, watermark, logo, text overlay, signature, stock photo mark, medieval castle',
  },
];

export function getStylePreset(id: string | null | undefined) {
  return IDENTITY_STYLE_PRESETS.find((p) => p.id === id) || IDENTITY_STYLE_PRESETS[0];
}

export type VoiceEffectId = 'neutral' | 'buccaneer' | 'glitch' | 'manga_hero' | 'galactic_knight';

export const VOICE_EFFECT_IDS: VoiceEffectId[] = [
  'neutral',
  'buccaneer',
  'glitch',
  'manga_hero',
  'galactic_knight',
];
