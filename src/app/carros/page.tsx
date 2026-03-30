'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { BoostButton } from '@/components/ui/BoostButton';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';
import {
  Car, Search, SlidersHorizontal, ChevronLeft, ChevronRight,
  Heart, MapPin, Gauge, Fuel, Settings, X, ExternalLink, Shield, Zap
} from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  price: number;
  location: string;
  images: string[];
  extra?: {
    marca?: string;
    modelo?: string;
    ano?: number;
    km?: number;
    combustivel?: string;
    cambio?: string;
    cor?: string;
    portas?: number;
    motor?: string;
    descricao?: string;
    opcionais?: string[];
  };
  mini_sites?: { slug: string; site_name: string; avatar_url?: string; is_verified?: boolean };
}

// ─── Photo Carousel ─────────────────────────────────────────────────────────
function PhotoCarousel({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState(false);

  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); };
  const next = (e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); };

  if (!images?.length) return (
    <div className="aspect-[16/10] bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
      <Car className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
    </div>
  );

  return (
    <div className="relative aspect-[16/10] overflow-hidden group bg-black">
      <div className="absolute inset-0 transition-all duration-400" style={{ transform: `translateX(-${idx * 100}%)`, display: 'flex', width: `${images.length * 100}%` }}>
        {images.map((img, i) => (
          <img key={i} src={img} alt={`${title} ${i + 1}`}
            className="w-full h-full object-cover flex-shrink-0"
            style={{ width: `${100 / images.length}%` }} />
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10">
            <ChevronLeft className="w-4 h-4 text-zinc-800" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10">
            <ChevronRight className="w-4 h-4 text-zinc-800" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                className={`rounded-full transition-all ${i === idx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'}`} />
            ))}
          </div>
          <div className="absolute top-2 right-10 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-10">
            {idx + 1}/{images.length} fotos
          </div>
        </>
      )}

      <button onClick={e => { e.stopPropagation(); setLiked(l => !l); }}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center z-10 hover:scale-110 transition-all">
        <Heart className={`w-4 h-4 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-zinc-500'}`} />
      </button>
    <Footer />
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ images, startIdx, onClose }: { images: string[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % images.length);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-[999] bg-black/96 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center z-10">
        <X className="w-5 h-5 text-white" />
      </button>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm z-10 font-mono">{idx + 1} / {images.length}</div>
      {images.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); }} className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center z-10">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); }} className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center z-10">
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}
      <img src={images[idx]} alt="" className="max-h-[88vh] max-w-[88vw] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-2xl overflow-x-auto px-4" onClick={e => e.stopPropagation()}>
        {images.map((img, i) => (
          <button key={i} onClick={() => setIdx(i)} className={`flex-shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all ${i === idx ? 'border-white' : 'border-transparent opacity-40 hover:opacity-70'}`}>
            <img src={img} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Car Card (horizontal list style like Cars.com) ───────────────────────────
function CarCard({ item, onClick }: { item: Listing; onClick: () => void }) {
  return (
    <article className="group bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-zinc-100 dark:border-zinc-800 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row"
      onClick={onClick}>
      {/* Photo */}
      <div className="sm:w-72 flex-shrink-0">
        <PhotoCarousel images={item.images || []} title={item.title} />
      </div>

      {/* Info */}
      <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start gap-2 mb-1">
            <h3 className="font-black text-zinc-900 dark:text-white text-lg leading-snug flex-1">{item.title}</h3>
            {item.extra?.ano && (
              <span className="flex-shrink-0 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2.5 py-1 rounded-full font-bold">{item.extra.ano}</span>
            )}
          </div>
          {item.location && (
            <p className="text-xs text-zinc-500 flex items-center gap-1 mb-3">
              <MapPin className="w-3 h-3" />{item.location}
            </p>
          )}

          {/* Specs grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {item.extra?.km != null && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                <span>{Number(item.extra.km).toLocaleString('pt-BR')} km</span>
              </div>
            )}
            {item.extra?.combustivel && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                <Fuel className="w-3.5 h-3.5 text-zinc-400" />
                <span>{item.extra.combustivel}</span>
              </div>
            )}
            {item.extra?.cambio && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>{item.extra.cambio}</span>
              </div>
            )}
            {item.extra?.motor && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                <Zap className="w-3.5 h-3.5 text-zinc-400" />
                <span>{item.extra.motor}</span>
              </div>
            )}
            {item.extra?.cor && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                <span className="w-3 h-3 rounded-full border border-zinc-300 bg-zinc-300" style={{ backgroundColor: item.extra.cor.toLowerCase() === 'branco' ? '#f5f5f5' : item.extra.cor.toLowerCase() === 'preto' ? '#1a1a1a' : item.extra.cor.toLowerCase() === 'prata' ? '#c0c0c0' : item.extra.cor.toLowerCase() }} />
                <span>{item.extra.cor}</span>
              </div>
            )}
          </div>

          {/* Optional tags */}
          {item.extra?.opcionais && item.extra.opcionais.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.extra.opcionais.slice(0, 4).map((op, i) => (
                <span key={i} className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-900">{op}</span>
              ))}
              {item.extra.opcionais.length > 4 && <span className="text-xs text-zinc-500">+{item.extra.opcionais.length - 4}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">
              {item.price ? `R$ ${Number(item.price).toLocaleString('pt-BR')}` : 'Consultar'}
            </p>
            {item.mini_sites && (
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                {item.mini_sites.avatar_url && <img src={item.mini_sites.avatar_url} className="w-4 h-4 rounded-full" />}
                {item.mini_sites.site_name}
                {item.mini_sites.is_verified && <Shield className="w-3 h-3 text-blue-500" />}
              </p>
            )}
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors flex-shrink-0">
            Ver detalhes
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
function DetailModal({ item, onClose }: { item: Listing; onClose: () => void }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const images = item.images || [];

  return (
    <>
      {lightboxIdx !== null && <Lightbox images={images} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
        <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>

          {/* Photo grid Zillow-style */}
          <div className="relative rounded-t-2xl overflow-hidden">
            {images.length === 0 ? (
              <div className="aspect-[16/9] bg-zinc-100 flex items-center justify-center"><Car className="w-12 h-12 text-zinc-300" /></div>
            ) : images.length === 1 ? (
              <img src={images[0]} className="w-full aspect-[16/9] object-cover cursor-zoom-in" onClick={() => setLightboxIdx(0)} />
            ) : (
              <div className="grid grid-cols-4 grid-rows-2 gap-1 h-72">
                <div className="col-span-2 row-span-2 overflow-hidden cursor-zoom-in" onClick={() => setLightboxIdx(0)}>
                  <img src={images[0]} className="w-full h-full object-cover hover:brightness-90 transition-all" />
                </div>
                {images.slice(1, 5).map((img, i) => (
                  <div key={i} className="overflow-hidden relative cursor-zoom-in" onClick={() => setLightboxIdx(i + 1)}>
                    <img src={img} className="w-full h-full object-cover hover:brightness-90 transition-all" />
                    {i === 3 && images.length > 5 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer">
                        <span className="text-white font-black text-xl">+{images.length - 5}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white z-10">
              <X className="w-4 h-4 text-zinc-700" />
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{item.title}</h2>
                {item.location && <p className="text-zinc-500 flex items-center gap-1 mt-1 text-sm"><MapPin className="w-4 h-4" />{item.location}</p>}
              </div>
              <p className="text-3xl font-black text-blue-600 flex-shrink-0">{item.price ? `R$ ${Number(item.price).toLocaleString('pt-BR')}` : 'Consultar'}</p>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                { icon: <Gauge className="w-4 h-4" />, label: 'Quilometragem', value: item.extra?.km ? `${Number(item.extra.km).toLocaleString('pt-BR')} km` : null },
                { icon: <Fuel className="w-4 h-4" />, label: 'Combustível', value: item.extra?.combustivel },
                { icon: <Settings className="w-4 h-4" />, label: 'Câmbio', value: item.extra?.cambio },
                { icon: <Zap className="w-4 h-4" />, label: 'Motor', value: item.extra?.motor },
                { icon: <span className="text-sm">🎨</span>, label: 'Cor', value: item.extra?.cor },
                { icon: <span className="text-sm">🚗</span>, label: 'Portas', value: item.extra?.portas ? `${item.extra.portas} portas` : null },
              ].filter(s => s.value).map((s, i) => (
                <div key={i} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-zinc-400 mb-1">{s.icon}<span className="text-xs">{s.label}</span></div>
                  <p className="font-bold text-zinc-800 dark:text-white text-sm">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Opcionais */}
            {item.extra?.opcionais && item.extra.opcionais.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200 mb-3">Opcionais</h3>
                <div className="flex flex-wrap gap-2">
                  {item.extra.opcionais.map((op, i) => (
                    <span key={i} className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 px-3 py-1 rounded-full border border-green-100 dark:border-green-900 flex items-center gap-1">
                      ✓ {op}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {item.extra?.descricao && (
              <div className="mb-6">
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200 mb-2">Descrição</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed whitespace-pre-line">{item.extra.descricao}</p>
              </div>
            )}

            {/* Seller */}
            {item.mini_sites && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 flex items-center gap-4">
                {item.mini_sites.avatar_url ? <img src={item.mini_sites.avatar_url} className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center"><Car className="w-5 h-5 text-blue-500" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                    {item.mini_sites.site_name}
                    {item.mini_sites.is_verified && <Shield className="w-4 h-4 text-blue-500" />}
                  </p>
                  <p className="text-xs text-zinc-500">Vendedor verificado</p>
                </div>
                <a href={`https://${item.mini_sites.slug}.trustbank.xyz`} target="_blank"
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors flex-shrink-0">
                  Contato <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
            {/* Boost button — anyone can boost */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-500">Ajude este anúncio a subir nas listagens</p>
              <BoostButton targetType="classified" targetId={item.id} targetName={item.title} compact />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const BRANDS = ['Todos', 'Toyota', 'Honda', 'Volkswagen', 'Chevrolet', 'Ford', 'Hyundai', 'BMW', 'Mercedes', 'Fiat', 'Jeep', 'Renault'];
const PAGE_SIZE = 10;

export default function CarrosPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState<Listing | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const from = reset ? 0 : page * PAGE_SIZE;
    let q = (supabase as any).from('classified_listings')
      .select('*, mini_sites(slug, site_name, avatar_url, is_verified)')
      .eq('type', 'carro').eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (search) q = q.ilike('title', `%${search}%`);
    if (brand !== 'Todos') q = q.ilike('extra->>marca', `%${brand}%`);
    const { data } = await q;
    const newItems = data || [];
    setItems(prev => reset ? newItems : [...prev, ...newItems]);
    setHasMore(newItems.length === PAGE_SIZE);
    if (!reset) setPage(p => p + 1);
    setLoading(false);
  }, [page, search, brand]);

  useEffect(() => { load(true); setPage(1); }, [search, brand]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore && !loading) load(); }, { threshold: 0.1 });
    if (observerRef.current) obs.observe(observerRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, load]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header />

      {/* Sticky search */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Buscar por modelo, marca, ano..." />
          </div>
          {/* Brand filter */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
            {BRANDS.map(b => (
              <button key={b} onClick={() => setBrand(b)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${brand === b ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Carros</h1>
            <p className="text-sm text-zinc-500">{items.length} {items.length === 1 ? 'veículo encontrado' : 'veículos encontrados'}</p>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {items.map(item => (
            <CarCard key={item.id} item={item} onClick={() => setSelected(item)} />
          ))}
          {loading && [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row animate-pulse">
              <div className="sm:w-72 aspect-[16/10] sm:aspect-auto bg-zinc-100 dark:bg-zinc-800 flex-shrink-0" />
              <div className="flex-1 p-5 space-y-3">
                <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4" />
                <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2" />
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[...Array(3)].map((_, j) => <div key={j} className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && items.length === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="font-bold text-zinc-700 dark:text-zinc-300 mb-1">Nenhum veículo encontrado</h3>
            <p className="text-zinc-500 text-sm">Tente ajustar a busca ou filtros</p>
          </div>
        )}

        <div ref={observerRef} className="h-10" />
      </div>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
