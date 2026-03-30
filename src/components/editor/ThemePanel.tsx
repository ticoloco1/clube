'use client';
import { useState } from 'react';
import { Check, Palette, Type, Layout, Columns } from 'lucide-react';
import { THEMES, type Theme } from '@/lib/themes';

const ACCENT_PRESETS = [
  '#818cf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24',
  '#60a5fa', '#f87171', '#22d3ee', '#fb923c', '#a3e635',
  '#e879f9', '#2dd4bf', '#facc15', '#f97316', '#06b6d4',
];

const FONT_SIZE_OPTIONS = [
  { id: 'sm', label: 'Small', desc: '13px' },
  { id: 'md', label: 'Medium', desc: '15px' },
  { id: 'lg', label: 'Large', desc: '17px' },
];

interface ThemePanelProps {
  currentTheme: string;
  accentColor: string;
  fontSize: string;
  videoCols: number;
  onThemeChange: (id: string) => void;
  onAccentChange: (color: string) => void;
  onFontSizeChange: (size: string) => void;
  onVideoColsChange: (cols: number) => void;
}

export function ThemePanel({
  currentTheme, accentColor, fontSize, videoCols,
  onThemeChange, onAccentChange, onFontSizeChange, onVideoColsChange,
}: ThemePanelProps) {
  const [tab, setTab] = useState<'themes' | 'colors' | 'layout'>('themes');
  const [customColor, setCustomColor] = useState(accentColor);

  const tabs = [
    { id: 'themes', label: 'Temas', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'colors', label: 'Cores', icon: <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ background: accentColor }} /> },
    { id: 'layout', label: 'Layout', icon: <Layout className="w-3.5 h-3.5" /> },
  ] as const;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all ${
              tab === t.id
                ? 'text-[var(--text)] border-b-2 border-brand bg-brand/5'
                : 'text-[var(--text2)] hover:text-[var(--text)]'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Themes tab */}
      {tab === 'themes' && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map(theme => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                selected={currentTheme === theme.id}
                accentColor={accentColor}
                onClick={() => onThemeChange(theme.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Colors tab */}
      {tab === 'colors' && (
        <div className="p-4 space-y-5">
          <div>
            <p className="text-xs font-semibold text-[var(--text2)] mb-3 uppercase tracking-wide">Cor de destaque</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {ACCENT_PRESETS.map(color => (
                <button key={color} onClick={() => onAccentChange(color)}
                  className="relative aspect-square rounded-xl border-2 transition-all hover:scale-110"
                  style={{
                    background: color,
                    borderColor: accentColor === color ? 'white' : 'transparent',
                    boxShadow: accentColor === color ? `0 0 0 3px ${color}` : 'none',
                  }}>
                  {accentColor === color && (
                    <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto drop-shadow" />
                  )}
                </button>
              ))}
            </div>
            {/* Custom color picker */}
            <div className="flex items-center gap-3 mt-2">
              <div className="relative">
                <input type="color" value={customColor}
                  onChange={e => setCustomColor(e.target.value)}
                  onBlur={() => onAccentChange(customColor)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                <div className="w-10 h-10 rounded-xl border border-[var(--border)] flex items-center justify-center text-lg pointer-events-none"
                  style={{ background: customColor }}>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-[var(--text)]">Cor personalizada</p>
                <p className="text-xs text-[var(--text2)] font-mono">{customColor.toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs font-semibold text-[var(--text2)] mb-2 uppercase tracking-wide">Preview</p>
            <div className="rounded-xl overflow-hidden border border-[var(--border)]" style={{ background: '#111' }}>
              <div className="p-4 text-center">
                <div className="w-12 h-12 rounded-full mx-auto mb-2" style={{ background: accentColor }} />
                <div className="h-3 rounded-full w-24 mx-auto mb-1.5" style={{ background: accentColor + '99' }} />
                <div className="h-2 rounded-full w-32 mx-auto" style={{ background: '#ffffff20' }} />
                <div className="mt-3 rounded-full py-2 px-4 text-xs font-bold text-white" style={{ background: accentColor, display: 'inline-block' }}>
                  Link de exemplo
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layout tab */}
      {tab === 'layout' && (
        <div className="p-4 space-y-5">
          {/* Font size */}
          <div>
            <p className="text-xs font-semibold text-[var(--text2)] mb-3 uppercase tracking-wide flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Tamanho do texto
            </p>
            <div className="flex gap-2">
              {FONT_SIZE_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => onFontSizeChange(opt.id)}
                  className={`flex-1 py-2.5 rounded-xl border text-center transition-all ${
                    fontSize === opt.id
                      ? 'border-brand bg-brand/10 text-[var(--text)]'
                      : 'border-[var(--border)] text-[var(--text2)] hover:border-brand/50'
                  }`}>
                  <div className={`font-bold ${opt.id === 'sm' ? 'text-xs' : opt.id === 'md' ? 'text-sm' : 'text-base'}`}>{opt.label}</div>
                  <div className="text-xs text-[var(--text2)]">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Video columns */}
          <div>
            <p className="text-xs font-semibold text-[var(--text2)] mb-3 uppercase tracking-wide flex items-center gap-1.5">
              <Columns className="w-3.5 h-3.5" /> Colunas de vídeo
            </p>
            <div className="flex gap-2">
              {[
                { cols: 1, label: '1 coluna', icon: '▬', desc: 'Mobile-first' },
                { cols: 2, label: '2 colunas', icon: '▬▬', desc: 'Padrão' },
                { cols: 3, label: '3 colunas', icon: '▬▬▬', desc: 'Netflix' },
              ].map(opt => (
                <button key={opt.cols} onClick={() => onVideoColsChange(opt.cols)}
                  className={`flex-1 py-3 rounded-xl border text-center transition-all ${
                    videoCols === opt.cols
                      ? 'border-brand bg-brand/10 text-[var(--text)]'
                      : 'border-[var(--border)] text-[var(--text2)] hover:border-brand/50'
                  }`}>
                  <div className="text-base mb-0.5 tracking-tight">{opt.icon}</div>
                  <div className="text-xs font-semibold">{opt.cols === 1 ? '1 col' : opt.cols === 2 ? '2 cols' : '3 cols'}</div>
                  <div className="text-xs text-[var(--text2)]">{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* Visual preview of video layout */}
            <div className="mt-3 rounded-xl border border-[var(--border)] p-3 bg-black/30">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${videoCols}, 1fr)`, gap: 4 }}>
                {[...Array(videoCols * 2)].map((_, i) => (
                  <div key={i} className="aspect-video rounded-lg" style={{ background: i % 3 === 0 ? accentColor + '40' : '#ffffff10' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Individual theme card ─────────────────────────────────────────────────────
function ThemeCard({ theme, selected, accentColor, onClick }: {
  theme: Theme; selected: boolean; accentColor: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`relative rounded-xl overflow-hidden border-2 transition-all text-left hover:scale-[1.02] ${
        selected ? 'border-brand shadow-lg' : 'border-transparent hover:border-[var(--border)]'
      }`}
      style={{ background: theme.previewBg }}>

      {/* Mini preview */}
      <div className="p-3 pb-2">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full mx-auto mb-1.5" style={{ background: accentColor }} />
        {/* Name bar */}
        <div className="h-1.5 rounded-full mx-auto w-16 mb-1" style={{ background: theme.previewText + '80' }} />
        {/* Bio bar */}
        <div className="h-1 rounded-full mx-auto w-20" style={{ background: theme.previewText + '30' }} />
        {/* Link preview */}
        <div className="mt-2 rounded-full h-4 w-full" style={{ background: theme.previewText + '15', border: `1px solid ${theme.previewText}20` }} />
        <div className="mt-1 rounded-full h-4 w-3/4" style={{ background: theme.previewText + '10', border: `1px solid ${theme.previewText}15` }} />
      </div>

      {/* Label bar */}
      <div className="px-3 pb-2.5 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold" style={{ color: theme.previewText }}>{theme.emoji} {theme.label}</span>
          <p className="text-[10px]" style={{ color: theme.previewText + '60', marginTop: 1 }}>{theme.description}</p>
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Category badge */}
      <div className="absolute top-2 right-2">
        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
          style={{
            background: theme.previewText + '15',
            color: theme.previewText + '80',
          }}>
          {theme.category}
        </span>
      </div>
    </button>
  );
}
