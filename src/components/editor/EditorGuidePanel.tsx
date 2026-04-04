'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, PanelRightClose, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const STORAGE_COLLAPSED = 'trustbank-editor-guide-collapsed-v1';
const STORAGE_NO_AUTO = 'trustbank-editor-guide-no-auto-v1';

type GuideStep = {
  id: string;
  /** Separador do editor a abrir (opcional) */
  tab?: string;
  titleKey: string;
  bodyKey: string;
};

const STEPS: GuideStep[] = [
  { id: 'start', titleKey: 'ed_guide_step_start_title', bodyKey: 'ed_guide_step_start_body' },
  { id: 'profile', tab: 'profile', titleKey: 'ed_guide_step_profile_title', bodyKey: 'ed_guide_step_profile_body' },
  { id: 'theme', tab: 'theme', titleKey: 'ed_guide_step_theme_title', bodyKey: 'ed_guide_step_theme_body' },
  { id: 'links', tab: 'links', titleKey: 'ed_guide_step_links_title', bodyKey: 'ed_guide_step_links_body' },
  { id: 'videos', tab: 'videos', titleKey: 'ed_guide_step_videos_title', bodyKey: 'ed_guide_step_videos_body' },
  { id: 'cv', tab: 'cv', titleKey: 'ed_guide_step_cv_title', bodyKey: 'ed_guide_step_cv_body' },
  { id: 'feed', tab: 'feed', titleKey: 'ed_guide_step_feed_title', bodyKey: 'ed_guide_step_feed_body' },
  { id: 'pages', tab: 'pages', titleKey: 'ed_guide_step_pages_title', bodyKey: 'ed_guide_step_pages_body' },
  { id: 'mystic', tab: 'profile', titleKey: 'ed_guide_step_mystic_title', bodyKey: 'ed_guide_step_mystic_body' },
  { id: 'seo', tab: 'seo', titleKey: 'ed_guide_step_seo_title', bodyKey: 'ed_guide_step_seo_body' },
  { id: 'copilot', tab: 'copilot', titleKey: 'ed_guide_step_copilot_title', bodyKey: 'ed_guide_step_copilot_body' },
  { id: 'ia', tab: 'ia', titleKey: 'ed_guide_step_ia_title', bodyKey: 'ed_guide_step_ia_body' },
  { id: 'booking', tab: 'booking', titleKey: 'ed_guide_step_booking_title', bodyKey: 'ed_guide_step_booking_body' },
  { id: 'verify', tab: 'verify', titleKey: 'ed_guide_step_verify_title', bodyKey: 'ed_guide_step_verify_body' },
  { id: 'slugs', titleKey: 'ed_guide_step_slugs_title', bodyKey: 'ed_guide_step_slugs_body' },
];

export type EditorGuidePanelProps = {
  activeTab: string;
  onGoToTab: (tabId: string) => void;
  /** false = esconde o passo do Copiloto (IA desligada no editor). */
  showCopilotInGuide?: boolean;
  /**
   * true = guia em coluna à esquerda (fluxo do documento), não cobre o preview.
   * false = painel fixo à direita (legado).
   */
  dockLeftColumn?: boolean;
};

export function EditorGuidePanel({
  activeTab,
  onGoToTab,
  showCopilotInGuide = true,
  dockLeftColumn = false,
}: EditorGuidePanelProps) {
  const { t, lang } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const collapsed = localStorage.getItem(STORAGE_COLLAPSED) === '1';
      const noAuto = localStorage.getItem(STORAGE_NO_AUTO) === '1';
      setExpanded(!noAuto && !collapsed);
    } catch {
      setExpanded(true);
    }
  }, []);

  const collapse = useCallback(() => {
    setExpanded(false);
    setMobileOpen(false);
    try {
      localStorage.setItem(STORAGE_COLLAPSED, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const stopAutoOpen = useCallback(() => {
    setExpanded(false);
    setMobileOpen(false);
    try {
      localStorage.setItem(STORAGE_COLLAPSED, '1');
      localStorage.setItem(STORAGE_NO_AUTO, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const expand = useCallback(() => {
    setExpanded(true);
    try {
      localStorage.removeItem(STORAGE_COLLAPSED);
    } catch {
      /* ignore */
    }
  }, []);

  const goTab = useCallback(
    (tab?: string) => {
      if (!tab) return;
      onGoToTab(tab);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileOpen(false);
      }
    },
    [onGoToTab],
  );

  const visibleSteps = useMemo(
    () => STEPS.filter((s) => showCopilotInGuide || s.id !== 'copilot'),
    [showCopilotInGuide],
  );

  const stepsBlock = useMemo(
    () => (
      <div className="flex-1 overflow-y-auto overscroll-contain py-1 space-y-3 pr-1 -mr-1 min-h-0">
        {visibleSteps.map((step) => {
          const here = step.tab != null && step.tab === activeTab;
          return (
            <div
              key={step.id}
              className={`rounded-xl border p-3 text-left transition-colors ${
                here ? 'border-brand/60 bg-brand/5' : 'border-[var(--border)] bg-[var(--bg2)]/60'
              }`}
            >
              <p className="text-sm font-bold text-[var(--text)]">{t(step.titleKey)}</p>
              <p className="text-xs text-[var(--text2)] mt-1.5 leading-relaxed whitespace-pre-line">{t(step.bodyKey)}</p>
              {step.tab && (
                <button
                  type="button"
                  onClick={() => goTab(step.tab)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                >
                  {t('ed_guide_open_tab')} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              {step.id === 'slugs' && (
                <Link
                  href="/slugs"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                >
                  {t('ed_guide_open_slugs')} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    ),
    [t, lang, activeTab, goTab, visibleSteps],
  );

  const footerBlock = useMemo(
    () => (
      <div className="pt-3 border-t border-[var(--border)] space-y-2 flex-shrink-0">
        <button
          type="button"
          onClick={stopAutoOpen}
          className="w-full text-xs font-semibold text-[var(--text2)] hover:text-[var(--text)] py-2 rounded-lg hover:bg-[var(--bg2)]"
        >
          {t('ed_guide_dont_auto')}
        </button>
        <p className="text-[10px] text-[var(--text2)]/80 text-center leading-snug">{t('ed_guide_footer_hint')}</p>
      </div>
    ),
    [t, lang, stopAutoOpen],
  );

  if (!mounted) return null;

  const desktopDockInner = (
    <div key={lang} className="flex flex-col h-full min-h-0 max-h-[calc(100dvh-4rem)] w-full px-2 pb-2 pt-2">
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--border)] flex-shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">{t('ed_guide_kicker')}</p>
          <h2 className="text-base font-black text-[var(--text)] leading-tight mt-0.5">{t('ed_guide_title')}</h2>
          <p className="text-[11px] text-[var(--text2)] mt-1">{t('ed_guide_subtitle')}</p>
        </div>
      </div>
      {stepsBlock}
      {footerBlock}
    </div>
  );

  if (dockLeftColumn) {
    return (
      <>
        <div className="hidden md:flex flex-col w-full min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-label={t('ed_guide_title')}>
          {desktopDockInner}
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed bottom-20 right-4 z-[28] flex items-center gap-2 rounded-full border border-[var(--border)] bg-brand text-white px-4 py-3 text-sm font-bold shadow-lg"
          aria-label={t('ed_guide_title')}
        >
          <BookOpen className="w-4 h-4" />
          {t('ed_guide_tab_label')}
        </button>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-[45] flex flex-col justify-end bg-black/50" role="dialog" aria-modal="true">
            <button type="button" className="flex-1 min-h-[20vh] w-full cursor-default" aria-label="Close" onClick={() => setMobileOpen(false)} />
            <div key={`m-${lang}`} className="max-h-[min(78dvh,560px)] rounded-t-2xl border-t border-x border-[var(--border)] bg-[var(--bg)] px-4 pt-2 pb-4 shadow-2xl flex flex-col">
              <div className="flex justify-center pb-2">
                <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <span className="text-sm font-black text-[var(--text)]">{t('ed_guide_title')}</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-lg text-[var(--text2)] hover:bg-[var(--bg2)]"
                  aria-label={t('ed_guide_close_mobile')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[11px] text-[var(--text2)] pb-2">{t('ed_guide_subtitle')}</p>
              <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
                {stepsBlock}
                {footerBlock}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Desktop / tablet: painel lateral fixo à direita */}
      {expanded ? (
        <aside
          key={lang}
          className="hidden md:flex flex-col fixed right-0 top-[7.5rem] z-[28] w-[min(20.5rem,calc(100vw-12px))] max-h-[calc(100dvh-7.5rem)] border-l border-[var(--border)] bg-[var(--bg)]/98 backdrop-blur-md shadow-[0_0_24px_rgba(0,0,0,0.12)] px-3 pb-3 pt-3"
          aria-label={t('ed_guide_title')}
        >
          <div className="flex flex-col h-full min-h-0 max-h-[calc(100dvh-7.5rem)]">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--border)] flex-shrink-0">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-brand">{t('ed_guide_kicker')}</p>
                <h2 className="text-base font-black text-[var(--text)] leading-tight mt-0.5">{t('ed_guide_title')}</h2>
                <p className="text-[11px] text-[var(--text2)] mt-1">{t('ed_guide_subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={collapse}
                className="p-2 rounded-lg text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)] flex-shrink-0"
                title={t('ed_guide_minimize')}
                aria-label={t('ed_guide_minimize')}
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
            {stepsBlock}
            {footerBlock}
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={expand}
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-[28] flex-col items-center gap-1 py-4 px-2 rounded-l-xl border border-r-0 border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] shadow-lg hover:bg-brand hover:text-white hover:border-brand transition-colors"
          aria-expanded={false}
          title={t('ed_guide_show_again')}
        >
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider [writing-mode:vertical-rl] rotate-180 max-h-[8rem]">
            {t('ed_guide_tab_label')}
          </span>
        </button>
      )}

      {/* Mobile: botão flutuante + folha */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-[28] flex items-center gap-2 rounded-full border border-[var(--border)] bg-brand text-white px-4 py-3 text-sm font-bold shadow-lg"
        aria-label={t('ed_guide_title')}
      >
        <BookOpen className="w-4 h-4" />
        {t('ed_guide_tab_label')}
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[45] flex flex-col justify-end bg-black/50" role="dialog" aria-modal="true">
          <button type="button" className="flex-1 min-h-[20vh] w-full cursor-default" aria-label="Close" onClick={() => setMobileOpen(false)} />
          <div key={lang} className="max-h-[min(78dvh,560px)] rounded-t-2xl border-t border-x border-[var(--border)] bg-[var(--bg)] px-4 pt-2 pb-4 shadow-2xl flex flex-col">
            <div className="flex justify-center pb-2">
              <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <span className="text-sm font-black text-[var(--text)]">{t('ed_guide_title')}</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-[var(--text2)] hover:bg-[var(--bg2)]"
                aria-label={t('ed_guide_close_mobile')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[11px] text-[var(--text2)] pb-2">{t('ed_guide_subtitle')}</p>
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
              {stepsBlock}
              {footerBlock}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
