import { createClient } from '@supabase/supabase-js';
import PrivacyPageClient from './PrivacyPageClient';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export default async function PrivacyPage() {
  const { data: setting } = await getDb()
    .from('platform_settings' as never)
    .select('value')
    .eq('key', 'privacy_content')
    .maybeSingle();
  const raw = (setting as { value?: unknown } | null)?.value;
  const customContent = typeof raw === 'string' ? raw : '';
  return <PrivacyPageClient customHtml={customContent} />;
}
