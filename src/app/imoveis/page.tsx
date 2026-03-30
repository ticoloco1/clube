'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/store/cart';
import { useAuth } from '@/hooks/useAuth';
import {
  Home, Search, ChevronLeft, ChevronRight, Heart, MapPin,
  Bed, Bath, Maximize2, X, ExternalLink, Shield, Plus,
  Globe, DollarSign, CheckCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { BoostButton } from '@/components/ui/BoostButton';

// ─── Regions ──────────────────────────────────────────────────────────────────
const REGIONS = ['Todos', 'Americas', 'Europe', 'Asia', 'Africa', 'Oceania', 'Middle East'];
const TIPOS   = ['Todos', 'Apartamento', 'Casa', 'Comercial', 'Terreno', 'Studio', 'Fazenda'];
const CURRENCIES = ['BRL','USD','EUR','GBP','ARS','MXN','COP','CLP'];

interface Listing {
  id: string; title: string; price: number; location: string;
  images: string[]; region?: string; country?: string; state_city?: string; currency?: string;
  extra?: { tipo?:string; quartos?:number; banheiros?:number; m2?:number; garagem?:number; descricao?:string };
  mini_sites?: { slug:string; site_name:string; avatar_url?:string; is_verified?:boolean };
}

// ─── Photo Carousel ─────────────────────────────────────────────────────────
function PhotoCarousel({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState(false);
  if (!images?.length) return (
    <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
      <Home className="w-10 h-10 text-slate-300 dark:text-slate-600" />
    </div>
  );
  return (
    <div className="relative aspect-[4/3] overflow-hidden group bg-black">
      <div className="absolute inset-0 transition-all duration-500 flex" style={{ transform:`translateX(-${idx*100}%)`, width:`${images.length*100}%` }}>
        {images.map((img,i) => <img key={i} src={img} alt="" className="w-full h-full object-cover flex-shrink-0" style={{ width:`${100/images.length}%` }} />)}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      {images.length > 1 && <>
        <button onClick={e=>{e.stopPropagation();setIdx(i=>(i-1+images.length)%images.length)}} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10"><ChevronLeft className="w-4 h-4 text-slate-800"/></button>
        <button onClick={e=>{e.stopPropagation();setIdx(i=>(i+1)%images.length)}} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10"><ChevronRight className="w-4 h-4 text-slate-800"/></button>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {images.map((_,i) => <button key={i} onClick={e=>{e.stopPropagation();setIdx(i)}} className={`rounded-full transition-all ${i===idx?'w-4 h-1.5 bg-white':'w-1.5 h-1.5 bg-white/60'}`}/>)}
        </div>
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-10">{idx+1}/{images.length}</div>
      </>}
      <button onClick={e=>{e.stopPropagation();setLiked(l=>!l)}} className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center z-10 hover:scale-110 transition-all">
        <Heart className={`w-4 h-4 ${liked?'fill-red-500 text-red-500':'text-slate-600'}`}/>
      </button>
    <Footer />
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ images, startIdx, onClose }: { images:string[]; startIdx:number; onClose:()=>void }) {
  const [idx, setIdx] = useState(startIdx);
  useEffect(()=>{ const h=(e:KeyboardEvent)=>{ if(e.key==='Escape')onClose(); if(e.key==='ArrowLeft')setIdx(i=>(i-1+images.length)%images.length); if(e.key==='ArrowRight')setIdx(i=>(i+1)%images.length); }; window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h); },[images.length,onClose]);
  return (
    <div className="fixed inset-0 z-[999] bg-black/96 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center z-10"><X className="w-5 h-5 text-white"/></button>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm z-10">{idx+1}/{images.length}</div>
      {images.length>1 && <>
        <button onClick={e=>{e.stopPropagation();setIdx(i=>(i-1+images.length)%images.length)}} className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center z-10"><ChevronLeft className="w-6 h-6 text-white"/></button>
        <button onClick={e=>{e.stopPropagation();setIdx(i=>(i+1)%images.length)}} className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center z-10"><ChevronRight className="w-6 h-6 text-white"/></button>
      </>}
      <img src={images[idx]} alt="" className="max-h-[88vh] max-w-[88vw] object-contain rounded-xl" onClick={e=>e.stopPropagation()}/>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 overflow-x-auto px-4" onClick={e=>e.stopPropagation()}>
        {images.map((img,i) => <button key={i} onClick={()=>setIdx(i)} className={`flex-shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all ${i===idx?'border-white':'border-transparent opacity-40 hover:opacity-70'}`}><img src={img} className="w-full h-full object-cover"/></button>)}
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ item, onClose }: { item:Listing; onClose:()=>void }) {
  const [lbIdx, setLbIdx] = useState<number|null>(null);
  const images = item.images||[];
  return (
    <>
      {lbIdx!==null && <Lightbox images={images} startIdx={lbIdx} onClose={()=>setLbIdx(null)}/>}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl" onClick={e=>e.stopPropagation()}>
          <div className="relative">
            {images.length===0 ? <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center"><Home className="w-12 h-12 text-slate-300"/></div>
            : images.length===1 ? <img src={images[0]} className="w-full aspect-[16/9] object-cover cursor-zoom-in" onClick={()=>setLbIdx(0)}/>
            : <div className="grid grid-cols-4 grid-rows-2 gap-1 h-72">
                <div className="col-span-2 row-span-2 overflow-hidden cursor-zoom-in" onClick={()=>setLbIdx(0)}><img src={images[0]} className="w-full h-full object-cover hover:brightness-90 transition-all"/></div>
                {images.slice(1,5).map((img,i) => <div key={i} className="overflow-hidden relative cursor-zoom-in" onClick={()=>setLbIdx(i+1)}><img src={img} className="w-full h-full object-cover hover:brightness-90 transition-all"/>{i===3&&images.length>5&&<div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-white font-black text-xl">+{images.length-5}</span></div>}</div>)}
              </div>}
            <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white z-10"><X className="w-4 h-4 text-slate-700"/></button>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{item.title}</h2>
                {item.state_city && <p className="text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-4 h-4"/>{item.state_city}{item.country && `, ${item.country}`}</p>}
              </div>
              <p className="text-2xl font-black text-blue-600 flex-shrink-0">
                {item.currency||'R$'} {item.price?Number(item.price).toLocaleString():'-'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mb-6">
              {item.extra?.tipo && <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl"><Home className="w-4 h-4 text-blue-500"/><span className="text-sm font-medium">{item.extra.tipo}</span></div>}
              {item.extra?.quartos!=null && <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl"><Bed className="w-4 h-4 text-blue-500"/><span className="text-sm font-medium">{item.extra.quartos} quartos</span></div>}
              {item.extra?.banheiros!=null && <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl"><Bath className="w-4 h-4 text-blue-500"/><span className="text-sm font-medium">{item.extra.banheiros} banheiros</span></div>}
              {item.extra?.m2!=null && <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl"><Maximize2 className="w-4 h-4 text-blue-500"/><span className="text-sm font-medium">{item.extra.m2} m²</span></div>}
              {item.extra?.garagem!=null && <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl"><span className="text-blue-500">🚗</span><span className="text-sm font-medium">{item.extra.garagem} vaga{item.extra.garagem!==1?'s':''}</span></div>}
            </div>
            {item.extra?.descricao && <div className="mb-6"><h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Descrição</h3><p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-line">{item.extra.descricao}</p></div>}
            {/* Boost */}
            <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <p className="text-xs text-slate-500">Ajude este imóvel a subir nas buscas</p>
              <BoostButton targetType="classified" targetId={item.id} targetName={item.title} compact />
            </div>
            {item.mini_sites && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4">
                {item.mini_sites.avatar_url ? <img src={item.mini_sites.avatar_url} className="w-12 h-12 rounded-full object-cover"/> : <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center"><Home className="w-5 h-5 text-blue-500"/></div>}
                <div className="flex-1"><p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">{item.mini_sites.site_name}{item.mini_sites.is_verified&&<Shield className="w-4 h-4 text-blue-500"/>}</p><p className="text-xs text-slate-500">Anunciante verificado</p></div>
                <a href={`https://${item.mini_sites.slug}.trustbank.xyz`} target="_blank" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex-shrink-0">Ver perfil <ExternalLink className="w-3.5 h-3.5"/></a>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Advertise Modal ──────────────────────────────────────────────────────────
function AdvertiseModal({ onClose }: { onClose: ()=>void }) {
  const { user } = useAuth();
  const { add, open: openCart } = useCart();
  const [step, setStep] = useState<'info'|'confirm'>('info');

  const handleStart = () => {
    if (!user) { toast.error('Faça login primeiro'); return; }
    add({ id: `classified_imovel_${Date.now()}`, label: 'Anúncio de Imóvel — $1.00 USDC/mês', price: 1, type: 'plan' });
    toast.success('$1/mês adicionado ao carrinho. Complete o pagamento para ativar!');
    openCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e=>e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950 rounded-2xl flex items-center justify-center mx-auto mb-3"><Home className="w-7 h-7 text-blue-600"/></div>
          <h3 className="font-black text-xl text-slate-900 dark:text-white">Anunciar Imóvel</h3>
          <p className="text-slate-500 text-sm mt-1">Entre no diretório global de imóveis</p>
        </div>
        <div className="space-y-3 mb-5">
          {[
            ['🌍','Visibilidade global','Seu imóvel aparece para compradores do mundo todo'],
            ['📸','Até 10 fotos','Carrossel completo com lightbox'],
            ['🔗','Link para seu mini site','Compradores vão direto ao seu perfil'],
            ['💳','$1.00 USDC / mês','Cancele quando quiser'],
          ].map(([icon,title,desc])=>(
            <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div><p className="font-semibold text-sm text-slate-800 dark:text-white">{title}</p><p className="text-xs text-slate-500">{desc}</p></div>
            </div>
          ))}
        </div>
        <button onClick={handleStart} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-white text-sm" style={{ background:'linear-gradient(135deg,#2563eb,#3b82f6)' }}>
          <DollarSign className="w-4 h-4"/> Anunciar por $1/mês
        </button>
        <p className="text-xs text-center text-slate-400 mt-2">Pago via USDC · Polygon · Cancele quando quiser</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

export default function ImoveisPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('Todos');
  const [tipo, setTipo] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState<Listing|null>(null);
  const [showAdvertise, setShowAdvertise] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (reset=false) => {
    setLoading(true);
    const from = reset ? 0 : page*PAGE_SIZE;
    let q = (supabase as any).from('classified_listings')
      .select('*, mini_sites(slug,site_name,avatar_url,is_verified)')
      .eq('type','imovel').eq('status','active')
      .order('boost_score',{ascending:false})
      .order('created_at',{ascending:false})
      .range(from, from+PAGE_SIZE-1);
    if (search) q = q.ilike('title',`%${search}%`);
    if (region!=='Todos') q = q.eq('region',region);
    if (tipo!=='Todos') q = q.eq('extra->>tipo',tipo);
    const { data } = await q;
    const newItems = data||[];
    setItems(prev => reset ? newItems : [...prev,...newItems]);
    setHasMore(newItems.length===PAGE_SIZE);
    if (!reset) setPage(p=>p+1);
    setLoading(false);
  },[page,search,region,tipo]);

  useEffect(()=>{ load(true); setPage(1); },[search,region,tipo]);

  useEffect(()=>{
    const obs = new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&hasMore&&!loading)load();},{threshold:0.1});
    if(observerRef.current)obs.observe(observerRef.current);
    return()=>obs.disconnect();
  },[hasMore,loading,load]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header/>
      {showAdvertise && <AdvertiseModal onClose={()=>setShowAdvertise(false)}/>}

      {/* Sticky search */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar imóvel, bairro, cidade..."/>
          </div>
          <a href="/imoveis/novo" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm text-white flex-shrink-0" style={{background:'linear-gradient(135deg,#2563eb,#3b82f6)'}}>
            <Plus className="w-4 h-4"/> List Property
          </a>
        </div>

        {/* Region filter */}
        <div className="max-w-7xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto">
          <Globe className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1.5"/>
          {REGIONS.map(r => (
            <button key={r} onClick={()=>setRegion(r)} className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${region===r?'bg-blue-600 text-white':'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}>{r}</button>
          ))}
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 flex-shrink-0 mx-1 mt-1"/>
          {TIPOS.filter(t=>t!=='Todos').map(t => (
            <button key={t} onClick={()=>setTipo(tipo===t?'Todos':t)} className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${tipo===t?'bg-indigo-600 text-white':'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-500"/> Imóveis
              {region!=='Todos' && <span className="text-base text-blue-500 font-semibold">· {region}</span>}
            </h1>
            <p className="text-sm text-slate-500">{items.length} imóveis encontrados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map(item => (
            <article key={item.id} className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-800 transition-all duration-300 cursor-pointer hover:-translate-y-1" onClick={()=>setSelected(item)}>
              <PhotoCarousel images={item.images||[]} title={item.title}/>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    {item.currency||'R$'} {item.price?Number(item.price).toLocaleString():'-'}
                  </p>
                  {item.extra?.tipo && <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium border border-blue-100 dark:border-blue-900">{item.extra.tipo}</span>}
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug line-clamp-2 mb-1.5">{item.title}</h3>
                {(item.state_city||item.location) && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3 flex-shrink-0"/>
                    <span className="truncate">{item.state_city||item.location}{item.country&&item.country!=='BR'?` · ${item.country}`:''}</span>
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                  {item.extra?.quartos!=null && <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5"/> {item.extra.quartos}</span>}
                  {item.extra?.banheiros!=null && <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5"/> {item.extra.banheiros}</span>}
                  {item.extra?.m2!=null && <span className="flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5"/> {item.extra.m2}m²</span>}
                  {item.mini_sites && (
                    <span className="ml-auto flex items-center gap-1">
                      {item.mini_sites.avatar_url && <img src={item.mini_sites.avatar_url} className="w-5 h-5 rounded-full object-cover"/>}
                      <span className="truncate max-w-[70px] text-slate-500">{item.mini_sites.site_name}</span>
                      {item.mini_sites.is_verified && <Shield className="w-3 h-3 text-blue-500 flex-shrink-0"/>}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
          {loading && [...Array(4)].map((_,i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse">
              <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800"/>
              <div className="p-4 space-y-2"><div className="h-5 bg-slate-100 dark:bg-slate-800 rounded w-3/4"/><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2"/></div>
            </div>
          ))}
        </div>

        {!loading && items.length===0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950 rounded-full flex items-center justify-center mx-auto mb-4"><Home className="w-10 h-10 text-blue-400"/></div>
            <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Nenhum imóvel nessa região</h3>
            <p className="text-slate-500 text-sm mb-4">Seja o primeiro a anunciar aqui!</p>
            <button onClick={()=>setShowAdvertise(true)} className="btn-primary">Anunciar meu imóvel</button>
          </div>
        )}
        <div ref={observerRef} className="h-10"/>
      </div>

      {selected && <DetailModal item={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
