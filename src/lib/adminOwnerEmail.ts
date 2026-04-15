import type { SupabaseClient } from '@supabase/supabase-js';

/** Emails com poderes de dono (CSV em ADMIN_OWNER_EMAIL ou ADMIN_IA_BYPASS_EMAILS). */
export function getAdminOwnerEmails(): string[] {
  const raw = (
    process.env.ADMIN_OWNER_EMAIL ||
    process.env.ADMIN_IA_BYPASS_EMAILS ||
    'arytcf@gmail.com'
  ).trim();
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminOwnerEmails().includes(email.toLowerCase());
}

export async function isAdminOwnerUserId(
  db: SupabaseClient | null,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!db || !userId) return false;

  try {
    const authAdmin = (db as any)?.auth?.admin;
    if (authAdmin?.getUserById) {
      const { data, error } = await authAdmin.getUserById(userId);
      if (!error && isAdminOwnerEmail(data?.user?.email)) return true;
    }
  } catch {
    /* ignore auth lookup failure */
  }

  try {
    const { data } = await db
      .from('user_roles' as never)
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Acesso às rotas /api/admin/* alinhado ao painel: email dono ou role `admin` em user_roles.
 */
export async function assertAdminApiAccess(
  user: { id: string; email?: string | null } | null,
  db: SupabaseClient | null,
): Promise<boolean> {
  if (!user) return false;
  if (isAdminOwnerEmail(user.email)) return true;
  if (!db) return false;
  const { data } = await db
    .from('user_roles' as never)
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();
  return !!data;
}
