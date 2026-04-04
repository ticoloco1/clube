'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Wand2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useT, useI18n } from '@/lib/i18n';

type Task =
  | 'profile_bio'
  | 'cv_headline'
  | 'seo_title'
  | 'seo_meta_description'
  | 'paywall_pitch'
  | 'page_html'
  | 'sponsor_voice_script'
  | 'site_audit';

export function SiteCopilotPanel({
  siteId,
  bio,
  cvHeadline,
  sitePages,
  pageContents,
  markDirty,
  onApplyBio,
  onApplyCvHeadline,
  onApplySeoTitle,
  onApplySeoDescription,
  onApplyPageHtml,
  onAppendLivelyInstructions,
  paywallEnabled,
  paywallPrice,
  iaApiEnabled = true,
}: {
  siteId: string;
  bio: string;
  cvHeadline: string;
  paywallEnabled: boolean;
  paywallPrice: string;
  sitePages: { id: string; label: string }[];
  pageContents: Record<string, string>;
  markDirty: () => void;
  onApplyBio: (s: string) => void;
  onApplyCvHeadline: (s: string) => void;
  onApplySeoTitle: (s: string) => void;
  onApplySeoDescription: (s: string) => void;
  onApplyPageHtml: (pageId: string, html: string) => void;
  onAppendLivelyInstructions: (s: string) => void;
  iaApiEnabled?: boolean;
}) {
  const T = useT();
  const { lang } = useI18n();
  const [task, setTask] = useState<Task>('profile_bio');
  const [context, setContext] = useState('');
  const [draft, setDraft] = useState('');
  const [pageId, setPageId] = useState<string>(() => sitePages[0]?.id || '');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pageId && sitePages[0]?.id) setPageId(sitePages[0].id);
    if (pageId && !sitePages.some((p) => p.id === pageId) && sitePages[0]?.id) {
      setPageId(sitePages[0].id);
    }
  }, [sitePages, pageId]);

  useEffect(() => {
    if (task === 'page_html') {
      setDraft(pageContents[pageId] || '');
    } else if (task === 'profile_bio') {
      setDraft(bio);
    } else if (task === 'cv_headline') {
      setDraft(cvHeadline);
    }
  }, [task, pageId, pageContents, bio, cvHeadline]);

  const run = useCallback(async () => {
    if (!siteId || busy) return;
    setBusy(true);
    setOut('');
    try {
      const page = sitePages.find((p) => p.id === pageId);
      const res = await fetch('/api/editor/site-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          task,
          context,
          draft: task === 'page_html' ? draft : draft.trim() ? draft : undefined,
          pageLabel: page?.label || '',
          paywallEnabled,
          paywallPrice,
          uiLang: lang,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : T('ed_copilot_fail'));
        return;
      }
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      if (!text) {
        toast.error(T('ed_copilot_empty'));
        return;
      }
      setOut(text);
      toast.success(T('ed_copilot_ok'));
    } catch {
      toast.error(T('ed_copilot_fail'));
    } finally {
      setBusy(false);
    }
  }, [siteId, busy, task, context, draft, pageId, sitePages, paywallEnabled, paywallPrice, lang, iaApiEnabled, T]);

  const copyOut = useCallback(async () => {
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(T('ed_copilot_copy_fail'));
    }
  }, [out, T]);

  const apply = useCallback(() => {
    if (!out) return;
    switch (task) {
      case 'profile_bio':
        onApplyBio(out.slice(0, 900));
        break;
      case 'cv_headline':
        onApplyCvHeadline(out.slice(0, 120));
        break;
      case 'seo_title':
        onApplySeoTitle(out.slice(0, 70));
        break;
      case 'seo_meta_description':
        onApplySeoDescription(out.slice(0, 160));
        break;
      case 'page_html':
        onApplyPageHtml(pageId, out);
        break;
      case 'sponsor_voice_script':
        onAppendLivelyInstructions(out);
        break;
      default:
        return;
    }
    markDirty();
    toast.success(T('ed_copilot_applied'));
  }, [out, task, pageId, onApplyBio, onApplyCvHeadline, onApplySeoTitle, onApplySeoDescription, onApplyPageHtml, onAppendLivelyInstructions, markDirty, T]);

  const showApply =
    task !== 'site_audit' &&
    task !== 'paywall_pitch' &&
    !!out;

  const tasks: { id: Task; label: string }[] = [
    { id: 'profile_bio', label: T('ed_copilot_task_bio') },
    { id: 'cv_headline', label: T('ed_copilot_task_cv') },
    { id: 'seo_title', label: T('ed_copilot_task_seo_title') },
    { id: 'seo_meta_description', label: T('ed_copilot_task_seo_desc') },
    { id: 'paywall_pitch', label: T('ed_copilot_task_paywall') },
    { id: 'page_html', label: T('ed_copilot_task_page') },
    { id: 'sponsor_voice_script', label: T('ed_copilot_task_sponsor') },
    { id: 'site_audit', label: T('ed_copilot_task_audit') },
  ];

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h2 className="font-black text-lg text-[var(--text)] flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-violet-400" />
          {T('ed_copilot_title')}
        </h2>
        <p className="text-xs text-[var(--text2)] mt-2 leading-relaxed border-l-2 border-violet-500/40 pl-3">
          {T('ed_copilot_intro')}
        </p>
      </div>

      <div>
        <label className="label block mb-1">{T('ed_copilot_task_label')}</label>
        <select
          className="input"
          value={task}
          onChange={(e) => {
            setTask(e.target.value as Task);
            setOut('');
          }}
        >
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {task === 'page_html' && (
        <div>
          <label className="label block mb-1">{T('ed_copilot_page_pick')}</label>
          <select className="input" value={pageId} onChange={(e) => setPageId(e.target.value)}>
            {sitePages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label block mb-1">{T('ed_copilot_context_label')}</label>
        <textarea
          className="input resize-none text-sm min-h-[72px]"
          value={context}
          onChange={(e) => setContext(e.target.value.slice(0, 1200))}
          placeholder={T('ed_copilot_context_ph')}
        />
      </div>

      {(task === 'page_html' || task === 'profile_bio' || task === 'cv_headline') && (
        <div>
          <label className="label block mb-1">{T('ed_copilot_draft_label')}</label>
          <textarea
            className="input resize-none text-sm font-mono min-h-[100px]"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 8000))}
            placeholder={T('ed_copilot_draft_ph')}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !siteId || !iaApiEnabled}
          onClick={() => void run()}
          className="btn-primary gap-2 text-sm"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {busy ? T('ed_copilot_busy') : T('ed_copilot_run')}
        </button>
        {out ? (
          <>
            <button type="button" onClick={() => void copyOut()} className="btn-secondary gap-2 text-sm">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {T('ed_copilot_copy')}
            </button>
            {showApply ? (
              <button type="button" onClick={() => apply()} className="btn-secondary text-sm border-emerald-500/40 text-emerald-300">
                {T('ed_copilot_apply')}
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {out ? (
        <div>
          <label className="label block mb-1">{T('ed_copilot_output')}</label>
          <textarea className="input resize-y min-h-[160px] text-sm font-mono" readOnly value={out} />
          {task === 'paywall_pitch' ? (
            <p className="text-[10px] text-[var(--text2)] mt-1">{T('ed_copilot_paywall_hint')}</p>
          ) : null}
          {task === 'site_audit' ? (
            <p className="text-[10px] text-[var(--text2)] mt-1">{T('ed_copilot_audit_hint')}</p>
          ) : null}
          {task === 'sponsor_voice_script' ? (
            <p className="text-[10px] text-[var(--text2)] mt-1">{T('ed_copilot_sponsor_hint')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
