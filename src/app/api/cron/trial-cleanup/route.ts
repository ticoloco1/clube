export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isActiveSubscription(expiresAt?: string | null) {
  return !!(expiresAt && new Date(expiresAt) > new Date());
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || '';
  const auth = req.headers.get('authorization') || '';
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();
  let unpublished = 0;
  let deleted = 0;
  let cancelledDeleted = 0;

  const { data: sites } = await db
    .from('mini_sites')
    .select('id,user_id,slug,published,trial_publish_until,trial_grace_until')
    .not('trial_publish_until', 'is', null);

  for (const site of sites || []) {
    const { data: sub } = await db
      .from('subscriptions' as any)
      .select('expires_at')
      .eq('user_id', (site as any).user_id)
      .maybeSingle();
    if (isActiveSubscription((sub as any)?.expires_at)) continue;

    const trialEnd = (site as any).trial_publish_until ? new Date((site as any).trial_publish_until) : null;
    const graceEnd = (site as any).trial_grace_until ? new Date((site as any).trial_grace_until) : null;

    if ((site as any).published && trialEnd && trialEnd <= now) {
      const nextGrace = graceEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await db.from('mini_sites').update({
        published: false,
        trial_grace_until: nextGrace.toISOString(),
        updated_at: now.toISOString(),
      }).eq('id', (site as any).id);
      unpublished += 1;
      continue;
    }

    if (!(site as any).published && graceEnd && graceEnd <= now) {
      await Promise.all([
        db.from('mini_site_links').delete().eq('site_id', (site as any).id),
        db.from('mini_site_videos').delete().eq('site_id', (site as any).id),
        (db as any).from('feed_posts').delete().eq('site_id', (site as any).id),
        (db as any).from('slug_registrations').delete().eq('user_id', (site as any).user_id).eq('slug', (site as any).slug),
      ]);
      await db.from('mini_sites').delete().eq('id', (site as any).id);
      deleted += 1;
    }
  }

  // Accounts with cancelled subscription and expired grace window (30d)
  const { data: cancelledSubs } = await db
    .from('subscriptions' as any)
    .select('user_id, status, expires_at')
    .eq('status', 'cancelled')
    .not('expires_at', 'is', null);

  for (const sub of cancelledSubs || []) {
    const exp = (sub as any).expires_at ? new Date((sub as any).expires_at) : null;
    if (!exp || exp > now) continue;
    const userId = (sub as any).user_id as string;
    const { data: userSites } = await db.from('mini_sites').select('id,slug').eq('user_id', userId);
    for (const s of userSites || []) {
      await Promise.all([
        db.from('mini_site_links').delete().eq('site_id', (s as any).id),
        db.from('mini_site_videos').delete().eq('site_id', (s as any).id),
        (db as any).from('feed_posts').delete().eq('site_id', (s as any).id),
        (db as any).from('slug_registrations').delete().eq('user_id', userId).eq('slug', (s as any).slug),
      ]);
      await db.from('mini_sites').delete().eq('id', (s as any).id);
    }
    await (db as any).from('slug_registrations').delete().eq('user_id', userId);
    await (db as any).from('subscriptions').delete().eq('user_id', userId);
    try {
      await (db as any).auth.admin.deleteUser(userId);
    } catch {}
    cancelledDeleted += 1;
  }

  return NextResponse.json({ ok: true, unpublished, deleted, cancelledDeleted });
}
