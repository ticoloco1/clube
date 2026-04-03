'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { AdminMysticLottery } from '@/components/mystic/AdminMysticLottery';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function MisticoConfigPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/auth?next=/mistico/config');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <AdminMysticLottery />
      </div>
    </div>
  );
}
