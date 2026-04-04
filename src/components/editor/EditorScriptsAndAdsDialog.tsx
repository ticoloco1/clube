'use client';

import { Loader2, Megaphone, MessageCircle, Wand2, X } from 'lucide-react';
import { normalizePublicSiteUrl } from '@/lib/publicSiteUrl';

export type EditorScriptsAndAdsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  T: (key: string) => string;
  lang: string;
  siteName: string;
  livelyProfileAsAvatar: boolean;
  livelyAvatarWelcome: string;
  setLivelyAvatarWelcome: (v: string) => void;
  livelyProfileSpeechTap: string;
  setLivelyProfileSpeechTap: (v: string) => void;
  livelyProfileSpeechBeforeReply: string;
  setLivelyProfileSpeechBeforeReply: (v: string) => void;
  runSuggestLivelyWelcome: () => void | Promise<void>;
  livelySuggestWelcomeBusy: boolean;
  siteSlug: string | null | undefined;
  adAskingPrice: string;
  setAdAskingPrice: (v: string) => void;
  adShowPricePublic: boolean;
  setAdShowPricePublic: (v: boolean) => void;
  onSuggestAdPrice: () => void | Promise<void>;
  suggestingPrice: boolean;
  markDirty: () => void;
  /** false = esconde botões que chamam API de IA (sugestão welcome / preço). */
  showIaSuggestButtons?: boolean;
};

function ExampleBlock({
  label,
  text,
  onUse,
  useLabel,
}: {
  label: string;
  text: string;
  onUse: () => void;
  useLabel: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/80 p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text2)]">{label}</p>
      <p className="text-xs text-[var(--text)] leading-relaxed whitespace-pre-wrap">{text}</p>
      <button
        type="button"
        onClick={onUse}
        className="text-xs font-bold px-2.5 py-1 rounded-lg border border-brand/40 text-brand hover:bg-brand/10"
      >
        {useLabel}
      </button>
    </div>
  );
}

export function EditorScriptsAndAdsDialog(props: EditorScriptsAndAdsDialogProps) {
  const {
    open,
    onOpenChange,
    T,
    lang,
    siteName,
    livelyProfileAsAvatar,
    livelyAvatarWelcome,
    setLivelyAvatarWelcome,
    livelyProfileSpeechTap,
    setLivelyProfileSpeechTap,
    livelyProfileSpeechBeforeReply,
    setLivelyProfileSpeechBeforeReply,
    runSuggestLivelyWelcome,
    livelySuggestWelcomeBusy,
    siteSlug,
    adAskingPrice,
    setAdAskingPrice,
    adShowPricePublic,
    setAdShowPricePublic,
    onSuggestAdPrice,
    suggestingPrice,
    markDirty,
    showIaSuggestButtons = true,
  } = props;

  const en = lang.startsWith('en');
  const brand = (siteName || '').trim() || (en ? 'my brand' : 'a minha marca');

  const exWelcome = en
    ? `Hi! I'm ${brand}'s assistant on this page. Ask me about services, links, or anything on the profile.`
    : `Olá! Sou o assistente de ${brand} nesta página. Pergunta sobre serviços, links ou o que quiseres do perfil.`;
  const exBefore = en ? 'One moment — thinking of the best answer…' : 'Um momento — a pensar na melhor resposta…';
  const exTap = en ? 'Tap the assistant button to chat with me in voice and text!' : 'Toca no botão do assistente para falares comigo por voz e texto!';
  const exAdNote = en
    ? 'Example weekly rate: US$120–250 for a feed mention + bio link (adjust to your niche).'
    : 'Exemplo de valor semanal: US$120–250 por menção no feed + link na bio (ajusta ao teu nicho).';

  if (!open) return null;

  const tbOrigin = normalizePublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const marketplaceUrl = siteSlug
    ? `${tbOrigin}/marketplace/ads?slug=${encodeURIComponent(siteSlug)}&ref=editor-dialog`
    : `${tbOrigin}/marketplace/ads`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal aria-labelledby="ed-scripts-ads-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
        aria-label={T('ed_dialog_scripts_close')}
      />
      <div className="relative w-full max-w-lg max-h-[min(90vh,760px)] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-2xl">
        <div className="sticky top-0 z-[1] flex items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur px-4 py-3">
          <div>
            <h2 id="ed-scripts-ads-title" className="font-black text-base text-[var(--text)] flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-violet-400 shrink-0" />
              {T('ed_dialog_scripts_title')}
            </h2>
            <p className="text-[11px] text-[var(--text2)] mt-1 leading-relaxed">{T('ed_dialog_scripts_intro')}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-xl hover:bg-[var(--bg2)] text-[var(--text2)]"
            aria-label={T('ed_dialog_scripts_close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-black text-[var(--text)] flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-300 text-xs">TTS</span>
              {T('ed_dialog_scripts_speeches')}
            </h3>
            <p className="text-[11px] text-[var(--text2)] leading-relaxed">{T('ed_dialog_scripts_speeches_hint')}</p>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="label block mb-0">{T('ed_lively_welcome')}</label>
                <button
                  type="button"
                  disabled={livelySuggestWelcomeBusy || !siteSlug}
                  onClick={() => void runSuggestLivelyWelcome()}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg2)] hover:bg-[var(--bg3)] disabled:opacity-40"
                >
                  {livelySuggestWelcomeBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  {T('ed_lively_suggest_welcome')}
                </button>
              </div>
              <textarea
                value={livelyAvatarWelcome}
                onChange={(e) => {
                  setLivelyAvatarWelcome(e.target.value.slice(0, 500));
                  markDirty();
                }}
                className="input resize-none text-sm w-full"
                rows={3}
                placeholder={T('ed_lively_welcome_ph')}
              />
              <ExampleBlock
                label={T('ed_dialog_example_label')}
                text={exWelcome}
                useLabel={T('ed_dialog_use_example')}
                onUse={() => {
                  setLivelyAvatarWelcome(exWelcome.slice(0, 500));
                  markDirty();
                }}
              />
            </div>

            <div>
              <label className="label block mb-1">{T('ed_ia_speech_before_reply')}</label>
              <textarea
                value={livelyProfileSpeechBeforeReply}
                onChange={(e) => {
                  setLivelyProfileSpeechBeforeReply(e.target.value.slice(0, 400));
                  markDirty();
                }}
                className="input resize-none text-sm w-full"
                rows={2}
                placeholder={T('ed_ia_speech_before_reply_ph')}
              />
              <ExampleBlock
                label={T('ed_dialog_example_label')}
                text={exBefore}
                useLabel={T('ed_dialog_use_example')}
                onUse={() => {
                  setLivelyProfileSpeechBeforeReply(exBefore.slice(0, 400));
                  markDirty();
                }}
              />
            </div>

            <div>
              <label className="label block mb-1">{T('ed_ia_speech_tap')}</label>
              {!livelyProfileAsAvatar && (
                <p className="text-[10px] text-amber-400/90 mb-2">{T('ed_dialog_tap_requires_avatar')}</p>
              )}
              <textarea
                value={livelyProfileSpeechTap}
                onChange={(e) => {
                  setLivelyProfileSpeechTap(e.target.value.slice(0, 400));
                  markDirty();
                }}
                disabled={!livelyProfileAsAvatar}
                className="input resize-none text-sm w-full disabled:opacity-40"
                rows={2}
                placeholder={T('ed_ia_speech_tap_ph')}
              />
              <ExampleBlock
                label={T('ed_dialog_example_label')}
                text={exTap}
                useLabel={T('ed_dialog_use_example')}
                onUse={() => {
                  if (!livelyProfileAsAvatar) return;
                  setLivelyProfileSpeechTap(exTap.slice(0, 400));
                  markDirty();
                }}
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--border)] pt-6">
            <h3 className="text-sm font-black text-[var(--text)] flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-400 shrink-0" />
              {T('ed_dialog_scripts_ads')}
            </h3>
            <p className="text-[11px] text-[var(--text2)] leading-relaxed">{T('ed_dialog_scripts_ads_hint')}</p>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60 p-3 text-[11px] text-[var(--text2)] leading-relaxed">
              {exAdNote}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <label className="label block mb-0">{T('ed_min_price_week')}</label>
                {showIaSuggestButtons ? (
                  <button
                    type="button"
                    disabled={suggestingPrice}
                    onClick={() => void onSuggestAdPrice()}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg border border-brand/40 text-brand hover:bg-brand/10 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {suggestingPrice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {T('ed_suggest_pricing')}
                  </button>
                ) : null}
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={adAskingPrice}
                onChange={(e) => {
                  setAdAskingPrice(e.target.value);
                  markDirty();
                }}
                className="input w-full"
                placeholder={T('ed_price_placeholder')}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={adShowPricePublic}
                onChange={(e) => {
                  setAdShowPricePublic(e.target.checked);
                  markDirty();
                }}
              />
              {T('ed_show_price_public')}
            </label>

            <a
              href={marketplaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-xs font-bold text-brand hover:underline"
            >
              {T('ed_dialog_open_marketplace')} →
            </a>
          </section>

          <p className="text-[10px] text-[var(--text2)] border-t border-[var(--border)] pt-4">{T('ed_dialog_scripts_save_note')}</p>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full py-2.5 rounded-xl font-bold border border-[var(--border)] hover:bg-[var(--bg2)] text-sm"
          >
            {T('ed_dialog_scripts_close')}
          </button>
        </div>
      </div>
    </div>
  );
}
