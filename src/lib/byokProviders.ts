export type ByokProviderId =
  | 'openai'
  | 'deepseek'
  | 'groq'
  | 'mistral'
  | 'anthropic'
  | 'gemini'
  | 'replicate'
  | 'fal'
  | 'runway'
  | 'luma'
  | 'kling'
  | 'pika'
  | 'stability'
  | 'elevenlabs'
  | 'cartesia'
  | 'suno';

export type ByokProviderInfo = {
  id: ByokProviderId;
  label: string;
  category: 'text' | 'video' | 'voice' | 'music' | 'multi';
  docsUrl: string;
  keyHint: string;
};

export const BYOK_PROVIDERS: ByokProviderInfo[] = [
  { id: 'openai', label: 'OpenAI', category: 'multi', docsUrl: 'https://platform.openai.com/api-keys', keyHint: 'sk-...' },
  { id: 'deepseek', label: 'DeepSeek', category: 'text', docsUrl: 'https://platform.deepseek.com/', keyHint: 'sk-...' },
  { id: 'groq', label: 'Groq', category: 'text', docsUrl: 'https://console.groq.com/keys', keyHint: 'gsk_...' },
  { id: 'mistral', label: 'Mistral', category: 'text', docsUrl: 'https://console.mistral.ai/api-keys/', keyHint: '...' },
  { id: 'anthropic', label: 'Anthropic', category: 'text', docsUrl: 'https://console.anthropic.com/settings/keys', keyHint: 'sk-ant-...' },
  { id: 'gemini', label: 'Google Gemini', category: 'multi', docsUrl: 'https://aistudio.google.com/app/apikey', keyHint: 'AIza...' },
  { id: 'replicate', label: 'Replicate', category: 'video', docsUrl: 'https://replicate.com/account/api-tokens', keyHint: 'r8_...' },
  { id: 'fal', label: 'fal.ai', category: 'video', docsUrl: 'https://fal.ai/dashboard/keys', keyHint: 'key_...' },
  { id: 'runway', label: 'Runway', category: 'video', docsUrl: 'https://app.runwayml.com/', keyHint: 'rw_...' },
  { id: 'luma', label: 'Luma', category: 'video', docsUrl: 'https://lumalabs.ai/dream-machine/api', keyHint: 'luma_...' },
  { id: 'kling', label: 'Kling', category: 'video', docsUrl: 'https://klingai.com/', keyHint: 'kling_...' },
  { id: 'pika', label: 'Pika', category: 'video', docsUrl: 'https://pika.art/', keyHint: 'pika_...' },
  { id: 'stability', label: 'Stability AI', category: 'video', docsUrl: 'https://platform.stability.ai/account/keys', keyHint: 'sk-...' },
  { id: 'elevenlabs', label: 'ElevenLabs', category: 'voice', docsUrl: 'https://elevenlabs.io/app/settings/api-keys', keyHint: 'xi-api-key...' },
  { id: 'cartesia', label: 'Cartesia', category: 'voice', docsUrl: 'https://play.cartesia.ai/', keyHint: 'cartesia_...' },
  { id: 'suno', label: 'Suno', category: 'music', docsUrl: 'https://suno.com/', keyHint: 'api key...' },
];

export function byokProviderById(id: string): ByokProviderInfo | null {
  return BYOK_PROVIDERS.find((p) => p.id === id) || null;
}

