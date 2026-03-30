'use client';

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from '@/store/theme';
import { CartModal } from '@/components/ui/CartModal';


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
      <ThemeSync />
      {children}
      <CartModal />
    </QueryClientProvider>
  );
}
