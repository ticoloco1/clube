import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n: string) => cookieStore.get(n)?.value, set: (n: string, v: string, o: any) => cookieStore.set({ name: n, value: v, ...o }), remove: (n: string, o: any) => cookieStore.set({ name: n, value: '', ...o }) } }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }
  const redirectTo = searchParams.get('next') || '/editor';
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
