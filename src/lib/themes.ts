// TrustBank — 10 Premium Themes
// Each theme controls: background, text, accent, card surfaces, gradients,
// font pairing, video grid style, and CSS custom properties

export type VideoLayout = 1 | 2 | 3;

export interface Theme {
  id: string;
  label: string;
  emoji: string;
  category: 'dark' | 'light' | 'gradient' | 'luxury';
  description: string;
  // Raw CSS vars injected into the site root
  vars: {
    '--tb-bg': string;
    '--tb-bg2': string;
    '--tb-bg3': string;
    '--tb-text': string;
    '--tb-text2': string;
    '--tb-border': string;
    '--tb-radius': string;
    '--tb-font': string;
    '--tb-font-display': string;
    '--tb-shadow': string;
    '--tb-card-style': string; // 'glass' | 'solid' | 'outline' | 'flat'
    '--tb-link-style': string; // 'pill' | 'card' | 'line' | 'block'
  };
  // Tailwind gradient for the page background (used in SSR/static)
  bgGradient: string;
  // Avatar/card overlay effect
  avatarStyle: string; // 'ring-accent' | 'ring-white' | 'glow' | 'border-gradient' | 'shadow'
  // Preview thumbnail color
  previewBg: string;
  previewText: string;
}

export const THEMES: Theme[] = [
  // ── 1. MIDNIGHT ────────────────────────────────────────────────────────────
  {
    id: 'midnight',
    label: 'Midnight',
    emoji: '🌑',
    category: 'dark',
    description: 'Deep blue-black. Spotify energy.',
    bgGradient: 'from-slate-900 via-[#0d1117] to-slate-950',
    avatarStyle: 'ring-accent',
    previewBg: '#0d1117',
    previewText: '#e2e8f0',
    vars: {
      '--tb-bg':          '#0d1117',
      '--tb-bg2':         '#161b22',
      '--tb-bg3':         '#21262d',
      '--tb-text':        '#e6edf3',
      '--tb-text2':       '#8b949e',
      '--tb-border':      'rgba(240,246,252,0.1)',
      '--tb-radius':      '12px',
      '--tb-font':        '"Inter", system-ui, sans-serif',
      '--tb-font-display':'"Cal Sans", "Plus Jakarta Sans", sans-serif',
      '--tb-shadow':      '0 0 0 1px rgba(240,246,252,0.1), 0 16px 40px rgba(0,0,0,0.5)',
      '--tb-card-style':  'glass',
      '--tb-link-style':  'pill',
    },
  },

  // ── 2. NOIR ─────────────────────────────────────────────────────────────────
  {
    id: 'noir',
    label: 'Noir',
    emoji: '⬛',
    category: 'dark',
    description: 'Pure black. Maximum contrast. Luxo absoluto.',
    bgGradient: 'from-black via-black to-zinc-950',
    avatarStyle: 'ring-white',
    previewBg: '#000000',
    previewText: '#ffffff',
    vars: {
      '--tb-bg':          '#000000',
      '--tb-bg2':         '#111111',
      '--tb-bg3':         '#1a1a1a',
      '--tb-text':        '#ffffff',
      '--tb-text2':       '#888888',
      '--tb-border':      'rgba(255,255,255,0.08)',
      '--tb-radius':      '8px',
      '--tb-font':        '"Helvetica Neue", "Arial", sans-serif',
      '--tb-font-display':'"Neue Haas Grotesk", "Helvetica Neue", sans-serif',
      '--tb-shadow':      '0 0 0 1px rgba(255,255,255,0.05)',
      '--tb-card-style':  'outline',
      '--tb-link-style':  'block',
    },
  },

  // ── 3. NEON TOKYO ──────────────────────────────────────────────────────────
  {
    id: 'neon',
    label: 'Neon Tokyo',
    emoji: '🌆',
    category: 'gradient',
    description: 'Synthwave. Lo-fi. Cyberpunk glow.',
    bgGradient: 'from-[#0a0015] via-[#150025] to-[#0a0015]',
    avatarStyle: 'glow',
    previewBg: '#0a0015',
    previewText: '#f9a8d4',
    vars: {
      '--tb-bg':          '#0a0015',
      '--tb-bg2':         '#150025',
      '--tb-bg3':         '#1f0035',
      '--tb-text':        '#fce7f3',
      '--tb-text2':       '#c084fc',
      '--tb-border':      'rgba(192,132,252,0.2)',
      '--tb-radius':      '16px',
      '--tb-font':        '"Space Grotesk", sans-serif',
      '--tb-font-display':'"Space Grotesk", sans-serif',
      '--tb-shadow':      '0 0 30px rgba(168,85,247,0.15), 0 0 0 1px rgba(192,132,252,0.15)',
      '--tb-card-style':  'glass',
      '--tb-link-style':  'pill',
    },
  },

  // ── 4. IVORY ─────────────────────────────────────────────────────────────
  {
    id: 'ivory',
    label: 'Ivory',
    emoji: '🤍',
    category: 'light',
    description: 'Clean white. Apple meets Notion.',
    bgGradient: 'from-gray-50 via-white to-slate-50',
    avatarStyle: 'shadow',
    previewBg: '#ffffff',
    previewText: '#1a1a1a',
    vars: {
      '--tb-bg':          '#fafafa',
      '--tb-bg2':         '#ffffff',
      '--tb-bg3':         '#f4f4f5',
      '--tb-text':        '#18181b',
      '--tb-text2':       '#71717a',
      '--tb-border':      'rgba(0,0,0,0.08)',
      '--tb-radius':      '14px',
      '--tb-font':        '"DM Sans", system-ui, sans-serif',
      '--tb-font-display':'"DM Serif Display", Georgia, serif',
      '--tb-shadow':      '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.05)',
      '--tb-card-style':  'solid',
      '--tb-link-style':  'pill',
    },
  },

  // ── 5. GOLD ──────────────────────────────────────────────────────────────
  {
    id: 'gold',
    label: 'Gold',
    emoji: '✨',
    category: 'luxury',
    description: 'Rolex. Louis Vuitton. Ouro puro.',
    bgGradient: 'from-[#0c0900] via-[#1a1100] to-[#0c0900]',
    avatarStyle: 'border-gradient',
    previewBg: '#0c0900',
    previewText: '#fde68a',
    vars: {
      '--tb-bg':          '#0c0900',
      '--tb-bg2':         '#1a1400',
      '--tb-bg3':         '#261e00',
      '--tb-text':        '#fef3c7',
      '--tb-text2':       '#d97706',
      '--tb-border':      'rgba(234,179,8,0.2)',
      '--tb-radius':      '6px',
      '--tb-font':        '"Cormorant Garamond", Georgia, serif',
      '--tb-font-display':'"Cormorant Garamond", Georgia, serif',
      '--tb-shadow':      '0 0 0 1px rgba(234,179,8,0.15), 0 8px 32px rgba(234,179,8,0.05)',
      '--tb-card-style':  'outline',
      '--tb-link-style':  'line',
    },
  },

  // ── 6. OCEAN ─────────────────────────────────────────────────────────────
  {
    id: 'ocean',
    label: 'Ocean',
    emoji: '🌊',
    category: 'dark',
    description: 'Deep sea. Azul infinito.',
    bgGradient: 'from-[#020c18] via-[#051e3e] to-[#020c18]',
    avatarStyle: 'glow',
    previewBg: '#020c18',
    previewText: '#bae6fd',
    vars: {
      '--tb-bg':          '#020c18',
      '--tb-bg2':         '#051e3e',
      '--tb-bg3':         '#082c5a',
      '--tb-text':        '#e0f2fe',
      '--tb-text2':       '#38bdf8',
      '--tb-border':      'rgba(56,189,248,0.15)',
      '--tb-radius':      '12px',
      '--tb-font':        '"IBM Plex Sans", system-ui, sans-serif',
      '--tb-font-display':'"IBM Plex Mono", monospace',
      '--tb-shadow':      '0 0 40px rgba(14,165,233,0.12), 0 0 0 1px rgba(56,189,248,0.1)',
      '--tb-card-style':  'glass',
      '--tb-link-style':  'card',
    },
  },

  // ── 7. ROSE ──────────────────────────────────────────────────────────────
  {
    id: 'rose',
    label: 'Rose',
    emoji: '🌹',
    category: 'gradient',
    description: 'Soft pink editorial. Vogue meets Instagram.',
    bgGradient: 'from-[#1a0010] via-[#2a0018] to-[#1a0010]',
    avatarStyle: 'ring-accent',
    previewBg: '#1a0010',
    previewText: '#fecdd3',
    vars: {
      '--tb-bg':          '#1a0010',
      '--tb-bg2':         '#2a001c',
      '--tb-bg3':         '#3d0028',
      '--tb-text':        '#ffe4e6',
      '--tb-text2':       '#fb7185',
      '--tb-border':      'rgba(251,113,133,0.2)',
      '--tb-radius':      '20px',
      '--tb-font':        '"Playfair Display", Georgia, serif',
      '--tb-font-display':'"Playfair Display", Georgia, serif',
      '--tb-shadow':      '0 0 30px rgba(244,63,94,0.12), 0 0 0 1px rgba(251,113,133,0.12)',
      '--tb-card-style':  'glass',
      '--tb-link-style':  'pill',
    },
  },

  // ── 8. FOREST ────────────────────────────────────────────────────────────
  {
    id: 'forest',
    label: 'Forest',
    emoji: '🌿',
    category: 'dark',
    description: 'Terra. Orgânico. Sustentável.',
    bgGradient: 'from-[#0a1a0a] via-[#0f2614] to-[#0a1a0a]',
    avatarStyle: 'ring-accent',
    previewBg: '#0a1a0a',
    previewText: '#bbf7d0',
    vars: {
      '--tb-bg':          '#0a1a0a',
      '--tb-bg2':         '#0f2614',
      '--tb-bg3':         '#163a1c',
      '--tb-text':        '#dcfce7',
      '--tb-text2':       '#4ade80',
      '--tb-border':      'rgba(74,222,128,0.15)',
      '--tb-radius':      '12px',
      '--tb-font':        '"Nunito", system-ui, sans-serif',
      '--tb-font-display':'"Nunito", system-ui, sans-serif',
      '--tb-shadow':      '0 0 30px rgba(34,197,94,0.1), 0 0 0 1px rgba(74,222,128,0.1)',
      '--tb-card-style':  'glass',
      '--tb-link-style':  'pill',
    },
  },

  // ── 9. EDITORIAL ─────────────────────────────────────────────────────────
  {
    id: 'editorial',
    label: 'Editorial',
    emoji: '📰',
    category: 'light',
    description: 'Medium. Substack. Texto como arte.',
    bgGradient: 'from-amber-50 via-white to-stone-50',
    avatarStyle: 'shadow',
    previewBg: '#fffbf5',
    previewText: '#1c1917',
    vars: {
      '--tb-bg':          '#fffbf5',
      '--tb-bg2':         '#ffffff',
      '--tb-bg3':         '#f5f0e8',
      '--tb-text':        '#1c1917',
      '--tb-text2':       '#78716c',
      '--tb-border':      'rgba(0,0,0,0.1)',
      '--tb-radius':      '4px',
      '--tb-font':        '"Lora", Georgia, serif',
      '--tb-font-display':'"Merriweather", Georgia, serif',
      '--tb-shadow':      '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
      '--tb-card-style':  'flat',
      '--tb-link-style':  'line',
    },
  },

  // ── 10. AURORA ───────────────────────────────────────────────────────────
  {
    id: 'aurora',
    label: 'Aurora',
    emoji: '🌌',
    category: 'gradient',
    description: 'Northern lights. Gradiente vivo e dinâmico.',
    bgGradient: 'from-[#050218] via-[#0d1130] to-[#050218]',
    avatarStyle: 'border-gradient',
    previewBg: '#050218',
    previewText: '#c7d2fe',
    vars: {
      '--tb-bg':          '#050218',
      '--tb-bg2':         '#0d1130',
      '--tb-bg3':         '#141850',
      '--tb-text':        '#e0e7ff',
      '--tb-text2':       '#818cf8',
      '--tb-border':      'rgba(129,140,248,0.2)',
      '--tb-radius':      '16px',
      '--tb-font':        '"Outfit", system-ui, sans-serif',
      '--tb-font-display':'"Outfit", system-ui, sans-serif',
      '--tb-shadow':      '0 0 60px rgba(99,102,241,0.15), 0 0 0 1px rgba(129,140,248,0.12)',
      '--tb-card-style':  'glass',
      '--tb-link-style':  'pill',
    },
  },
];

export const THEME_MAP = Object.fromEntries(THEMES.map(t => [t.id, t]));
export const DEFAULT_THEME = THEMES[0];

// Build inline style string from theme vars + accent color
export function buildThemeStyle(themeId: string, accentColor: string): string {
  const theme = THEME_MAP[themeId] ?? DEFAULT_THEME;
  const vars = Object.entries(theme.vars)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
  return `${vars}; --tb-accent: ${accentColor}; --tb-accent-dim: ${accentColor}22;`;
}

// CSS applied to every mini-site — reads from theme vars
export const SITE_BASE_CSS = `
  .tb-bg        { background: var(--tb-bg); }
  .tb-card      { background: var(--tb-bg2); border: 1px solid var(--tb-border); border-radius: var(--tb-radius); box-shadow: var(--tb-shadow); }
  .tb-card.glass{ backdrop-filter: blur(20px); background: color-mix(in srgb, var(--tb-bg2) 60%, transparent); }
  .tb-text      { color: var(--tb-text); font-family: var(--tb-font); }
  .tb-text2     { color: var(--tb-text2); }
  .tb-accent    { color: var(--tb-accent); }
  .tb-link-pill { background: var(--tb-bg2); border: 1px solid var(--tb-border); border-radius: 999px; padding: 12px 20px; display: flex; align-items: center; gap: 10px; transition: all .2s; }
  .tb-link-pill:hover { border-color: var(--tb-accent); transform: translateY(-1px); box-shadow: 0 4px 16px var(--tb-accent-dim); }
  .tb-link-card { background: var(--tb-bg2); border: 1px solid var(--tb-border); border-radius: var(--tb-radius); padding: 14px 20px; display: flex; align-items: center; gap: 10px; transition: all .2s; }
  .tb-link-card:hover { border-color: var(--tb-accent); }
  .tb-link-line { border-bottom: 1px solid var(--tb-border); padding: 14px 0; display: flex; align-items: center; gap: 10px; transition: all .2s; }
  .tb-link-line:hover { border-color: var(--tb-accent); }
  .tb-link-block{ background: var(--tb-accent); color: white; border-radius: var(--tb-radius); padding: 14px 20px; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 700; transition: all .2s; }
  .tb-link-block:hover { opacity: .9; transform: translateY(-1px); }
`;
