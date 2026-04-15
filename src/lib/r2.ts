/**
 * Upload público para Cloudflare R2 via API interna.
 * Requer sessão ativa (cookie Supabase) no browser.
 */
export async function uploadFile(file: File, folder: string, userId: string): Promise<string> {
  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, '_');
  const form = new FormData();
  form.append('file', file);
  form.append('folder', safeFolder);
  form.append('userId', String(userId || '').trim());

  const res = await fetch('/api/upload/r2', {
    method: 'POST',
    body: form,
    credentials: 'same-origin',
  });

  const data = await res.json().catch(() => ({} as { error?: string; url?: string }));
  if (!res.ok || !data?.url) {
    const msg = data?.error || 'R2 upload failed';
    throw new Error(msg);
  }
  return String(data.url);
}
