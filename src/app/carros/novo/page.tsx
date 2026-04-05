'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/r2';
import { useAuth } from '@/hooks/useAuth';
import { useMySite } from '@/hooks/useSite';
import { useCart } from '@/store/cart';
import { Car, Upload, X, ArrowLeft, Loader2, CheckCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import Link from 'next/link';
import { PLATFORM_USD } from '@/lib/platformPricing';

const REGIONS    = ['Americas','Europe','Asia','Africa','Oceania','Middle East'];
const CURRENCIES = ['BRL','USD','EUR','GBP','ARS','MXN'];
const MARCAS     = ['Toyota','Honda','Ford','Chevrolet','Volkswagen','BMW','Mercedes','Audi','Hyundai','Kia','Fiat','Renault','Peugeot','Nissan','Jeep','Outro'];
const COMBUSTIVEL = ['Flex','Gasolina','Diesel','Elétrico','Híbrido','GNV'];
const CAMBIO     = ['Manual','Automático','CVT','Semi-automático'];

export default function NovoCarroPage() {
  const T = useT();
  const { user } = useAuth();
  const { site } = useMySite();
  const { add, open: openCart } = useCart();
  const router = useRouter();

  const [title, setTitle]         = useState('');
  const [price, setPrice]         = useState('');
  const [currency, setCurrency]   = useState('BRL');
  const [marca, setMarca]         = useState('');
  const [modelo, setModelo]       = useState('');
  const [ano, setAno]             = useState('');
  const [km, setKm]               = useState('');
  const [cor, setCor]             = useState('');
  const [combustivel, setCombustivel] = useState('Flex');
  const [cambio, setCambio]       = useState('Manual');
  const [portas, setPortas]       = useState('4');
  const [desc, setDesc]           = useState('');
  const [region, setRegion]       = useState('Americas');
  const [country, setCountry]     = useState('BR');
  const [stateCity, setStateCity] = useState('');
  const [images, setImages]       = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);

  if (!user) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <Link href="/auth" className="btn-primary">Sign In</Link>
    </div>
  );

  const uploadPhoto = async (file: File) => {
    if (images.length >= 10) { toast.error(T('err_max_10_photos')); return; }
    setUploading(true);
    try { const url = await uploadFile(file, 'carros', user.id); setImages(prev => [...prev, url]); } catch (e: any) { toast.error(e.message || T('toast_upload_failed')); }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) { toast.error(T('err_title_price_required')); return; }
    if (!site?.id) { toast.error(T('err_mini_site_required')); return; }
    setSaving(true);
    const autoTitle = title || `${marca} ${modelo} ${ano}`.trim();
    const { data: listingRow, error } = await (supabase as any).from('classified_listings').insert({
      site_id: site.id, user_id: user.id, type: 'carro',
      title: autoTitle, price: parseFloat(price), currency,
      region, country, state_city: stateCity,
      images, status: 'pending',
      extra: { marca, modelo, ano: ano ? parseInt(ano) : null, km: km ? parseInt(km) : null, cor, combustivel, cambio, portas: parseInt(portas), descricao: desc },
    }).select('id').single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    const listingMo = PLATFORM_USD.classifiedListingMonthly;
    add({
      id: `classified_${listingRow.id}`,
      label: `Car listing: ${autoTitle} — $${listingMo.toFixed(2)} USD/month`,
      price: listingMo,
      type: 'classified',
    });
    toast.success(T('toast_car_listing_created_pay'));
    openCart();
    router.push('/carros');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/carros" className="flex items-center gap-2 text-sm text-[var(--text2)] hover:text-[var(--text)] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Cars
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Car className="w-5 h-5 text-blue-500" /></div>
          <div>
            <h1 className="font-black text-xl text-[var(--text)]">List a Car</h1>
            <p className="text-xs text-[var(--text2)]">${PLATFORM_USD.classifiedListingMonthly.toFixed(2)} USDC/month · Cancel anytime</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photos */}
          <div className="card p-5">
            <label className="label block mb-3">Photos (up to 10)</label>
            <div className="grid grid-cols-4 gap-2">
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
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin text-[var(--text2)]" /> : <><Upload className="w-5 h-5 text-[var(--text2)] mb-1" /><span className="text-[10px] text-[var(--text2)]">Add</span></>}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading}
                    onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                </label>
              )}
            </div>
          </div>

          {/* Vehicle info */}
          <div className="card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label block mb-1">Make</label>
                <select value={marca} onChange={e => setMarca(e.target.value)} className="input">
                  <option value="">Select make</option>
                  {MARCAS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label block mb-1">Model</label>
                <input value={modelo} onChange={e => setModelo(e.target.value)} className="input" placeholder="Civic, Corolla..." />
              </div>
            </div>
            <div>
              <label className="label block mb-1">Ad Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="2022 Toyota Corolla XEi — Excellent condition" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label block mb-1">Year</label>
                <input value={ano} onChange={e => setAno(e.target.value)} className="input" placeholder="2022" type="number" />
              </div>
              <div>
                <label className="label block mb-1">Mileage</label>
                <input value={km} onChange={e => setKm(e.target.value)} className="input" placeholder="45000" type="number" />
              </div>
              <div>
                <label className="label block mb-1">Color</label>
                <input value={cor} onChange={e => setCor(e.target.value)} className="input" placeholder="White" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label block mb-1">Price *</label>
                <input value={price} onChange={e => setPrice(e.target.value)} className="input" placeholder="45000" type="number" required />
              </div>
              <div>
                <label className="label block mb-1">Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="input">
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label block mb-1">Fuel</label>
                <select value={combustivel} onChange={e => setCombustivel(e.target.value)} className="input">
                  {COMBUSTIVEL.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label block mb-1">Transmission</label>
                <select value={cambio} onChange={e => setCambio(e.target.value)} className="input">
                  {CAMBIO.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label block mb-1">Doors</label>
                <select value={portas} onChange={e => setPortas(e.target.value)} className="input">
                  {['2','3','4','5'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="card p-5 space-y-3">
            <label className="label block">Location</label>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map(r => (
                <button key={r} type="button" onClick={() => setRegion(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${region === r ? 'bg-indigo-600 text-white' : 'bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)]'}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text2)] block mb-1">Country</label>
                <input value={country} onChange={e => setCountry(e.target.value.toUpperCase())} className="input font-mono" placeholder="BR" maxLength={2} />
              </div>
              <div>
                <label className="text-xs text-[var(--text2)] block mb-1">City, State</label>
                <input value={stateCity} onChange={e => setStateCity(e.target.value)} className="input" placeholder="São Paulo, SP" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <label className="label block mb-2">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} className="input resize-none" rows={3} placeholder="Describe the condition, history, extras..." />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-blue-300">${PLATFORM_USD.classifiedListingMonthly.toFixed(2)} USDC/month</p>
              <p className="text-xs text-blue-400/70 mt-0.5">Goes live after payment. Global visibility. Cancel anytime.</p>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3.5 text-base">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> List for ${PLATFORM_USD.classifiedListingMonthly.toFixed(2)}/month</>}
          </button>
        </form>
      </div>
    </div>
  );
}
