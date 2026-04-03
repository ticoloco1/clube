'use client';

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from '@/store/theme';
import { CartModal } from '@/components/ui/CartModal';
import { I18nProvider } from '@/lib/i18n';


const queryClient = new QueryClient();

function ThemeSync() {
  const { dark } = useTheme();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeSync />
        {children}
        <CartModal />
      </I18nProvider>
    </QueryClientProvider>
  );
}
