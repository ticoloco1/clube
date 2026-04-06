'use client';

import { useEffect, useRef } from 'react';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { flattenLegacyPageMedia } from '@/lib/embedHtml';
import { useT } from '@/lib/i18n';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editorKey: string;
};

export function PageRichEditor({ value, onChange, placeholder, editorKey }: Props) {
  const T = useT();
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    const v = value || '';
    if (lastSeenRef.current === v) return;
    const flat = flattenLegacyPageMedia(v);
    if (flat !== v) {
      lastSeenRef.current = flat;
      onChange(flat);
      return;
    }
    lastSeenRef.current = v;
  }, [value, onChange]);

  const displayValue = flattenLegacyPageMedia(value || '');

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text2)] leading-relaxed">{T('ed_page_inline_media_hint')}</p>
      <RichTextEditor
        showToolbarMedia
        editorKey={editorKey}
        value={displayValue}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}
