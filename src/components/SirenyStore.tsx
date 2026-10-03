import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  Sparkles, 
  ArrowUpRight, 
  Lock, 
  Unlock, 
  Star, 
  Search, 
  Check, 
  Copy, 
  Eye, 
  ExternalLink, 
  X, 
  Layers, 
  Sliders, 
  ShieldCheck, 
  Zap, 
  ChevronRight, 
  ChevronDown,
  Tag, 
  ArrowRight,
  Plus,
  Compass,
  CheckCircle2,
  Download,
  FileText,
  SlidersHorizontal,
  Quote,
  Flame,
  Camera,
  Heart
} from 'lucide-react';
import { cleanPromptText } from '../App';

export interface StorePromptProduct {
  id: string;
  title: string;
  category: 'portraits' | 'editorial' | 'cinematic' | 'commercial' | 'cyberpunk' | 'pipeline';
  categoryLabel: string;
  model: string;
  priceToman: number;
  priceUsd: number;
  rating: number;
  salesCount: number;
  imageUrl: string;
  prompt: string;
  contextDesc?: string;
  specs: { lens: string; lighting: string; aspectRatio: string };
  tags: string[];
  isUnlocked?: boolean;
  isPipelineSourced?: boolean;
  pinterestUrl?: string;
}

interface SirenyStoreProps {
  approvedItems: any[];
  onOpenPipeline: () => void;
  onTestInGemini: (prompt: string) => void;
}

const PRODUCTS: StorePromptProduct[] = [
  {
    id: 'p1', title: 'Cinematic Noir Portrait', category: 'cinematic', categoryLabel: 'Cinematic',
    model: 'PromptEngin Studio', priceToman: 49000, priceUsd: 4.9, rating: 4.98, salesCount: 489,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=88',
    prompt: 'Cinematic editorial portrait, dramatic Rembrandt side light, authentic skin texture, 85mm prime lens, shallow depth of field, subtle film grain, natural expression, premium magazine photography.',
    contextDesc: 'تک‌نور نرم و جهت‌دار با عمق میدان کم برای یک پرتره سینمایی لوکس.',
    specs: { lens: '85mm f/1.4', lighting: 'Rembrandt Key', aspectRatio: '4:5' }, tags: ['portrait','cinematic','noir']
  },
  {
    id: 'p2', title: 'Luxury Product Campaign', category: 'commercial', categoryLabel: 'Commercial',
    model: 'PromptEngin Studio', priceToman: 59000, priceUsd: 5.9, rating: 4.96, salesCount: 326,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=88',
    prompt: 'Luxury product advertising photography, precision studio lighting, clean reflective surface, controlled highlights, premium commercial composition, realistic materials, high-end campaign aesthetic.',
    contextDesc: 'نور کنترل‌شده تبلیغاتی و بازتاب تمیز برای معرفی محصول در کمپین‌های لوکس.',
    specs: { lens: '70mm studio', lighting: 'Softbox + Rim', aspectRatio: '4:5' }, tags: ['product','luxury','ad']
  },
  {
    id: 'p3', title: 'Neon Tokyo Editorial', category: 'cyberpunk', categoryLabel: 'Cyberpunk',
    model: 'PromptEngin Studio', priceToman: 45000, priceUsd: 4.5, rating: 4.94, salesCount: 271,
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=88',
    prompt: 'Futuristic Tokyo street editorial portrait at night, wet asphalt reflections, cyan and magenta neon, cinematic haze, realistic skin, anamorphic flare, fashion magazine composition.',
    contextDesc: 'نور نئون شهری با انعکاس خیابان خیس و flare سینمایی.',
    specs: { lens: '50mm anamorphic', lighting: 'City Neon', aspectRatio: '2:3' }, tags: ['neon','tokyo','fashion']
  },
  {
    id: 'p4', title: 'Golden Hour Film Look', category: 'portraits', categoryLabel: 'Portrait',
    model: 'PromptEngin Studio', priceToman: 42000, priceUsd: 4.2, rating: 4.97, salesCount: 402,
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=88',
    prompt: 'Authentic 35mm film portrait during golden hour, warm backlight, organic grain, natural skin tones, subtle halation, soft background separation, timeless editorial photography.',
    contextDesc: 'نور طلایی پشت سوژه با گرین طبیعی و حال‌وهوای فیلم ۳۵ میلی‌متری.',
    specs: { lens: '55mm f/1.8', lighting: 'Golden Backlight', aspectRatio: '3:2' }, tags: ['film','golden-hour','35mm']
  },
  {
    id: 'p5', title: 'Minimal Fashion Campaign', category: 'editorial', categoryLabel: 'Editorial',
    model: 'PromptEngin Studio', priceToman: 52000, priceUsd: 5.2, rating: 4.95, salesCount: 198,
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=88',
    prompt: 'Minimal luxury fashion campaign, neutral architectural backdrop, soft overcast daylight, precise styling, natural skin texture, premium catalog photography, understated color palette.',
    contextDesc: 'نور ابری نرم و فضای معماری مینیمال مناسب کاتالوگ و فشن.',
    specs: { lens: '85mm f/1.4', lighting: 'Overcast Soft', aspectRatio: '4:5' }, tags: ['fashion','minimal','catalog']
  },
  {
    id: 'p6', title: 'Electric Dreamscape', category: 'cyberpunk', categoryLabel: 'Fantasy',
    model: 'PromptEngin Studio', priceToman: 62000, priceUsd: 6.2, rating: 4.93, salesCount: 154,
    imageUrl: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=88',
    prompt: 'Surreal electric dreamscape, luminous atmosphere, cinematic volumetric light, deep contrast, elegant color separation, highly detailed environment, premium concept-art composition.',
    contextDesc: 'نور حجمی و فضای سورئال برای تصویرسازی‌های مفهومی و کمپین‌های خلاق.',
    specs: { lens: '35mm wide', lighting: 'Volumetric', aspectRatio: '16:9' }, tags: ['fantasy','dreamscape','cinematic']
  }
];

const CATEGORY_FILTERS = [
  { id: 'all', label: 'همه' }, { id: 'portraits', label: 'Portraits' }, { id: 'editorial', label: 'Editorial' },
  { id: 'cinematic', label: 'Cinematic' }, { id: 'commercial', label: 'Commercial' }, { id: 'cyberpunk', label: 'Fantasy' }
];

export const INITIAL_STORE_PRODUCTS = PRODUCTS;

export function SirenyStore({ approvedItems, onOpenPipeline, onTestInGemini }: SirenyStoreProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<StorePromptProduct | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('sireny_favorites') || '[]'); } catch { return []; }
  });
  const [showPricing, setShowPricing] = useState(false);

  const allProducts = useMemo(() => {
    const imported = (approvedItems || []).slice(0, 24).map((item: any, i: number) => ({
      id: item.id || `pipeline-${i}`,
      title: item.title || 'PromptEngin Visual',
      category: 'pipeline' as const, categoryLabel: 'Fresh Drop', model: item.supervisorVerdict?.engineName || 'PromptEngin Engine',
      priceToman: 39000, priceUsd: 3.9, rating: 4.9, salesCount: 0, imageUrl: item.url,
      prompt: item.prompt || '', contextDesc: item.contextDesc, specs: { lens: 'Engine detected', lighting: 'Engine detected', aspectRatio: 'Original' },
      tags: ['fresh', 'promptengin'], isPipelineSourced: true
    }));
    return [...imported, ...PRODUCTS];
  }, [approvedItems]);

  const filtered = allProducts.filter(p => {
    const hay = `${p.title} ${p.categoryLabel} ${p.tags.join(' ')}`.toLowerCase();
    return (category === 'all' || p.category === category) && (!query.trim() || hay.includes(query.toLowerCase().trim()));
  });

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('sireny_favorites', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div dir="ltr" className="min-h-screen bg-[#07080a] text-white selection:bg-yellow-400 selection:text-black">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07080a]/85 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-5 py-4 flex items-center justify-between gap-4">
          <button onClick={() => window.scrollTo({top:0,behavior:'smooth'})} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 text-black grid place-items-center font-black text-xl shadow-[0_0_35px_rgba(250,204,21,.18)]">P</div>
            <div className="text-left"><div className="font-black tracking-tight text-lg">PromptEngin</div><div className="text-[10px] text-neutral-500 tracking-[.25em] uppercase">AI Visual Marketplace</div></div>
          </button>
          <nav className="hidden md:flex items-center gap-7 text-sm text-neutral-400">
            <a href="#discover" className="hover:text-white transition">Discover</a>
            <a href="#how" className="hover:text-white transition">How it works</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#creators" className="hover:text-white transition">Creators</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPricing(true)} className="hidden sm:block px-4 py-2 rounded-xl border border-white/10 text-sm font-bold hover:bg-white/5">Get Credits</button>
            <button onClick={onOpenPipeline} className="px-4 py-2.5 rounded-xl bg-yellow-400 text-black font-black text-sm hover:bg-yellow-300 transition shadow-lg shadow-yellow-400/10">Open Studio <ArrowUpRight className="inline w-4 h-4"/></button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,.13),transparent_42%)]"/>
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[420px] rounded-full bg-yellow-400/5 blur-3xl"/>
          <div className="relative mx-auto max-w-7xl px-5 pt-20 pb-16 md:pt-28 md:pb-24">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/5 px-3 py-1.5 text-xs text-yellow-300 mb-7">
                <Sparkles className="w-3.5 h-3.5"/> Curated AI visuals + production-ready prompts
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-[-.05em] leading-[.95]">Find the image.<br/><span className="text-yellow-400">Own the prompt.</span></h1>
              <p className="mt-7 max-w-2xl text-lg md:text-xl text-neutral-400 leading-relaxed">A premium marketplace for creators to discover cinematic AI visuals, unlock the exact prompt recipe, remix ideas and build faster.</p>
              <div className="mt-9 flex flex-col sm:flex-row gap-3 max-w-xl">
                <a href="#discover" className="px-6 py-4 rounded-2xl bg-white text-black font-black text-center hover:bg-neutral-200 transition">Explore the collection</a>
                <button onClick={onOpenPipeline} className="px-6 py-4 rounded-2xl border border-white/15 bg-white/5 font-bold hover:bg-white/10 transition">Create from a reference <ArrowRight className="inline w-4 h-4"/></button>
              </div>
              <div className="mt-12 grid grid-cols-3 max-w-2xl gap-4 border-t border-white/10 pt-7">
                <div><div className="text-2xl font-black">6+</div><div className="text-xs text-neutral-500 mt-1">curated styles</div></div>
                <div><div className="text-2xl font-black">1,800+</div><div className="text-xs text-neutral-500 mt-1">prompt unlocks</div></div>
                <div><div className="text-2xl font-black">24/7</div><div className="text-xs text-neutral-500 mt-1">creator access</div></div>
              </div>
            </div>
          </div>
        </section>

        <section id="discover" className="mx-auto max-w-7xl px-5 py-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
            <div><div className="text-xs text-yellow-400 font-black tracking-[.2em] uppercase">Discover</div><h2 className="text-3xl md:text-4xl font-black mt-2">Fresh visual drops</h2><p className="text-neutral-500 mt-2">High-signal references, clean prompts, ready to remix.</p></div>
            <div className="relative w-full md:w-80"><Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search portraits, cinematic, product..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-yellow-400/50 text-sm"/></div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3 mb-7">{CATEGORY_FILTERS.map(c=><button key={c.id} onClick={()=>setCategory(c.id)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition ${category===c.id?'bg-yellow-400 text-black border-yellow-400':'bg-white/5 border-white/10 text-neutral-400 hover:text-white'}`}>{c.label}</button>)}</div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {filtered.map(p=>(
              <article key={p.id} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-[#0d0f12] hover:border-yellow-400/30 transition-all hover:-translate-y-1">
                <button onClick={()=>toggleFavorite(p.id)} className="absolute z-10 top-3 right-3 w-9 h-9 rounded-full bg-black/55 backdrop-blur border border-white/10 grid place-items-center">
                  <Heart className={`w-4 h-4 ${favorites.includes(p.id)?'fill-yellow-400 text-yellow-400':'text-white'}`}/>
                </button>
                <button onClick={()=>setSelected(p)} className="w-full text-left">
                  <div className="aspect-[4/5] overflow-hidden bg-neutral-900"><img src={p.imageUrl} alt={p.title} loading="lazy" className="w-full h-full object-cover transition duration-700 group-hover:scale-105"/></div>
                  <div className="p-4">
                    <div className="text-[10px] text-yellow-400 font-black uppercase tracking-wider">{p.categoryLabel}</div>
                    <h3 className="font-bold text-sm mt-1 line-clamp-2">{p.title}</h3>
                    <div className="flex items-center justify-between mt-3 text-xs"><span className="text-neutral-500">★ {p.rating}</span><span className="font-black">${p.priceUsd.toFixed(2)}</span></div>
                  </div>
                </button>
              </article>
            ))}
          </div>
          {filtered.length===0 && <div className="py-24 text-center text-neutral-500">No visual matches yet.</div>}
          <p className="text-[10px] text-neutral-600 mt-5">* Pricing is shown as a product placeholder for the launch build. Connect your payment provider before accepting real payments.</p>
        </section>

        <section id="how" className="border-y border-white/10 bg-white/[.025]">
          <div className="mx-auto max-w-7xl px-5 py-20">
            <div className="max-w-2xl"><div className="text-xs text-yellow-400 font-black tracking-[.2em] uppercase">Workflow</div><h2 className="text-3xl md:text-4xl font-black mt-2">From inspiration to owned asset.</h2></div>
            <div className="grid md:grid-cols-3 gap-5 mt-10">
              {[
                ['01','Discover','Browse a curated visual library built around useful styles and real production references.'],
                ['02','Unlock','Get the prompt recipe, visual context and camera/lighting breakdown behind the reference.'],
                ['03','Remix','Send it to Studio, adapt it and create your own variation instead of starting from zero.']
              ].map(([n,t,d])=><div key={n} className="rounded-2xl border border-white/10 bg-[#0a0b0d] p-6"><div className="text-yellow-400 font-black text-sm">{n}</div><h3 className="text-xl font-black mt-7">{t}</h3><p className="text-neutral-500 leading-7 mt-3 text-sm">{d}</p></div>)}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-5 py-20">
          <div className="text-center max-w-2xl mx-auto"><div className="text-xs text-yellow-400 font-black tracking-[.2em] uppercase">Simple pricing</div><h2 className="text-3xl md:text-4xl font-black mt-2">Start free. Upgrade when you need more.</h2><p className="text-neutral-500 mt-3">The launch model is designed around credits so image generation and premium assets can share one economy.</p></div>
          <div className="grid md:grid-cols-3 gap-5 mt-10 max-w-5xl mx-auto">
            {[
              ['Free','0','50 credits / month',['Explore gallery','Save favorites','Community drops']],
              ['Creator','9.99','1,200 credits / month',['HD downloads','Prompt unlocks','Remix tools','No ads']],
              ['Pro','24.99','3,500 credits / month',['Commercial license','Priority generation','Private collections','Batch tools']]
            ].map(([name,price,sub,features],i)=><div key={name} className={`rounded-3xl border p-7 ${i===1?'border-yellow-400/50 bg-yellow-400/[.06] shadow-2xl shadow-yellow-400/5':'border-white/10 bg-white/[.025]'}`}><div className="flex justify-between items-center"><h3 className="text-xl font-black">{name}</h3>{i===1&&<span className="text-[10px] bg-yellow-400 text-black px-2 py-1 rounded-full font-black">POPULAR</span>}</div><div className="mt-7 text-4xl font-black">{price==='0'?'Free':`$${price}`}<span className="text-sm text-neutral-500 font-normal">{price!=='0'&&'/mo'}</span></div><div className="text-sm text-yellow-300 mt-2">{sub}</div><ul className="mt-7 space-y-3">{(features as string[]).map(f=><li key={f} className="text-sm text-neutral-400 flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0"/>{f}</li>)}</ul><button onClick={()=>setShowPricing(true)} className={`w-full mt-8 py-3 rounded-xl font-black ${i===1?'bg-yellow-400 text-black':'bg-white/10 hover:bg-white/15'}`}>{i===0?'Start free':'Choose plan'}</button></div>)}
          </div>
        </section>

        <section id="creators" className="mx-auto max-w-7xl px-5 pb-24">
          <div className="rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 via-white/[.03] to-transparent p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div><div className="text-xs text-yellow-400 font-black tracking-[.2em] uppercase">For creators</div><h2 className="text-3xl font-black mt-2">Turn your visual recipes into products.</h2><p className="text-neutral-400 mt-3 max-w-xl leading-7">The next phase of PromptEngin can let creators publish prompt packs, earn from sales and build a profile around their visual style.</p></div>
            <button onClick={()=>alert('Creator marketplace is planned for the next release.')} className="shrink-0 px-6 py-3.5 rounded-xl bg-white text-black font-black hover:bg-neutral-200">Join creator waitlist</button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-10 flex flex-col md:flex-row justify-between gap-5 text-xs text-neutral-500">
          <div><div className="text-white font-black text-base">PromptEngin</div><p className="mt-2">AI visual discovery & prompt marketplace.</p></div>
          <div className="flex gap-5"><a href="#discover" className="hover:text-white">Discover</a><a href="#pricing" className="hover:text-white">Pricing</a><button onClick={onOpenPipeline} className="hover:text-white">Studio</button></div>
        </div>
      </footer>

      {selected && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md p-4 grid place-items-center" onClick={()=>setSelected(null)}>
          <div className="w-full max-w-4xl max-h-[92vh] overflow-auto rounded-3xl border border-white/10 bg-[#0b0d10] shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="grid md:grid-cols-2">
              <div className="aspect-[4/5] md:aspect-auto bg-black"><img src={selected.imageUrl} alt={selected.title} className="w-full h-full object-cover"/></div>
              <div className="p-7 md:p-9">
                <div className="flex justify-between"><div><div className="text-xs text-yellow-400 font-black uppercase">{selected.categoryLabel}</div><h2 className="text-2xl font-black mt-2">{selected.title}</h2></div><button onClick={()=>setSelected(null)} className="w-9 h-9 rounded-full bg-white/5 grid place-items-center"><X className="w-4 h-4"/></button></div>
                <div className="grid grid-cols-3 gap-2 mt-7">{[['Lens',selected.specs.lens],['Light',selected.specs.lighting],['Ratio',selected.specs.aspectRatio]].map(([k,v])=><div key={k} className="rounded-xl bg-white/5 border border-white/10 p-3"><div className="text-[9px] text-neutral-500 uppercase">{k}</div><div className="text-xs font-bold mt-1">{v}</div></div>)}</div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4"><div className="text-[10px] text-neutral-500 uppercase mb-2">Prompt preview</div><p className="text-sm text-neutral-300 leading-7">{selected.prompt}</p></div>
                {selected.contextDesc&&<p className="text-xs text-neutral-500 mt-4 leading-6">{selected.contextDesc}</p>}
                <div className="mt-7 flex gap-3"><button onClick={()=>onTestInGemini(selected.prompt)} className="flex-1 py-3 rounded-xl bg-yellow-400 text-black font-black">Test prompt</button><button onClick={()=>alert('Checkout is not connected yet. Add your payment provider before accepting real orders.')} className="flex-1 py-3 rounded-xl bg-white/10 font-black">Unlock</button></div>
                <p className="text-[10px] text-neutral-600 mt-4">Checkout is intentionally disabled in this build until a compliant payment provider and product licensing are configured.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPricing && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md p-4 grid place-items-center" onClick={()=>setShowPricing(false)}>
          <div className="max-w-lg w-full rounded-3xl border border-white/10 bg-[#0b0d10] p-8" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between"><h2 className="text-2xl font-black">Launch billing</h2><button onClick={()=>setShowPricing(false)}><X/></button></div>
            <p className="text-neutral-400 text-sm leading-7 mt-4">The storefront and credit economy are ready in the UI. Real payments should be connected only after the business entity, payment provider and content licensing are configured.</p>
            <button onClick={()=>{setShowPricing(false);onOpenPipeline();}} className="w-full mt-6 py-3 rounded-xl bg-yellow-400 text-black font-black">Open Studio</button>
          </div>
        </div>
      )}
    </div>
  );
}
