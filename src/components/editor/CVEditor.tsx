'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bold, Italic, List, ListOrdered, Quote, Minus,
  Plus, Trash2, Lock, Unlock, GripVertical,
  Briefcase, GraduationCap, Code2, Globe, Award, Mail,
  Phone, ExternalLink, ChevronDown, ChevronUp, Save,
  Eye, EyeOff, Sun, Moon, Loader2, DollarSign, X,
  ArrowUp, ArrowDown, Link2, Star,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type SectionId = 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'languages' | 'certificates' | 'contact';

interface Experience { id: string; company: string; role: string; start: string; end: string; current: boolean; description: string; }
interface Education  { id: string; institution: string; degree: string; field: string; start: string; end: string; }
interface Project    { id: string; title: string; url: string; desc: string; year: string; }
interface Language   { id: string; lang: string; level: string; }
interface Certificate{ id: string; name: string; issuer: string; year: string; url: string; }

export interface CVData {
  show_cv: boolean;
  cv_free: boolean;
  cv_price: number;
  cv_headline: string;
  cv_location: string;
  cv_content: string;
  cv_skills: string[];
  cv_experience: Experience[];
  cv_education: Education[];
  cv_projects: Project[];
  cv_languages: Language[];
  cv_certificates: Certificate[];
  contact_email: string;
  cv_contact_whatsapp: string;
  cv_hire_price: number;
  cv_hire_currency: string;
  cv_hire_type: string;
  section_order: SectionId[];
}

const uid = () => Math.random().toString(36).slice(2, 9);

const SECTION_META: Record<SectionId, { label: string; icon: React.ReactNode; color: string }> = {
  summary:      { label: 'Resumo',              icon: <Star className="w-4 h-4" />,         color: '#818cf8' },
  experience:   { label: 'Experiência',          icon: <Briefcase className="w-4 h-4" />,    color: '#34d399' },
  education:    { label: 'Educação',             icon: <GraduationCap className="w-4 h-4" />,color: '#60a5fa' },
  skills:       { label: 'Skills',               icon: <Code2 className="w-4 h-4" />,        color: '#f472b6' },
  projects:     { label: 'Portfólio',            icon: <ExternalLink className="w-4 h-4" />, color: '#fbbf24' },
  languages:    { label: 'Idiomas',              icon: <Globe className="w-4 h-4" />,         color: '#22d3ee' },
  certificates: { label: 'Certificados',         icon: <Award className="w-4 h-4" />,        color: '#fb923c' },
  contact:      { label: 'Contato & Taxa',       icon: <Mail className="w-4 h-4" />,         color: '#a78bfa' },
};

const DEFAULT_ORDER: SectionId[] = ['summary','experience','education','skills','projects','languages','certificates','contact'];
const LEVELS     = ['Básico','Intermediário','Avançado','Fluente','Nativo'];
const CURRENCIES = ['BRL','USD','EUR','GBP'];
const HIRE_TYPES = ['hora','dia','semana','mês','projeto'];

// ─── Rich Text Toolbar ────────────────────────────────────────────────────────
function RichToolbar({ editor, dark }: { editor: any; dark: boolean }) {
  if (!editor) return null;
  const bg   = dark ? '#1e2030' : '#f1f5f9';
  const base = dark ? '#94a3b8' : '#64748b';
  const active = '#818cf8';
  const btn = (isActive: boolean, fn: () => void, child: React.ReactNode, tip: string) => (
    <button type="button" title={tip} onClick={fn}
      style={{
        padding: '5px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: isActive ? active : 'transparent',
        color: isActive ? '#fff' : base,
        transition: 'all .15s',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = dark ? '#2d3148' : '#e2e8f0'; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
      {child}
    </button>
  );
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '6px 10px', background: bg, borderBottom: `1px solid ${dark ? '#2d3148' : '#e2e8f0'}`, borderRadius: '12px 12px 0 0', alignItems: 'center' }}>
      {btn(editor.isActive('bold'),         () => editor.chain().focus().toggleBold().run(),           <Bold className="w-3.5 h-3.5" />,        'Negrito')}
      {btn(editor.isActive('italic'),       () => editor.chain().focus().toggleItalic().run(),         <Italic className="w-3.5 h-3.5" />,      'Itálico')}
      <div style={{ width: 1, height: 16, background: dark ? '#2d3148' : '#cbd5e1', margin: '0 4px' }} />
      {btn(editor.isActive('bulletList'),   () => editor.chain().focus().toggleBulletList().run(),     <List className="w-3.5 h-3.5" />,        'Lista')}
      {btn(editor.isActive('orderedList'),  () => editor.chain().focus().toggleOrderedList().run(),    <ListOrdered className="w-3.5 h-3.5" />, 'Lista num.')}
      <div style={{ width: 1, height: 16, background: dark ? '#2d3148' : '#cbd5e1', margin: '0 4px' }} />
      {btn(editor.isActive('blockquote'),   () => editor.chain().focus().toggleBlockquote().run(),     <Quote className="w-3.5 h-3.5" />,       'Citação')}
      {btn(false,                           () => editor.chain().focus().setHorizontalRule().run(),    <Minus className="w-3.5 h-3.5" />,       'Divisor')}
      <div style={{ width: 1, height: 16, background: dark ? '#2d3148' : '#cbd5e1', margin: '0 4px' }} />
      {btn(editor.isActive('heading',{level:2}), () => editor.chain().focus().toggleHeading({level:2}).run(), <span style={{fontSize:11,fontWeight:800}}>H2</span>, 'Título')}
      {btn(editor.isActive('heading',{level:3}), () => editor.chain().focus().toggleHeading({level:3}).run(), <span style={{fontSize:11,fontWeight:800}}>H3</span>, 'Subtítulo')}
    </div>
  );
}

function RichEditor({ value, onChange, dark, placeholder }: { value: string; onChange: (v: string) => void; dark: boolean; placeholder?: string }) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: placeholder || 'Escreva aqui...' })],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style: `min-height:80px; padding:12px 14px; outline:none; font-size:14px; line-height:1.7; color:${dark ? '#e2e8f0' : '#1e293b'}; font-family:system-ui,sans-serif;`,
      },
    },
  });
  const border = dark ? '#2d3148' : '#e2e8f0';
  const bg     = dark ? '#141626' : '#ffffff';
  return (
    <div style={{ border: `1.5px solid ${border}`, borderRadius: 12, overflow: 'hidden', background: bg, transition: 'border-color .2s' }}
      onFocus={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#818cf8'}
      onBlur={e  => (e.currentTarget as HTMLDivElement).style.borderColor = border}>
      <RichToolbar editor={editor} dark={dark} />
      <EditorContent editor={editor} />
    </div>
  );
}

// ─── Drag-and-drop section list ───────────────────────────────────────────────
function SectionOrderPanel({ order, onChange, dark }: { order: SectionId[]; onChange: (o: SectionId[]) => void; dark: boolean }) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver]         = useState<number | null>(null);
  const bg    = dark ? '#141626' : '#f8fafc';
  const card  = dark ? '#1e2030' : '#ffffff';
  const text  = dark ? '#e2e8f0' : '#1e293b';
  const muted = dark ? '#64748b' : '#94a3b8';
  const bord  = dark ? '#2d3148' : '#e2e8f0';

  const move = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  return (
    <div style={{ background: bg, borderRadius: 16, padding: 16, border: `1px solid ${bord}` }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>Ordem das seções — arraste para reordenar</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {order.map((sId, i) => {
          const meta = SECTION_META[sId];
          const isDragging = dragging === i;
          const isOver     = over === i;
          return (
            <div key={sId}
              draggable
              onDragStart={() => setDragging(i)}
              onDragOver={e => { e.preventDefault(); setOver(i); }}
              onDrop={() => {
                if (dragging === null || dragging === i) { setDragging(null); setOver(null); return; }
                const next = [...order];
                const [item] = next.splice(dragging, 1);
                next.splice(i, 0, item);
                onChange(next);
                setDragging(null); setOver(null);
              }}
              onDragEnd={() => { setDragging(null); setOver(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: isOver ? meta.color + '20' : card,
                border: `1.5px solid ${isOver ? meta.color : bord}`,
                borderRadius: 12, padding: '10px 14px',
                opacity: isDragging ? 0.4 : 1,
                cursor: 'grab', transition: 'all .15s',
                boxShadow: isOver ? `0 0 0 2px ${meta.color}40` : 'none',
              }}>
              <GripVertical style={{ width: 16, height: 16, color: muted, flexShrink: 0 }} />
              <span style={{ color: meta.color, display: 'flex', alignItems: 'center' }}>{meta.icon}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: text }}>{meta.label}</span>
              <span style={{ fontSize: 11, color: muted, background: dark ? '#0f1120' : '#f1f5f9', padding: '2px 8px', borderRadius: 999 }}>#{i + 1}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  style={{ padding: 4, borderRadius: 6, border: 'none', background: 'transparent', cursor: i === 0 ? 'not-allowed' : 'pointer', color: i === 0 ? muted : text, opacity: i === 0 ? 0.3 : 1 }}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1}
                  style={{ padding: 4, borderRadius: 6, border: 'none', background: 'transparent', cursor: i === order.length - 1 ? 'not-allowed' : 'pointer', color: i === order.length - 1 ? muted : text, opacity: i === order.length - 1 ? 0.3 : 1 }}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function CVSection({ sId, dark, children, defaultOpen = true }: { sId: SectionId; dark: boolean; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = SECTION_META[sId];
  const bg   = dark ? '#1e2030' : '#ffffff';
  const bord = dark ? '#2d3148' : '#e8edf5';
  const text = dark ? '#e2e8f0' : '#1e293b';
  const hd   = dark ? '#141626' : '#f8fafc';
  return (
    <div style={{ background: bg, border: `1.5px solid ${bord}`, borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '16px 20px', background: hd, border: 'none', cursor: 'pointer', borderBottom: open ? `1px solid ${bord}` : 'none', transition: 'background .15s' }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: meta.color + '20', border: `1.5px solid ${meta.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, flexShrink: 0 }}>
          {meta.icon}
        </span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: text, textAlign: 'left' }}>{meta.label}</span>
        {open ? <ChevronUp style={{ width: 16, height: 16, color: dark ? '#64748b' : '#94a3b8' }} /> : <ChevronDown style={{ width: 16, height: 16, color: dark ? '#64748b' : '#94a3b8' }} />}
      </button>
      {open && <div style={{ padding: '20px 20px 24px' }}>{children}</div>}
    </div>
  );
}

// ─── Input helper ────────────────────────────────────────────────────────────
function Field({ label, dark, children }: { label: string; dark: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: dark ? '#94a3b8' : '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ dark, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { dark: boolean }) {
  const bg   = dark ? '#141626' : '#f8fafc';
  const bord = dark ? '#2d3148' : '#e2e8f0';
  const text = dark ? '#e2e8f0' : '#1e293b';
  return (
    <input {...props}
      style={{ width: '100%', background: bg, border: `1.5px solid ${bord}`, borderRadius: 10, padding: '9px 12px', color: text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui', transition: 'border-color .15s', ...props.style }}
      onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = '#818cf8'}
      onBlur={e  => (e.currentTarget as HTMLInputElement).style.borderColor = bord} />
  );
}

function Select({ dark, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { dark: boolean }) {
  const bg   = dark ? '#141626' : '#f8fafc';
  const bord = dark ? '#2d3148' : '#e2e8f0';
  const text = dark ? '#e2e8f0' : '#1e293b';
  return (
    <select {...props}
      style={{ width: '100%', background: bg, border: `1.5px solid ${bord}`, borderRadius: 10, padding: '9px 12px', color: text, fontSize: 14, outline: 'none', boxSizing: 'border-box', cursor: 'pointer', ...props.style }}>
      {children}
    </select>
  );
}

// ─── Primary / secondary button styles ───────────────────────────────────────
const btnPrimary = (dark: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
  color: '#fff', border: 'none', borderRadius: 12,
  padding: '11px 22px', fontSize: 14, fontWeight: 700,
  cursor: 'pointer', boxShadow: '0 4px 18px #6366f140',
  transition: 'all .15s',
});
const btnSecondary = (dark: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  background: dark ? '#1e2030' : '#f1f5f9',
  color: dark ? '#e2e8f0' : '#475569',
  border: `1.5px solid ${dark ? '#2d3148' : '#e2e8f0'}`,
  borderRadius: 12, padding: '10px 18px', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', transition: 'all .15s',
});
const btnDanger = (dark: boolean): React.CSSProperties => ({
  ...btnSecondary(dark), color: '#f87171', borderColor: '#f8717140', background: '#f8717110',
});
const btnIcon = (dark: boolean, active = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 34, height: 34, borderRadius: 9, border: 'none',
  background: active ? '#818cf820' : 'transparent',
  color: active ? '#818cf8' : dark ? '#64748b' : '#94a3b8',
  cursor: 'pointer', transition: 'all .15s', flexShrink: 0,
});

// ─── Main CV Editor ───────────────────────────────────────────────────────────
interface CVEditorProps {
  data: CVData;
  onChange: (d: Partial<CVData>) => void;
  onSave: () => Promise<void>;
  saving?: boolean;
}

export function CVEditor({ data, onChange, onSave, saving = false }: CVEditorProps) {
  const [dark, setDark]       = useState(true);
  const [preview, setPreview] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const order = data.section_order?.length ? data.section_order : [...DEFAULT_ORDER];

  const bg    = dark ? '#0f1120' : '#f0f4ff';
  const card  = dark ? '#1e2030' : '#ffffff';
  const text  = dark ? '#e2e8f0' : '#1e293b';
  const muted = dark ? '#64748b' : '#94a3b8';
  const bord  = dark ? '#2d3148' : '#e2e8f0';

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s || data.cv_skills.includes(s)) return;
    onChange({ cv_skills: [...data.cv_skills, s] });
    setSkillInput('');
  };

  const addItem = (key: keyof CVData, blank: Record<string, any>) =>
    onChange({ [key]: [...((data[key] as any[]) || []), { id: uid(), ...blank }] } as any);
  const updateItem = (key: keyof CVData, id: string, patch: Record<string, any>) =>
    onChange({ [key]: ((data[key] as any[]) || []).map((x: any) => x.id === id ? { ...x, ...patch } : x) } as any);
  const deleteItem = (key: keyof CVData, id: string) =>
    onChange({ [key]: ((data[key] as any[]) || []).filter((x: any) => x.id !== id) } as any);

  // ── Section renderers ──────────────────────────────────────────────────────
  const renderSection = (sId: SectionId) => {
    if (sId === 'summary') return (
      <CVSection key={sId} sId={sId} dark={dark}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <Field label="Headline" dark={dark}>
            <Input dark={dark} value={data.cv_headline} onChange={e => onChange({ cv_headline: e.target.value })} placeholder="Full Stack Dev | 5 anos" />
          </Field>
          <Field label="Localização" dark={dark}>
            <Input dark={dark} value={data.cv_location} onChange={e => onChange({ cv_location: e.target.value })} placeholder="São Paulo, SP — Remoto" />
          </Field>
        </div>
        <Field label="Resumo profissional" dark={dark}>
          <RichEditor dark={dark} value={data.cv_content} onChange={v => onChange({ cv_content: v })} placeholder="Fale sobre você, trajetória, diferenciais..." />
        </Field>
      </CVSection>
    );

    if (sId === 'experience') return (
      <CVSection key={sId} sId={sId} dark={dark}>
        {(data.cv_experience || []).map((exp, idx) => (
          <div key={exp.id} style={{ border: `1px solid ${bord}`, borderRadius: 14, padding: 16, marginBottom: 14, background: dark ? '#141626' : '#f8fafc', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: muted }}>#{idx + 1}</span>
              <button type="button" style={btnDanger(dark)} onClick={() => deleteItem('cv_experience', exp.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <Field label="Empresa" dark={dark}><Input dark={dark} value={exp.company} onChange={e => updateItem('cv_experience', exp.id, { company: e.target.value })} placeholder="Google" /></Field>
              <Field label="Cargo" dark={dark}><Input dark={dark} value={exp.role} onChange={e => updateItem('cv_experience', exp.id, { role: e.target.value })} placeholder="Engenheiro Sênior" /></Field>
              <Field label="Início" dark={dark}><Input dark={dark} type="month" value={exp.start} onChange={e => updateItem('cv_experience', exp.id, { start: e.target.value })} /></Field>
              <Field label="Fim" dark={dark}>
                <Input dark={dark} type="month" value={exp.end} disabled={exp.current} onChange={e => updateItem('cv_experience', exp.id, { end: e.target.value })} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer', fontSize: 12, color: muted }}>
                  <input type="checkbox" checked={exp.current} onChange={e => updateItem('cv_experience', exp.id, { current: e.target.checked, end: '' })} /> Trabalho atual
                </label>
              </Field>
            </div>
            <Field label="Descrição" dark={dark}>
              <RichEditor dark={dark} value={exp.description} onChange={v => updateItem('cv_experience', exp.id, { description: v })} placeholder="Responsabilidades e conquistas..." />
            </Field>
          </div>
        ))}
        <button type="button" style={btnSecondary(dark)} onClick={() => addItem('cv_experience', { company: '', role: '', start: '', end: '', current: false, description: '' })}>
          <Plus className="w-4 h-4" /> Adicionar experiência
        </button>
      </CVSection>
    );

    if (sId === 'education') return (
      <CVSection key={sId} sId={sId} dark={dark} defaultOpen={false}>
        {(data.cv_education || []).map((edu, idx) => (
          <div key={edu.id} style={{ border: `1px solid ${bord}`, borderRadius: 14, padding: 16, marginBottom: 14, background: dark ? '#141626' : '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: muted }}>#{idx + 1}</span>
              <button type="button" style={btnDanger(dark)} onClick={() => deleteItem('cv_education', edu.id)}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Instituição" dark={dark}><Input dark={dark} value={edu.institution} onChange={e => updateItem('cv_education', edu.id, { institution: e.target.value })} placeholder="USP" /></Field>
              <Field label="Grau" dark={dark}>
                <Select dark={dark} value={edu.degree} onChange={e => updateItem('cv_education', edu.id, { degree: e.target.value })}>
                  {['', 'Técnico','Graduação','Pós-graduação','MBA','Mestrado','Doutorado','Bootcamp','Curso livre'].map(d => <option key={d} value={d}>{d || 'Selecionar'}</option>)}
                </Select>
              </Field>
              <Field label="Área" dark={dark}><Input dark={dark} value={edu.field} onChange={e => updateItem('cv_education', edu.id, { field: e.target.value })} placeholder="Ciência da Computação" /></Field>
              <Field label="Período" dark={dark}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input dark={dark} type="month" value={edu.start} onChange={e => updateItem('cv_education', edu.id, { start: e.target.value })} style={{ flex: 1 }} />
                  <Input dark={dark} type="month" value={edu.end} onChange={e => updateItem('cv_education', edu.id, { end: e.target.value })} style={{ flex: 1 }} />
                </div>
              </Field>
            </div>
          </div>
        ))}
        <button type="button" style={btnSecondary(dark)} onClick={() => addItem('cv_education', { institution: '', degree: '', field: '', start: '', end: '' })}>
          <Plus className="w-4 h-4" /> Adicionar formação
        </button>
      </CVSection>
    );

    if (sId === 'skills') return (
      <CVSection key={sId} sId={sId} dark={dark}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, minHeight: 40 }}>
          {data.cv_skills.map(sk => (
            <span key={sk} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#818cf820', color: '#818cf8', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: '1px solid #818cf840' }}>
              {sk}
              <button type="button" onClick={() => onChange({ cv_skills: data.cv_skills.filter(s => s !== sk) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', lineHeight: 1, padding: 0, display: 'flex' }}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {data.cv_skills.length === 0 && <span style={{ color: muted, fontSize: 13 }}>Nenhuma skill adicionada ainda</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input dark={dark} value={skillInput} onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
            placeholder="Ex: React, TypeScript, Python... (Enter para adicionar)" style={{ flex: 1 }} />
          <button type="button" style={btnPrimary(dark)} onClick={addSkill}><Plus className="w-4 h-4" /></button>
        </div>
      </CVSection>
    );

    if (sId === 'projects') return (
      <CVSection key={sId} sId={sId} dark={dark} defaultOpen={false}>
        {(data.cv_projects || []).map((proj, idx) => (
          <div key={proj.id} style={{ border: `1px solid ${bord}`, borderRadius: 14, padding: 16, marginBottom: 14, background: dark ? '#141626' : '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: muted }}>#{idx + 1}</span>
              <button type="button" style={btnDanger(dark)} onClick={() => deleteItem('cv_projects', proj.id)}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 10 }}>
              <Field label="Nome" dark={dark}><Input dark={dark} value={proj.title} onChange={e => updateItem('cv_projects', proj.id, { title: e.target.value })} placeholder="App de vendas" /></Field>
              <Field label="Ano" dark={dark}><Input dark={dark} value={proj.year} onChange={e => updateItem('cv_projects', proj.id, { year: e.target.value })} placeholder="2024" maxLength={4} /></Field>
            </div>
            <Field label="URL" dark={dark}><Input dark={dark} value={proj.url} onChange={e => updateItem('cv_projects', proj.id, { url: e.target.value })} placeholder="https://..." /></Field>
            <Field label="Descrição" dark={dark}>
              <textarea value={proj.desc} onChange={e => updateItem('cv_projects', proj.id, { desc: e.target.value })}
                placeholder="O que é, tecnologias usadas..." rows={2}
                style={{ width: '100%', background: dark ? '#141626' : '#f8fafc', border: `1.5px solid ${bord}`, borderRadius: 10, padding: '9px 12px', color: text, fontSize: 14, resize: 'vertical', fontFamily: 'system-ui', boxSizing: 'border-box', outline: 'none' }} />
            </Field>
          </div>
        ))}
        <button type="button" style={btnSecondary(dark)} onClick={() => addItem('cv_projects', { title: '', url: '', desc: '', year: '' })}>
          <Plus className="w-4 h-4" /> Adicionar projeto
        </button>
      </CVSection>
    );

    if (sId === 'languages') return (
      <CVSection key={sId} sId={sId} dark={dark} defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {(data.cv_languages || []).map(l => (
            <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Input dark={dark} value={l.lang} onChange={e => updateItem('cv_languages', l.id, { lang: e.target.value })} placeholder="Ex: Inglês" style={{ flex: 1 }} />
              <Select dark={dark} value={l.level} onChange={e => updateItem('cv_languages', l.id, { level: e.target.value })} style={{ width: 160 }}>
                {LEVELS.map(lv => <option key={lv}>{lv}</option>)}
              </Select>
              <button type="button" style={btnDanger(dark)} onClick={() => deleteItem('cv_languages', l.id)}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <button type="button" style={btnSecondary(dark)} onClick={() => addItem('cv_languages', { lang: '', level: 'Intermediário' })}>
          <Plus className="w-4 h-4" /> Adicionar idioma
        </button>
      </CVSection>
    );

    if (sId === 'certificates') return (
      <CVSection key={sId} sId={sId} dark={dark} defaultOpen={false}>
        {(data.cv_certificates || []).map((c, idx) => (
          <div key={c.id} style={{ border: `1px solid ${bord}`, borderRadius: 14, padding: 16, marginBottom: 14, background: dark ? '#141626' : '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: muted }}>#{idx + 1}</span>
              <button type="button" style={btnDanger(dark)} onClick={() => deleteItem('cv_certificates', c.id)}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Nome" dark={dark}><Input dark={dark} value={c.name} onChange={e => updateItem('cv_certificates', c.id, { name: e.target.value })} placeholder="AWS Solutions Architect" /></Field>
              <Field label="Emissor" dark={dark}><Input dark={dark} value={c.issuer} onChange={e => updateItem('cv_certificates', c.id, { issuer: e.target.value })} placeholder="Amazon" /></Field>
              <Field label="Ano" dark={dark}><Input dark={dark} value={c.year} onChange={e => updateItem('cv_certificates', c.id, { year: e.target.value })} placeholder="2024" maxLength={4} /></Field>
              <Field label="URL (verificação)" dark={dark}><Input dark={dark} value={c.url} onChange={e => updateItem('cv_certificates', c.id, { url: e.target.value })} placeholder="https://..." /></Field>
            </div>
          </div>
        ))}
        <button type="button" style={btnSecondary(dark)} onClick={() => addItem('cv_certificates', { name: '', issuer: '', year: '', url: '' })}>
          <Plus className="w-4 h-4" /> Adicionar certificado
        </button>
      </CVSection>
    );

    if (sId === 'contact') return (
      <CVSection key={sId} sId={sId} dark={dark} defaultOpen={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Field label="Email" dark={dark}><Input dark={dark} type="email" value={data.contact_email} onChange={e => onChange({ contact_email: e.target.value })} placeholder="seu@email.com" /></Field>
          <Field label="WhatsApp" dark={dark}><Input dark={dark} value={data.cv_contact_whatsapp} onChange={e => onChange({ cv_contact_whatsapp: e.target.value })} placeholder="+55 11 9xxxx-xxxx" /></Field>
        </div>
        <div style={{ borderTop: `1px solid ${bord}`, paddingTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>Taxa de contratação (exibida publicamente)</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Select dark={dark} value={data.cv_hire_currency} onChange={e => onChange({ cv_hire_currency: e.target.value })} style={{ width: 90 }}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Input dark={dark} type="number" min={0} value={data.cv_hire_price} onChange={e => onChange({ cv_hire_price: parseFloat(e.target.value) || 0 })} placeholder="150" style={{ flex: 1 }} />
            <Select dark={dark} value={data.cv_hire_type} onChange={e => onChange({ cv_hire_type: e.target.value })} style={{ width: 120 }}>
              {HIRE_TYPES.map(t => <option key={t} value={t}>por {t}</option>)}
            </Select>
          </div>
          {data.cv_hire_price > 0 && (
            <p style={{ fontSize: 12, color: muted, marginTop: 8 }}>
              Exibido como: <strong style={{ color: text }}>{data.cv_hire_currency} {data.cv_hire_price} por {data.cv_hire_type}</strong>
            </p>
          )}
        </div>
      </CVSection>
    );
    return null;
  };

  if (preview) return (
    <div style={{ background: bg, minHeight: '100vh', padding: 32 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: text, fontWeight: 900, fontSize: 20, margin: 0 }}>Preview do CV</h2>
          <button type="button" style={btnSecondary(dark)} onClick={() => setPreview(false)}>
            <EyeOff className="w-4 h-4" /> Voltar ao editor
          </button>
        </div>
        <CVView data={data} accentColor="#818cf8" />
      </div>
    </div>
  );

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif', transition: 'background .3s' }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: dark ? '#0f1120ee' : '#f0f4ffee', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${bord}`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: text }}>Editor de CV</h1>
          <p style={{ margin: 0, fontSize: 12, color: muted }}>Drag & drop para reordenar seções</p>
        </div>

        {/* Lock toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, background: data.cv_free ? '#34d39920' : '#f59e0b20', border: `1.5px solid ${data.cv_free ? '#34d39940' : '#f59e0b40'}` }}>
          {data.cv_free
            ? <Unlock style={{ width: 15, height: 15, color: '#34d399' }} />
            : <Lock style={{ width: 15, height: 15, color: '#f59e0b' }} />}
          <button type="button" onClick={() => onChange({ cv_free: !data.cv_free })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: data.cv_free ? '#34d399' : '#f59e0b', padding: 0 }}>
            {data.cv_free ? 'CV Gratuito' : `CV Pago $${data.cv_price || '?'}`}
          </button>
          {!data.cv_free && (
            <Input dark={dark} type="number" min={0} step={0.5} value={data.cv_price}
              onChange={e => onChange({ cv_price: parseFloat(e.target.value) || 0 })}
              placeholder="Preço USDC" style={{ width: 90, padding: '4px 8px', fontSize: 13 }} />
          )}
        </div>

        {/* Show/hide toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: muted }}>No perfil</span>
          <div onClick={() => onChange({ show_cv: !data.show_cv })}
            style={{ width: 44, height: 24, borderRadius: 999, background: data.show_cv ? '#6366f1' : dark ? '#2d3148' : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.3)', transition: 'left .2s', left: data.show_cv ? 23 : 3 }} />
          </div>
        </div>

        {/* Dark/light */}
        <button type="button" onClick={() => setDark(d => !d)}
          style={{ ...btnSecondary(dark), padding: '8px 12px' }}>
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Preview */}
        <button type="button" style={btnSecondary(dark)} onClick={() => setPreview(true)}>
          <Eye className="w-4 h-4" /> Preview
        </button>

        {/* Save */}
        <button type="button" style={btnPrimary(dark)} onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar CV'}
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
        {/* Left: sections */}
        <div>
          {order.map(sId => renderSection(sId))}
        </div>

        {/* Right: sidebar */}
        <div style={{ position: 'sticky', top: 88, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionOrderPanel order={order} onChange={o => onChange({ section_order: o })} dark={dark} />

          {/* Quick stats */}
          <div style={{ background: dark ? '#1e2030' : '#fff', border: `1.5px solid ${bord}`, borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>Resumo</p>
            {[
              { label: 'Experiências',   val: data.cv_experience?.length || 0, color: '#34d399' },
              { label: 'Formações',      val: data.cv_education?.length || 0,  color: '#60a5fa' },
              { label: 'Skills',         val: data.cv_skills?.length || 0,     color: '#f472b6' },
              { label: 'Projetos',       val: data.cv_projects?.length || 0,   color: '#fbbf24' },
              { label: 'Idiomas',        val: data.cv_languages?.length || 0,  color: '#22d3ee' },
              { label: 'Certificados',   val: data.cv_certificates?.length || 0, color: '#fb923c' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: muted }}>{s.label}</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: s.val > 0 ? s.color : muted }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CV Public Viewer ─────────────────────────────────────────────────────────
export function CVView({ data, accentColor = '#818cf8' }: { data: CVData; accentColor?: string }) {
  const dim = accentColor + '22';
  const Sec = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${dim}` }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--tb-text,#fff)', fontFamily: 'var(--tb-font-display,inherit)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );

  const order: SectionId[] = data.section_order?.length ? data.section_order : [...DEFAULT_ORDER];

  const renderPublicSection = (sId: SectionId) => {
    if (sId === 'summary' && (data.cv_content || data.cv_headline || data.cv_location)) return (
      <div key={sId} style={{ marginBottom: 28 }}>
        {data.cv_headline && <p style={{ fontSize: 20, fontWeight: 800, color: accentColor, margin: '0 0 4px' }}>{data.cv_headline}</p>}
        {data.cv_location && <p style={{ fontSize: 13, color: 'var(--tb-text2,#8b949e)', margin: '0 0 14px' }}>📍 {data.cv_location}</p>}
        {data.cv_hire_price > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: dim, border: `1px solid ${accentColor}40`, borderRadius: 999, padding: '5px 14px', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>{data.cv_hire_currency} {data.cv_hire_price} por {data.cv_hire_type}</span>
          </div>
        )}
        {data.cv_content && <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--tb-text2,#8b949e)' }} dangerouslySetInnerHTML={{ __html: data.cv_content }} />}
      </div>
    );
    if (sId === 'skills' && data.cv_skills?.length) return (
      <Sec key={sId} title="Skills" icon="⚡">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {data.cv_skills.map(sk => <span key={sk} style={{ background: dim, color: accentColor, padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: `1px solid ${accentColor}30` }}>{sk}</span>)}
        </div>
      </Sec>
    );
    if (sId === 'experience' && data.cv_experience?.length) return (
      <Sec key={sId} title="Experiência" icon="💼">
        {data.cv_experience.map((exp, i) => (
          <div key={exp.id || i} style={{ marginBottom: 22, paddingLeft: 16, borderLeft: `2px solid ${accentColor}50` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: 'var(--tb-text,#fff)' }}>{exp.role}</p>
                <p style={{ fontSize: 14, color: accentColor, margin: '2px 0 0', fontWeight: 600 }}>{exp.company}</p>
              </div>
              <span style={{ fontSize: 12, color: 'var(--tb-text2,#8b949e)', background: 'var(--tb-bg3,#1a1a1a)', padding: '3px 10px', borderRadius: 999 }}>{exp.start} — {exp.current ? 'Atual' : exp.end}</span>
            </div>
            {exp.description && <div style={{ fontSize: 14, color: 'var(--tb-text2,#8b949e)', lineHeight: 1.65, marginTop: 8 }} dangerouslySetInnerHTML={{ __html: exp.description }} />}
          </div>
        ))}
      </Sec>
    );
    if (sId === 'education' && data.cv_education?.length) return (
      <Sec key={sId} title="Educação" icon="🎓">
        {data.cv_education.map((edu, i) => (
          <div key={edu.id || i} style={{ marginBottom: 16, paddingLeft: 16, borderLeft: `2px solid ${accentColor}50` }}>
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: 'var(--tb-text,#fff)' }}>{edu.degree}{edu.field ? ` em ${edu.field}` : ''}</p>
            <p style={{ fontSize: 13, color: accentColor, margin: '2px 0 0' }}>{edu.institution}</p>
            {(edu.start || edu.end) && <p style={{ fontSize: 12, color: 'var(--tb-text2,#8b949e)', margin: '2px 0 0' }}>{edu.start}{edu.end ? ` — ${edu.end}` : ''}</p>}
          </div>
        ))}
      </Sec>
    );
    if (sId === 'projects' && data.cv_projects?.length) return (
      <Sec key={sId} title="Portfólio" icon="🚀">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {data.cv_projects.map((p, i) => (
            <a key={p.id || i} href={p.url || '#'} target="_blank" rel="noopener" style={{ display: 'block', background: 'var(--tb-bg3,#1a1a1a)', border: `1px solid var(--tb-border,#333)`, borderRadius: 14, padding: 16, textDecoration: 'none', transition: 'border-color .2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--tb-text,#fff)', margin: 0 }}>{p.title}</p>
                {p.year && <span style={{ fontSize: 11, color: 'var(--tb-text2,#8b949e)' }}>{p.year}</span>}
              </div>
              {p.desc && <p style={{ fontSize: 13, color: 'var(--tb-text2,#8b949e)', margin: 0, lineHeight: 1.5 }}>{p.desc}</p>}
              {p.url && <p style={{ fontSize: 12, color: accentColor, marginTop: 8, marginBottom: 0 }}>↗ Ver projeto</p>}
            </a>
          ))}
        </div>
      </Sec>
    );
    if (sId === 'languages' && data.cv_languages?.length) return (
      <Sec key={sId} title="Idiomas" icon="🌐">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {data.cv_languages.map((l, i) => (
            <div key={l.id || i} style={{ background: 'var(--tb-bg3,#1a1a1a)', border: `1px solid var(--tb-border,#333)`, borderRadius: 12, padding: '10px 16px' }}>
              <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: 'var(--tb-text,#fff)' }}>{l.lang}</p>
              <p style={{ fontSize: 12, color: accentColor, margin: '2px 0 0' }}>{l.level}</p>
            </div>
          ))}
        </div>
      </Sec>
    );
    if (sId === 'certificates' && data.cv_certificates?.length) return (
      <Sec key={sId} title="Certificados" icon="🏆">
        {data.cv_certificates.map((c, i) => (
          <div key={c.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '12px 16px', background: 'var(--tb-bg3,#1a1a1a)', border: `1px solid var(--tb-border,#333)`, borderRadius: 12 }}>
            <span style={{ fontSize: 22 }}>🏅</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: 'var(--tb-text,#fff)' }}>{c.name}</p>
              <p style={{ fontSize: 12, color: 'var(--tb-text2,#8b949e)', margin: '2px 0 0' }}>{c.issuer} · {c.year}</p>
            </div>
            {c.url && <a href={c.url} target="_blank" rel="noopener" style={{ color: accentColor, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Ver ↗</a>}
          </div>
        ))}
      </Sec>
    );
    if (sId === 'contact' && (data.contact_email || data.cv_contact_whatsapp)) return (
      <Sec key={sId} title="Contato" icon="✉️">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {data.contact_email && <a href={`mailto:${data.contact_email}`} style={{ display: 'flex', alignItems: 'center', gap: 7, background: dim, color: accentColor, padding: '10px 18px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: `1px solid ${accentColor}30` }}>✉️ {data.contact_email}</a>}
          {data.cv_contact_whatsapp && <a href={`https://wa.me/${data.cv_contact_whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#25d36618', color: '#25d366', padding: '10px 18px', borderRadius: 999, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid #25d36640' }}>💬 WhatsApp</a>}
        </div>
      </Sec>
    );
    return null;
  };

  return (
    <div style={{ fontFamily: 'var(--tb-font,system-ui)', color: 'var(--tb-text,#fff)', lineHeight: 1.6 }}>
      {order.map(sId => renderPublicSection(sId))}
    </div>
  );
}
