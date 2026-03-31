'use client';
import { useRef, useState, useEffect } from 'react';
import { Bold, Italic, List, Heading1, Heading2, Video, Link2, Quote, Code, Image as ImgIcon, X, Loader2, Highlighter, Palette, StickyNote } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function RichTextEditor({ value, onChange, placeholder }: any) {
  const editorRef  = useRef<HTMLDivElement>(null);
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedUrl, setEmbedUrl]   = useState('');
  const [uploading, setUploading] = useState(false);

  // Sync only on mount — avoids focus loss on every keystroke
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, []); // eslint-disable-line

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const applyHighlight = (color: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const text = sel.toString();
    if (!text) return;
    const html = `<mark style="background:${color};color:inherit;padding:0 2px;border-radius:2px;">${text}</mark>`;
    document.execCommand('insertHTML', false, html);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  // Strip formatting on paste — clean HTML
  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const insertVideo = () => {
    if (!embedUrl) return;
    let url = embedUrl;
    // Auto-convert YouTube watch → embed
    const yt = url.match(/(?:(?:www|m|music)\.)?youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/([A-Za-z0-9_-]{6,})/);
    const ytId = yt?.[1] || url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{6,})/)?.[1];
    if (ytId) {
      url = `https://www.youtube.com/embed/${ytId}`;
    } else if (url.includes('vimeo.com/')) {
      const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
      if (id) url = `https://player.vimeo.com/video/${id}`;
    }
    const html = `<div class="trust-video-wrapper" style="position:relative;padding-bottom:56.25%;height:0;margin:20px 0;border-radius:16px;overflow:hidden;">
      <iframe src="${url}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" frameborder="0" allowfullscreen></iframe>
    </div><p><br></p>`;
    document.execCommand('insertHTML', false, html);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
    setShowEmbed(false);
    setEmbedUrl('');
  };

  const insertPaperBlock = (kind: 'yellow' | 'white' | 'map' | 'dark') => {
    const map: Record<string, string> = {
      yellow: '<div class="tb-paper tb-paper-yellow"><p><br></p></div><p><br></p>',
      white: '<div class="tb-paper tb-paper-white"><p><br></p></div><p><br></p>',
      map: '<div class="tb-paper tb-paper-map"><p><br></p></div><p><br></p>',
      dark: '<div class="tb-paper tb-paper-dark"><p><br></p></div><p><br></p>',
    };
    document.execCommand('insertHTML', false, map[kind]);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const path = `${session?.user?.id}/pages/${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('platform-assets').upload(path, file, { upsert: true });
      const url = supabase.storage.from('platform-assets').getPublicUrl(path).data.publicUrl;
      document.execCommand('insertHTML', false, `<img src="${url}" style="max-width:100%;border-radius:10px;margin:8px 0;display:block;" />`);
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    } catch {}
    setUploading(false);
  };

  return (
    <div className="border border-[var(--border)] rounded-2xl bg-[var(--bg2)] overflow-hidden transition-all focus-within:border-brand/40">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-[var(--bg)] border-b border-[var(--border)] sticky top-0 z-10">
        <button onClick={() => exec('bold')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-[var(--text)]"><Bold size={16}/></button>
        <button onClick={() => exec('italic')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-[var(--text)]"><Italic size={16}/></button>
        <button onClick={() => exec('formatBlock','h1')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-[var(--text)]"><Heading1 size={16}/></button>
        <button onClick={() => exec('formatBlock','h2')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-[var(--text)]"><Heading2 size={16}/></button>
        <button onClick={() => exec('insertUnorderedList')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-[var(--text)]"><List size={16}/></button>
        <button onClick={() => exec('formatBlock','blockquote')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-[var(--text)]"><Quote size={16}/></button>
        <button onClick={() => exec('formatBlock','pre')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-[var(--text)]"><Code size={16}/></button>
        <button title="Highlight yellow" onClick={() => applyHighlight('#fde047')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-yellow-400"><Highlighter size={16}/></button>
        <button title="Highlight pink" onClick={() => applyHighlight('#f9a8d4')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-pink-400"><Highlighter size={16}/></button>
        <button title="Dark text" onClick={() => exec('foreColor','#111827')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-[var(--text)]"><Palette size={16}/></button>
        <button title="Light text" onClick={() => exec('foreColor','#f8fafc')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-[var(--text)]"><Palette size={16}/></button>
        <button title="Notebook paper" onClick={() => insertPaperBlock('yellow')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-amber-400"><StickyNote size={16}/></button>
        <button title="White paper" onClick={() => insertPaperBlock('white')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-slate-300"><StickyNote size={16}/></button>
        <button title="Map paper" onClick={() => insertPaperBlock('map')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-emerald-400"><StickyNote size={16}/></button>
        <button title="Dark paper" onClick={() => insertPaperBlock('dark')} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-violet-400"><StickyNote size={16}/></button>
        <button onClick={() => setShowEmbed(true)} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-blue-400"><Video size={16}/></button>
        <label className="p-2 hover:bg-[var(--bg2)] rounded-lg text-[var(--text2)] cursor-pointer">
          {uploading ? <Loader2 size={16} className="animate-spin"/> : <ImgIcon size={16}/>}
          <input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) uploadImage(f); }}/>
        </label>
      </div>

      {/* Editable area — direction:ltr fixes RTL text bug */}
      <div
        ref={editorRef}
        contentEditable
        dir="ltr"
        onInput={e => onChange(e.currentTarget.innerHTML)}
        onPaste={onPaste}
        className="p-5 min-h-[280px] outline-none text-[var(--text)] prose prose-invert max-w-none"
        style={{ fontSize:'15px', lineHeight:'1.75', direction:'ltr', textAlign:'left' }}
        data-placeholder={placeholder}
      />

      {/* Embed modal */}
      {showEmbed && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-[#1d2128] p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-black text-xl">Embed Video</h3>
              <button onClick={() => setShowEmbed(false)} className="text-white/40 hover:text-white"><X size={20}/></button>
            </div>
            <p className="text-gray-400 text-sm mb-5">YouTube or Vimeo — URL auto-converted</p>
            <input
              value={embedUrl}
              onChange={e => setEmbedUrl(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') insertVideo(); }}
              className="w-full p-4 bg-black/50 border border-[#30363d] rounded-2xl text-white mb-5 focus:border-blue-500 outline-none text-sm"
              placeholder="https://youtube.com/watch?v=..."
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={insertVideo} className="flex-1 bg-white text-black py-4 rounded-2xl font-black hover:bg-gray-200 transition-colors">
                EMBED VIDEO
              </button>
              <button onClick={() => setShowEmbed(false)} className="px-6 py-4 text-gray-400 font-bold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        [contenteditable]:empty:before{content:attr(data-placeholder);color:var(--text2);opacity:.4;pointer-events:none;}
        [contenteditable] h1{font-size:26px;font-weight:900;margin:16px 0 8px;line-height:1.2;}
        [contenteditable] h2{font-size:20px;font-weight:800;margin:14px 0 6px;}
        [contenteditable] blockquote{border-left:3px solid var(--accent,#818cf8);padding-left:14px;margin:12px 0;opacity:.8;font-style:italic;}
        [contenteditable] pre{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;font-family:monospace;font-size:13px;overflow-x:auto;}
        [contenteditable] ul,[contenteditable] ol{padding-left:22px;margin:8px 0;}
        [contenteditable] a{color:var(--accent,#818cf8);text-decoration:underline;}
        [contenteditable] img{max-width:100%;border-radius:10px;display:block;margin:8px 0;}
        [contenteditable] .trust-video-wrapper iframe{border-radius:16px;}
        [contenteditable] .tb-paper{padding:14px 16px;border-radius:12px;margin:10px 0;border:1px solid rgba(255,255,255,.15);}
        [contenteditable] .tb-paper-yellow{
          background:
            repeating-linear-gradient(180deg, rgba(180,83,9,.12) 0 1px, transparent 1px 28px),
            linear-gradient(180deg,#fef3c7,#fde68a);
          color:#5b3a09;
        }
        [contenteditable] .tb-paper-white{background:#ffffff;color:#111827;border-color:#d1d5db;}
        [contenteditable] .tb-paper-map{
          background:
            radial-gradient(circle at 20% 30%, rgba(56,189,248,.25), transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(251,113,133,.25), transparent 45%),
            linear-gradient(135deg,#ecfeff,#f0fdf4,#fff7ed);
          color:#134e4a;
          border-color:#99f6e4;
        }
        [contenteditable] .tb-paper-dark{
          background:linear-gradient(135deg,#0f172a,#1e1b4b);
          color:#e2e8f0;
          border-color:#4f46e5;
        }
      `}</style>
    </div>
  );
}
