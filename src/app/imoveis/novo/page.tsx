'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/r2';
import { useAuth } from '@/hooks/useAuth';
import { useMySite } from '@/hooks/useSite';
import { useCart } from '@/store/cart';
import { Home, Upload, X, Plus, MapPin, DollarSign, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const REGIONS = ['Americas','Europe','Asia','Africa','Oceania','Middle East'];
const TIPOS   = ['Apartamento','Casa','Comercial','Terreno','Studio','Fazenda','Outro'];
const CURRENCIES = ['BRL','USD','EUR','GBP','ARS','MXN','COP','CLP','AED'];

export default function NovoImoveisPage() {
  const { user } = useAuth();
  const { site } = useMySite();
  const { add, open: openCart } = useCart();
  const router = useRouter();

  const [title, setTitle]       = useState('');
  const [price, setPrice]       = useState('');
  const [currency, setCurrency] = useState('BRL');
  const [tipo, setTipo]         = useState('Apartamento');
  const [quartos, setQuartos]   = useState('');
  const [banheiros, setBanheiros] = useState('');
  const [m2, setM2]             = useState('');
  const [garagem, setGaragem]   = useState('');
  const [desc, setDesc]         = useState('');
  const [region, setRegion]     = useState('Americas');
  const [country, setCountry]   = useState('BR');
  const [stateCity, setStateCity] = useState('');
  const [images, setImages]     = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]     = useState(false);

  if (!user) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="text-center">
        <p className="text-[var(--text2)] mb-3">Login required</p>
        <Link href="/auth" className="btn-primary">Sign In</Link>
      </div>
    </div>
  );

  const uploadPhoto = async (file: File) => {
    if (images.length >= 10) { toast.error('Max 10 photos'); return; }
    setUploading(true);
    try { const url = await uploadFile(file, 'imoveis', user.id); setImages(prev => [...prev, url]); } catch (e: any) { toast.error(e.message || 'Upload failed'); }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) { toast.error('Title and price required'); return; }
    if (!site?.id) { toast.error('Create your mini site first'); return; }
    setSaving(true);
    const { error } = await (supabase as any).from('classified_listings').insert({
      site_id: site.id, user_id: user.id, type: 'imovel',
      title, price: parseFloat(price), currency,
      region, country, state_city: stateCity,
      images, status: 'pending', // pending until payment
      extra: { tipo, quartos: quartos ? parseInt(quartos) : null, banheiros: banheiros ? parseInt(banheiros) : null, m2: m2 ? parseInt(m2) : null, garagem: garagem ? parseInt(garagem) : null, descricao: desc },
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    // Add $1/month to cart
    add({ id: `listing_imovel_${Date.now()}`, label: `Property listing: ${title} — $1.00 USDC/month`, price: 1, type: 'plan' });
    toast.success('Property created! Pay $1/month to go live.');
    openCart();
    router.push('/imoveis');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/imoveis" className="flex items-center gap-2 text-sm text-[var(--text2)] hover:text-[var(--text)] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Properties
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Home className="w-5 h-5 text-blue-500" /></div>
          <div>
            <h1 className="font-black text-xl text-[var(--text)]">List a Property</h1>
            <p className="text-xs text-[var(--text2)]">$1.00 USDC/month · Cancel anytime</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photos */}
          <div className="card p-5">
            <label className="label block mb-3">Photos (up to 10)</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--bg2)]">
                  <img src={img} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </button>
                  {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] bg-black/70 text-white px-1 rounded">Cover</span>}
                </div>
              ))}
              {images.length < 10 && (
                <label className={`aspect-square rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center cursor-pointer hover:border-brand/50 transition-colors ${uploading ? 'opacity-50' : ''}`}>
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin text-[var(--text2)]" /> : <><Upload className="w-5 h-5 text-[var(--text2)] mb-1" /><span className="text-[10px] text-[var(--text2)]">Add photo</span></>}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading}
                    onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                </label>
              )}
            </div>
          </div>

          {/* Basic info */}
          <div className="card p-5 space-y-4">
            <div>
              <label className="label block mb-1">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="3-bedroom apartment in São Paulo" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label block mb-1">Price *</label>
                <input value={price} onChange={e => setPrice(e.target.value)} className="input" placeholder="500000" type="number" required />
              </div>
              <div>
                <label className="label block mb-1">Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="input">
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label block mb-1">Type</label>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map(t => (
                  <button key={t} type="button" onClick={() => setTipo(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${tipo === t ? 'bg-brand text-white' : 'bg-[var(--bg2)] text-[var(--text2)] hover:border-brand/50 border border-[var(--border)]'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Specs */}
          <div className="card p-5">
            <label className="label block mb-3">Specifications</label>
            <div className="grid grid-cols-2 gap-3">
              {[['Bedrooms', quartos, setQuartos], ['Bathrooms', banheiros, setBanheiros], ['Area m²', m2, setM2], ['Parking', garagem, setGaragem]].map(([label, val, set]) => (
                <div key={label as string}>
                  <label className="text-xs text-[var(--text2)] block mb-1">{label as string}</label>
                  <input value={val as string} onChange={e => (set as (v: string) => void)(e.target.value)} className="input" type="number" min="0" placeholder="0" />
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="card p-5 space-y-3">
            <label className="label block">Location</label>
            <div>
              <label className="text-xs text-[var(--text2)] block mb-1">Region</label>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map(r => (
                  <button key={r} type="button" onClick={() => setRegion(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${region === r ? 'bg-indigo-600 text-white' : 'bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)]'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text2)] block mb-1">Country code</label>
                <input value={country} onChange={e => setCountry(e.target.value.toUpperCase())} className="input font-mono" placeholder="BR" maxLength={2} />
              </div>
              <div>
                <label className="text-xs text-[var(--text2)] block mb-1">City, State</label>
                <input value={stateCity} onChange={e => setStateCity(e.target.value)} className="input" placeholder="São Paulo, SP" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card p-5">
            <label className="label block mb-2">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} className="input resize-none" rows={4} placeholder="Describe the property..." />
          </div>

          {/* Pricing info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-blue-300">$1.00 USDC/month</p>
              <p className="text-xs text-blue-400/70 mt-0.5">Your listing goes live after payment. Global visibility. Cancel anytime.</p>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3.5 text-base">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> List for $1/month</>}
          </button>
        </form>
      </div>
    </div>
  );
}
