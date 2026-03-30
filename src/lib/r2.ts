/**
 * Upload de arquivos públicos (feed, carros, imóveis).
 * Usa o bucket Supabase `platform-assets` (mesmo padrão do editor).
 */
import { supabase } from '@/lib/supabase';

const BUCKET = 'platform-assets';

export async function uploadFile(file: File, folder: string, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, '_');
  const path = `${userId}/${safeFolder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
