'use client';

import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  AVATAR_CHARACTER_CATALOG,
  AVATAR_CHARACTER_CATEGORIES,
  type AvatarCharacterCategory,
} from '@/lib/avatarCharacterCatalog';

export function AvatarCharacterInspirationPanel({
  T,
  onAppendInstructions,
}: {
  T: (key: string) => string;
  /** Optional: append a one-line style hint to agent instructions */
  onAppendInstructions?: (line: string) => void;
}) {
  const [tab, setTab] = useState<AvatarCharacterCategory>('animal');

  const list = useMemo(() => AVATAR_CHARACTER_CATALOG.filter((x) => x.category === tab), [tab]);

  return (
    <div className="rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/[0.07] to-violet-500/[0.05] p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-fuchsia-300" />
        </div>
        <div>
          <h3 className="font-black text-sm text-[var(--text)]">{T('ed_character_library_title')}</h3>
          <p className="text-[11px] text-[var(--text2)] mt-1 leading-relaxed">{T('ed_character_library_hint')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {AVATAR_CHARACTER_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setTab(c.id)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              tab === c.id
                ? 'bg-fuchsia-500/30 text-fuchsia-100 border border-fuchsia-400/40'
                : 'bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] hover:border-fuchsia-500/30'
            }`}
          >
            {c.labelEn}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
        {list.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() =>
              onAppendInstructions?.(`Character vibe: ${row.labelEn} (${row.id}). Stay on-brand for the mini-site.`)
            }
            className="text-left rounded-xl border border-[var(--border)] bg-[var(--bg2)]/70 px-2.5 py-2 hover:border-fuchsia-500/40 hover:bg-[var(--bg3)]/80 transition-all"
          >
            <span className="text-[11px] font-semibold text-[var(--text)] leading-snug block">{row.labelEn}</span>
            <span className="text-[9px] text-[var(--text2)] font-mono opacity-70">{row.id}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-[var(--text2)]">{T('ed_character_library_footer')}</p>
    </div>
  );
}
