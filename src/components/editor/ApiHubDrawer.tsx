'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Link2, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

type Provider = {
  id: string;
  label: string;
  category: string;
  docsUrl: string;
  keyHint: string;
};

type Connection = {
  provider: string;
  is_active: boolean;
  updated_at?: string | null;
  last_checked_at?: string | null;
};

export function ApiHubDrawer() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [creativeProvider, setCreativeProvider] = useState('openai');
  const [creativePrompt, setCreativePrompt] = useState('');
  const [creativeContext, setCreativeContext] = useState('');
  const [creativeOut, setCreativeOut] = useState('');
  const [creativeBusy, setCreativeBusy] = useState(false);

  const connectedSet = useMemo(
    () => new Set(connections.filter((c) => c.is_active).map((c) => c.provider)),
    [connections],
  );
  const connectedTextProviders = useMemo(
    () => providers.filter((p) => connectedSet.has(p.id) && (p.category === 'text' || p.category === 'multi')),
    [providers, connectedSet],
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/byok/connections', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load API Hub');
      setProviders(Array.isArray(data.providers) ? data.providers : []);
      setConnections(Array.isArray(data.connections) ? data.connections : []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load API Hub');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);
  useEffect(() => {
    if (connectedTextProviders.length === 0) return;
    if (!connectedTextProviders.some((p) => p.id === creativeProvider)) {
      setCreativeProvider(connectedTextProviders[0].id);
    }
  }, [connectedTextProviders, creativeProvider]);

  const saveKey = async (provider: Provider) => {
    const key = (drafts[provider.id] || '').trim();
    if (!key) {
      toast.error('Please enter an API key');
      return;
    }
    setSavingProvider(provider.id);
    try {
      const res = await fetch('/api/byok/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider: provider.id, apiKey: key }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not save API key');
      setDrafts((prev) => ({ ...prev, [provider.id]: '' }));
      toast.success(`${provider.label} key saved`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save API key');
    } finally {
      setSavingProvider(null);
    }
  };

  const removeKey = async (provider: Provider) => {
    setSavingProvider(provider.id);
    try {
      const res = await fetch(`/api/byok/connections?provider=${encodeURIComponent(provider.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not remove API key');
      toast.success(`${provider.label} key removed`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove API key');
    } finally {
      setSavingProvider(null);
    }
  };

  const runCreative = async (mode: 'script' | 'seo') => {
    const p = creativePrompt.trim();
    if (!p) {
      toast.error('Write a prompt first');
      return;
    }
    if (!creativeProvider) {
      toast.error('Connect a text AI provider first');
      return;
    }
    setCreativeBusy(true);
    try {
      const res = await fetch('/api/byok/creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider: creativeProvider,
          mode,
          prompt: p,
          siteContext: creativeContext,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Generation failed');
      if (mode === 'seo') {
        setCreativeOut(JSON.stringify(data.data, null, 2));
      } else {
        setCreativeOut(String(data.text || ''));
      }
      toast.success(mode === 'seo' ? 'SEO pack generated' : 'Script generated');
    } catch (e: any) {
      toast.error(e?.message || 'Generation failed');
    } finally {
      setCreativeBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-20 z-40 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-xl"
        style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
      >
        <KeyRound className="w-4 h-4" />
        API Hub
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45" onClick={() => setOpen(false)}>
          <aside
            className="h-full w-full max-w-md bg-[var(--bg)] border-l border-[var(--border)] p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-[var(--text)]">API Hub (BYOK)</h3>
                <p className="text-xs text-[var(--text2)]">
                  Manage your own API keys in one place.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-[var(--bg2)] text-[var(--text2)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="py-14 flex items-center justify-center text-[var(--text2)]">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-300" />
                    <p className="text-sm font-bold text-[var(--text)]">Creative Assistant</p>
                  </div>
                  <p className="text-xs text-[var(--text2)]">
                    Generate ad scripts and SEO packs without leaving this tab.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="input text-xs"
                      value={creativeProvider}
                      onChange={(e) => setCreativeProvider(e.target.value)}
                    >
                      {connectedTextProviders.length === 0 ? (
                        <option value="">No text provider connected</option>
                      ) : connectedTextProviders.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    <input
                      className="input text-xs"
                      placeholder="Context: product/site/offer"
                      value={creativeContext}
                      onChange={(e) => setCreativeContext(e.target.value)}
                    />
                  </div>
                  <textarea
                    className="input text-xs min-h-20"
                    placeholder="Prompt: short video about..."
                    value={creativePrompt}
                    onChange={(e) => setCreativePrompt(e.target.value)}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={creativeBusy || connectedTextProviders.length === 0}
                      onClick={() => void runCreative('script')}
                      className="btn-primary text-xs gap-1.5"
                    >
                      {creativeBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Generate Script
                    </button>
                    <button
                      type="button"
                      disabled={creativeBusy || connectedTextProviders.length === 0}
                      onClick={() => void runCreative('seo')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-[var(--border)] text-[var(--text2)] disabled:opacity-40"
                    >
                      {creativeBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Generate SEO Pack
                    </button>
                    <button
                      type="button"
                      disabled={!creativeOut}
                      onClick={async () => {
                        await navigator.clipboard.writeText(creativeOut);
                        toast.success('Copied');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-[var(--border)] text-[var(--text2)] disabled:opacity-40"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>
                  {creativeOut ? (
                    <pre className="rounded-lg border border-[var(--border)] bg-black/30 p-2 text-[11px] text-zinc-200 overflow-auto max-h-56 whitespace-pre-wrap">
                      {creativeOut}
                    </pre>
                  ) : null}
                </div>

                {providers.map((p) => {
                  const connected = connectedSet.has(p.id);
                  const busy = savingProvider === p.id;
                  return (
                    <div key={p.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-[var(--text)]">{p.label}</p>
                          <p className="text-[11px] text-[var(--text2)] uppercase tracking-wide">{p.category}</p>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                            connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-300'
                          }`}
                        >
                          {connected ? 'Connected' : 'Not connected'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={p.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:underline"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Open provider console
                        </a>
                      </div>

                      <input
                        type="password"
                        className="input w-full font-mono text-xs"
                        placeholder={p.keyHint}
                        value={drafts[p.id] || ''}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void saveKey(p)}
                          disabled={busy}
                          className="btn-primary text-xs gap-1.5"
                        >
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          Save key
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeKey(p)}
                          disabled={busy || !connected}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-[var(--border)] text-[var(--text2)] disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

