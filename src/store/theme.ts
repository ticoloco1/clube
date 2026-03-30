'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  dark: boolean;
  toggle: () => void;
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set, get) => ({
      dark: true,
      toggle: () => {
        const next = !get().dark;
        set({ dark: next });
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', next);
        }
      },
    }),
    { name: 'tb-theme' }
  )
);
