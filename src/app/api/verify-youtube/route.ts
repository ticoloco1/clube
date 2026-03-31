export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Extract YouTube channel ID or handle from various URL formats
function parseYouTubeUrl(url: string): { type: 'channel'|'handle'|'video'|'unknown'; id: string } {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const path = u.pathname;

    // @handle format: youtube.com/@username
    const handleMatch = path.match(/^\/@([^/?]+)/);
    if (handleMatch) return { type: 'handle', id: handleMatch[1] };

    // /channel/UCxxx format
    const channelMatch = path.match(/^\/channel\/([^/?]+)/);
    if (channelMatch) return { type: 'channel', id: channelMatch[1] };

    // studio.youtube.com/channel/UCxxx/editing/profile
    const studioChannelMatch = path.match(/^\/channel\/([^/]+)/);
    if (u.hostname.includes('studio.youtube.com') && studioChannelMatch) {
      return { type: 'channel', id: studioChannelMatch[1] };
    }

    // /c/name format
    const cMatch = path.match(/^\/c\/([^/?]+)/);
    if (cMatch) return { type: 'handle', id: cMatch[1] };

    // /user/name format
    const userMatch = path.match(/^\/user\/([^/?]+)/);
    if (userMatch) return { type: 'handle', id: userMatch[1] };

    // Video URL: youtube.com/watch?v=xxx or youtu.be/xxx
    const videoId = u.searchParams.get('v') || path.split('/').pop();
    if (videoId && videoId.length === 11) return { type: 'video', id: videoId };

    return { type: 'unknown', id: '' };
  } catch {
    return { type: 'unknown', id: '' };
  }
}

// Fetch YouTube page and look for the backlink
async function checkBacklink(youtubeUrl: string, backlink: string): Promise<{
  found: boolean;
  channelName?: string;
  channelId?: string;
  error?: string;
}> {
  let normalizedUrl = youtubeUrl.startsWith('http') ? youtubeUrl : `https://www.youtube.com/${youtubeUrl}`;
  if (normalizedUrl.includes('studio.youtube.com/channel/')) {
    const m = normalizedUrl.match(/studio\.youtube\.com\/channel\/([^/?]+)/);
    if (m?.[1]) normalizedUrl = `https://www.youtube.com/channel/${m[1]}`;
  }
  
  const res = await fetch(normalizedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!res.ok) return { found: false, error: `HTTP ${res.status}` };
  
  const html = await res.text();
  
  // Extract channel name from title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const channelName = titleMatch?.[1]?.replace(' - YouTube', '').trim();

  // Extract channel ID
  const channelIdMatch = html.match(/"channelId":"(UC[^"]+)"/);
  const channelId = channelIdMatch?.[1];

  // Check for backlink (various formats)
  const backlinkVariants = [
    backlink,
    backlink.replace('https://', ''),
    backlink.replace('https://www.', ''),
    backlink.replace('www.', ''),
  ];

  const found = backlinkVariants.some(link => html.includes(link));

  return { found, channelName, channelId };
}

export async function POST(request: NextRequest) {
  const db = getDb();
  try {
    const { userId, youtubeUrl, siteSlug, manualConfirm } = await request.json();

    if (!userId || !youtubeUrl) {
      return NextResponse.json({ error: 'userId and youtubeUrl required' }, { status: 400 });
    }

    const parsed = parseYouTubeUrl(youtubeUrl);
    if (parsed.type === 'unknown') {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // The backlink the user needs to add to their YouTube description
    const slug = siteSlug || (await db.from('mini_sites').select('slug').eq('user_id', userId).maybeSingle()).data?.slug;
    const backlink = `https://${slug}.trustbank.xyz`;

    // Check if backlink exists on their YouTube page
    const result = await checkBacklink(youtubeUrl, backlink);

    if (result.error) {
      return NextResponse.json({
        success: false,
        message: `Could not access YouTube page: ${result.error}`,
        backlink,
        instructions: getInstructions(backlink),
      });
    }

    if (!result.found && manualConfirm !== true) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: 'Backlink not found on your YouTube page.',
        backlink,
        channelName: result.channelName,
        instructions: getInstructions(backlink),
      });
    }

    // Found or manually confirmed: mark as verified
    await db.from('mini_sites')
      .update({ 
        is_verified: true,
        youtube_channel_id: result.channelId || parsed.id,
      })
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      verified: true,
      message: manualConfirm === true
        ? '✅ Verified with manual confirmation.'
        : `✅ Verified! Channel "${result.channelName}" linked to your TrustBank profile.`,
      channelName: result.channelName,
      channelId: result.channelId,
    });

  } catch (err: any) {
    console.error('[verify-youtube]', err);
    return NextResponse.json({ error: 'Internal error', details: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // GET: just return what backlink the user needs to add
  const db = getDb();
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const { data: site } = await db.from('mini_sites').select('slug, is_verified').eq('user_id', userId).maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const backlink = `https://${site.slug}.trustbank.xyz`;
  return NextResponse.json({
    backlink,
    isVerified: site.is_verified,
    instructions: getInstructions(backlink),
  });
}

function getInstructions(backlink: string) {
  return [
    `1. Go to your YouTube channel`,
    `2. Click "Customize Channel" → "Basic Info"`,
    `3. In the Description or Links section, add: ${backlink}`,
    `4. Save and come back here to verify`,
    `Note: YouTube may take a few minutes to update. If it fails, try again in 2 minutes.`,
  ];
}
