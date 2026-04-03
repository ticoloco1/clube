'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/** Slugs passam a gerir-se só no mercado (/slugs): venda entre utilizadores e admin. */
export default function VaultRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/slugs');
  }, [router]);
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-brand" />
    </div>
  );
}
