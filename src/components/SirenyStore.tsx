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
  specs: {
    lens: string;
    lighting: string;
    aspectRatio: string;
  };
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

export const INITIAL_STORE_PRODUCTS: StorePromptProduct[] = [
  {
    id: 'sireny-prod-1',
    title: 'Ethereal Cyberpunk High-Fashion Portrait',
    category: 'editorial',
    categoryLabel: 'مد و فشن استودیویی',
    model: 'Midjourney v6.1 & Gemini 3.8',
    priceToman: 49000,
    priceUsd: 9,
    rating: 4.95,
    salesCount: 312,
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80',
    prompt: `Editorial fashion photography of a futuristic avant-garde model, wearing an iridescent sculptural jacket, illuminated by soft violet and amber directional studio neon lights, captured on Hasselblad H6D-100c with 100mm f/2.2 lens, tactile hyper-realistic skin pores and natural peach fuzz, cinematic color grading.\n[IDENTITY LOCK]: Preserve exact facial structure, bone symmetry, and natural undertones.\n[ANGLE & COMPOSITION LOCK]: 45-degree three-quarter profile, eye level, dramatic chiaroscuro falloff.\n[NEGATIVE ANCHOR]: plastic skin, airbrushed, cartoon, extra limbs, blur, oversaturated.`,
    contextDesc: 'ترکیب نور ریمبراند با هایلایت‌های نئونی بنفش و کهربایی، عمق میدان باریک و تفکیک حرفه‌ای پس‌زمینه.',
    specs: {
      lens: '100mm f/2.2 Prime',
      lighting: 'Dual Rim Neon + Key Softbox',
      aspectRatio: '4:5 Editorial'
    },
    tags: ['Cyberpunk', 'High Fashion', 'Hasselblad']
  },
  {
    id: 'sireny-prod-2',
    title: 'Cinematic Chiaroscuro Noir Portrait',
    category: 'portraits',
    categoryLabel: 'پرتره سینمایی ریمبراند',
    model: 'Gemini 3.8 & Midjourney v6',
    priceToman: 39000,
    priceUsd: 8,
    rating: 5.0,
    salesCount: 489,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1000&q=80',
    prompt: `Masterpiece cinematic portrait of a charismatic mature man, weathered character lines, intense emotional gaze, stark single-source side key light creating deep Rembrandt shadow, Leica M11 with Noctilux-M 50mm f/0.95 lens, authentic natural skin texture, subtle atmospheric haze.\n[IDENTITY LOCK]: Preserve exact facial features, natural eye wrinkles, and skin tone.\n[ANGLE & COMPOSITION LOCK]: Direct frontal gaze, tight close-up portrait framing.\n[NEGATIVE ANCHOR]: smooth plastic retouching, flat lighting, digital look, extra accessories.`,
    contextDesc: 'تک‌نور سخت زاویه‌دار برای برجسته‌سازی عمق نگاه و خطوط طبیعی چهره با بافت آنالوگ ۳۵ میلی‌متری.',
    specs: {
      lens: '50mm f/0.95 Noctilux',
      lighting: 'Single Key Light (Rembrandt)',
      aspectRatio: '16:9 Cinematic'
    },
    tags: ['Noir', 'Rembrandt', '35mm Film']
  },
  {
    id: 'sireny-prod-3',
    title: 'Minimalist Scandinavian Architectural Model',
    category: 'commercial',
    categoryLabel: 'تجاری و ادیتوریال مینیمال',
    model: 'Flux.1 & Midjourney v6',
    priceToman: 59000,
    priceUsd: 12,
    rating: 4.9,
    salesCount: 204,
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=80',
    prompt: `Ultra-clean minimalist fashion editorial, model posing beside brutalist concrete architecture, overcast diffuse daylight, muted neutral beige and slate palette, Sony A7R V with 85mm f/1.4 GM lens, natural micro-shadows, authentic skin specular highlights.\n[IDENTITY LOCK]: Preserve exact facial features, neutral lip tone, and hair structure.\n[ANGLE & COMPOSITION LOCK]: Full body vertical golden ratio framing.\n[NEGATIVE ANCHOR]: harsh shadows, oversaturated colors, cartoon, artificial glow.`,
    contextDesc: 'نور طبیعی ابری ملایم مناسب کاتالوگ‌های لوکس پوشاک و طراحی معماری.',
    specs: {
      lens: '85mm f/1.4 GM',
      lighting: 'Overcast Soft Ambient',
      aspectRatio: '9:16 Story'
    },
    tags: ['Minimalist', 'Brutalist', 'Luxury Ad']
  },
  {
    id: 'sireny-prod-4',
    title: 'Neon Dystopian Street Rebel Portrait',
    category: 'cyberpunk',
    categoryLabel: 'سایبرپانک و فانتزی',
    model: 'Gemini 3.8 & Stable Diffusion XL',
    priceToman: 45000,
    priceUsd: 9,
    rating: 4.88,
    salesCount: 178,
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=80',
    prompt: `Cinematic night street portrait of a cyberpunk female rebel standing in rain-slicked Tokyo alley, neon signs reflecting on wet asphalt, wet hair strands framing face, anamorphic lens flare with blue horizontal streak, ARRI Alexa LF with 40mm anamorphic lens.\n[IDENTITY LOCK]: Preserve facial bone structure, eye shape, and realistic skin tone.\n[ANGLE & COMPOSITION LOCK]: Low-angle medium close-up shot.\n[NEGATIVE ANCHOR]: CGI render, smooth doll skin, duplicate limbs, text watermark.`,
    contextDesc: 'انعکاس‌های بارانی و شراره‌های افقی لنز آنامورفیک در نورپردازی شبانه کلان‌شهر نئونی.',
    specs: {
      lens: '40mm Anamorphic T2.0',
      lighting: 'Wet Ambient City Neon',
      aspectRatio: '2.39:1 CinemaScope'
    },
    tags: ['Tokyo Neon', 'Anamorphic', 'Night Rain']
  },
  {
    id: 'sireny-prod-5',
    title: 'Analog Golden Hour Kodachrome 64 Portrait',
    category: 'portraits',
    categoryLabel: 'پرتره آنالوگ کداکروم',
    model: 'Midjourney v6.1 & Gemini 3.8',
    priceToman: 42000,
    priceUsd: 8.5,
    rating: 4.96,
    salesCount: 265,
    imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1000&q=80',
    prompt: `1970s authentic Kodachrome 64 film portrait of a serene woman in warm late afternoon sunlight, warm golden halo on hair flyaways, subtle natural film grain, Canon F-1 with FD 55mm f/1.2 lens, rich organic skin tones without digital sharpness.\n[IDENTITY LOCK]: Preserve natural facial asymmetry, freckles, and authentic smile lines.\n[ANGLE & COMPOSITION LOCK]: Slight low angle chest-up portrait.\n[NEGATIVE ANCHOR]: digital noise, plastic sheen, oversharpened, modern makeup.`,
    contextDesc: 'شبیه‌سازی شیمی نگاتیو کداکروم با نور طلایی غروب خورشید و گرین ارگانیک.',
    specs: {
      lens: 'Canon FD 55mm f/1.2',
      lighting: 'Natural Sunset Backlit',
      aspectRatio: '3:2 Classic 35mm'
    },
    tags: ['Kodachrome', 'Vintage 35mm', 'Golden Hour']
  },
  {
    id: 'sireny-prod-6',
    title: 'Haute Couture Vogue Runway Monochrome',
    category: 'editorial',
    categoryLabel: 'ادیتوریال سیاه و سفید وگ',
    model: 'Flux.1 & Midjourney v6',
    priceToman: 52000,
    priceUsd: 10,
    rating: 4.98,
    salesCount: 340,
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80',
    prompt: `Timeless monochrome high fashion editorial for Vogue cover, dramatic geometric shadows across high cheekbones, structural tailored silk cape, Profoto B10 studio flash with beauty dish and grid, Hasselblad 907X with 80mm lens, deep silvery blacks and velvety midtones.\n[IDENTITY LOCK]: Preserve high cheekbone angles, eye shape, and neutral lips.\n[ANGLE & COMPOSITION LOCK]: Strict profile silhouette framing.\n[NEGATIVE ANCHOR]: flat grey, low contrast, blur, blown out highlights.`,
    contextDesc: 'کنتراست بالای سیاه‌وسفید با بیوتی‌دیش استودیویی مناسب جلدهای مجلات مد بین‌المللی.',
    specs: {
      lens: '80mm f/1.9 Hasselblad',
      lighting: 'Beauty Dish with Grid',
      aspectRatio: '4:5 Vogue Cover'
    },
    tags: ['Monochrome', 'Vogue Cover', 'High Contrast']
  }
];

export const SirenyStore: React.FC<SirenyStoreProps> = ({
  approvedItems,
  onOpenPipeline,
  onTestInGemini
}) => {
  // Products pool: initial catalog + dynamically added items from the pipeline
  const dynamicProducts: StorePromptProduct[] = useMemo(() => {
    const pipelineMapped: StorePromptProduct[] = approvedItems.map((item, idx) => ({
      id: `pipeline-prod-${item.id || idx}`,
      title: item.title && !item.title.startsWith('http') ? item.title.slice(0, 48) : `پرامپت استودیویی تاییدشده #${idx + 1}`,
      category: 'pipeline',
      categoryLabel: 'تأمین‌شده از خط تولید',
      model: 'Gemini 3.8 & Midjourney v6',
      priceToman: 49000,
      priceUsd: 9,
      rating: 5.0,
      salesCount: 1,
      imageUrl: item.url,
      prompt: item.prompt || '',
      contextDesc: item.contextDesc || 'نورپردازی استودیویی حرفه‌ای با قفل هویت چهره و تطابق کامل زاویه لنز عکاسی.',
      specs: {
        lens: '85mm f/1.4 Prime',
        lighting: 'Rembrandt Studio Directional',
        aspectRatio: '4:5 Studio'
      },
      tags: ['Live Sourced', 'Calibrated', 'Identity Locked', 'Pipeline'],
      isUnlocked: true, // Pipeline items are immediately unlocked for the creator
      isPipelineSourced: true,
      pinterestUrl: item.pinterestUrl
    }));

    return [...pipelineMapped, ...INITIAL_STORE_PRODUCTS];
  }, [approvedItems]);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rating' | 'price_low' | 'price_high'>('popular');
  const [cartItems, setCartItems] = useState<StorePromptProduct[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<StorePromptProduct | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState<string>('');
  const [discountApplied, setDiscountApplied] = useState<boolean>(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<boolean>(false);
  const [unlockedProductIds, setUnlockedProductIds] = useState<Set<string>>(new Set());
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    let result = dynamicProducts.filter(prod => {
      const matchesCategory = 
        activeCategory === 'all' || 
        (activeCategory === 'pipeline' ? prod.isPipelineSourced : prod.category === activeCategory);
      
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        prod.title.toLowerCase().includes(q) || 
        prod.categoryLabel.toLowerCase().includes(q) ||
        prod.tags.some(t => t.toLowerCase().includes(q));
      
      return matchesCategory && matchesQuery;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'popular') return b.salesCount - a.salesCount;
      if (sortBy === 'newest') return (b.isPipelineSourced ? 1 : 0) - (a.isPipelineSourced ? 1 : 0);
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price_low') return a.priceToman - b.priceToman;
      if (sortBy === 'price_high') return b.priceToman - a.priceToman;
      return 0;
    });

    return result;
  }, [dynamicProducts, activeCategory, searchQuery, sortBy]);

  // Cart operations
  const addToCart = (product: StorePromptProduct) => {
    if (!cartItems.some(item => item.id === product.id)) {
      setCartItems(prev => [...prev, product]);
    }
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const cartTotalToman = useMemo(() => {
    const rawTotal = cartItems.reduce((acc, item) => acc + item.priceToman, 0);
    return discountApplied ? Math.round(rawTotal * 0.8) : rawTotal;
  }, [cartItems, discountApplied]);

  const handleApplyDiscount = () => {
    if (discountCode.trim().toUpperCase() === 'SIRENY20' || discountCode.trim().toUpperCase() === 'PROMPT') {
      setDiscountApplied(true);
    } else {
      alert('کد تخفیف نامعتبر است (کد معتبر: SIRENY20 یا PROMPT)');
    }
  };

  const handleCompleteCheckout = () => {
    // Unlock all items in cart
    const newUnlocked = new Set(unlockedProductIds);
    cartItems.forEach(item => newUnlocked.add(item.id));
    setUnlockedProductIds(newUnlocked);
    setCheckoutSuccess(true);
  };

  const handleDownloadAllPurchased = () => {
    const itemsToExport = cartItems.length > 0 ? cartItems : dynamicProducts.filter(p => unlockedProductIds.has(p.id) || p.isUnlocked);
    if (itemsToExport.length === 0) {
      alert('موردی برای دانلود وجود ندارد.');
      return;
    }

    let fileContent = `=====================================================\n`;
    fileContent += `SIRENY PROMPT MARKETPLACE - EXPORTED PROMPTS PACKAGE\n`;
    fileContent += `Generated: ${new Date().toLocaleString()}\n`;
    fileContent += `Total Prompts: ${itemsToExport.length}\n`;
    fileContent += `=====================================================\n\n`;

    itemsToExport.forEach((item, idx) => {
      fileContent += `-----------------------------------------------------\n`;
      fileContent += `#${idx + 1}. ${item.title}\n`;
      fileContent += `Model: ${item.model} | Category: ${item.categoryLabel}\n`;
      fileContent += `Lens: ${item.specs.lens} | Aspect Ratio: ${item.specs.aspectRatio}\n`;
      fileContent += `Lighting: ${item.specs.lighting}\n`;
      fileContent += `PROMPT TEXT:\n${cleanPromptText(item.prompt)}\n\n`;
    });

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sireny-prompts-package-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSinglePrompt = (product: StorePromptProduct) => {
    let fileContent = `=====================================================\n`;
    fileContent += `SIRENY PROMPT: ${product.title}\n`;
    fileContent += `Model: ${product.model}\n`;
    fileContent += `Category: ${product.categoryLabel}\n`;
    fileContent += `Lens: ${product.specs.lens}\n`;
    fileContent += `Lighting: ${product.specs.lighting}\n`;
    fileContent += `Aspect Ratio: ${product.specs.aspectRatio}\n`;
    fileContent += `=====================================================\n\n`;
    fileContent += `PROMPT:\n${cleanPromptText(product.prompt)}\n\n`;
    if (product.contextDesc) {
      fileContent += `NOTES & LIGHTING PHYSICS:\n${product.contextDesc}\n`;
    }

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${product.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-prompt.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(cleanPromptText(text));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#000104] text-[#afafaf] font-sans selection:bg-white/20 selection:text-white relative overflow-hidden">
      
      {/* AMBIENT LIGHTING BACKGROUND GLOW (Inspired by Sireny Webflow) */}
      <div 
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[650px] rounded-full opacity-40 blur-[140px]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(234, 236, 237, 0.16) 0%, rgba(56, 51, 45, 0.12) 50%, transparent 80%)'
        }}
      />

      {/* ============================================================== */}
      {/* 1. SIRENY FLOATING HEADER & NAVIGATION                         */}
      {/* ============================================================== */}
      <header className="sticky top-4 z-40 px-4 sm:px-8 max-w-[1340px] mx-auto w-full">
        <div className="bg-[#000104]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-6 py-3.5 flex items-center justify-between shadow-2xl shadow-black/80">
          
          {/* BRAND LOGO */}
          <div className="flex items-center gap-4">
            <a href="#" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-sm tracking-wider group-hover:scale-105 transition-transform">
                S
              </div>
              <div className="flex flex-col">
                <span className="text-white font-extrabold tracking-tight text-base font-display">SIRENY</span>
                <span className="text-[10px] text-[#afafaf]/70 tracking-widest uppercase font-mono">Prompt Marketplace</span>
              </div>
            </a>
          </div>

          {/* DESKTOP NAV LINKS */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-[#afafaf]">
            <a href="#store" className="hover:text-white transition-colors">فروشگاه پرامپت</a>
            <a href="#features" className="hover:text-white transition-colors">امکانات مهندسی</a>
            <a href="#automation" className="hover:text-white transition-colors">خط تولید خودکار</a>
            <a href="#reviews" className="hover:text-white transition-colors">نظرات خریداران</a>
            <a href="#pricing" className="hover:text-white transition-colors">تعرفه‌ها و اشتراک</a>
            <a href="#faq" className="hover:text-white transition-colors">سوالات متداول</a>
          </nav>

          {/* ACTION BUTTONS & CART */}
          <div className="flex items-center gap-3">
            {/* SWITCH TO SOURCING PIPELINE */}
            <button
              onClick={onOpenPipeline}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white transition-all shadow-sm cursor-pointer"
              title="ورود به سیستم غربالگری، استخراج OCR و اتصال به پینترست"
            >
              <Sliders className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden sm:inline">استودیوی خط تولید و تأمین</span>
              <span className="bg-yellow-500/20 text-yellow-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                {approvedItems.length}
              </span>
            </button>

            {/* CART BUTTON */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-all shadow-lg shadow-white/5 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-black" />
              <span className="hidden sm:inline">سبد خرید</span>
              {cartItems.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>


      {/* ============================================================== */}
      {/* 2. HERO SECTION (Serene at work. Calm And faster Productivity) */}
      {/* ============================================================== */}
      <section className="relative pt-24 pb-16 px-6 max-w-[1280px] mx-auto text-center space-y-8">
        
        {/* EDITORIAL KICKER */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.12] bg-white/[0.03] text-xs font-medium text-[#afafaf] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>SIRENY · نسل آینده فروش و مهندسی پرامپت استودیویی</span>
          <span className="text-white/40">·</span>
          <span className="text-white/90 font-mono font-semibold">نسخه ۲۰۲۶</span>
        </div>

        {/* GIANT EDITORIAL HEADLINE */}
        <div className="space-y-3 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1] font-display">
            Serene at work.
          </h1>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-light text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 via-neutral-400 to-neutral-600 tracking-tight leading-[1.1]">
            Calm And Masterpiece Quality.
          </h2>
        </div>

        {/* PROSE DESCRIPTION */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#afafaf] leading-relaxed">
          بزرگ‌ترین فروشگاه تخصصی پرامپت‌های استودیویی کالیبره‌شده با لنزهای ۸۵میلی‌متری، فیزیک نور ریمبراند و قفل دائمی هویت چهره برای میدجرنی، جمینای و استیبل دیفیوژن.
        </p>

        {/* PRIMARY HERO CTAS */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href="#store"
            className="px-7 py-3.5 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all shadow-xl shadow-white/10 flex items-center gap-2"
          >
            <span>کاوش در کاتالوگ پرامپت‌ها</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <button
            onClick={onOpenPipeline}
            className="px-7 py-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.15] text-white font-semibold text-xs transition-all flex items-center gap-2 backdrop-blur-sm cursor-pointer"
          >
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>نوار نقاله تأمین و استخراج زنده (مدیریت)</span>
            {approvedItems.length > 0 && (
              <span className="bg-yellow-500/20 text-yellow-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                {approvedItems.length} تازه
              </span>
            )}
          </button>
        </div>

        {/* SIRENY METRIC BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto border-t border-white/[0.08]">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-white font-mono tabular-nums">+۱,۴۵۰</div>
            <div className="text-xs text-[#afafaf]">پرامپت استودیویی تست‌شده</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-white font-mono tabular-nums">۹۹.۸٪</div>
            <div className="text-xs text-[#afafaf]">تطابق پرسپکتیو و نور چهره</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-white font-mono tabular-nums">۰ ثانیه</div>
            <div className="text-xs text-[#afafaf]">دانلود و بازگشایی آنی</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-white font-mono tabular-nums">۱۰۰٪</div>
            <div className="text-xs text-[#afafaf]">لایسنس تجاری تضمین‌شده</div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2.5. VISUAL MARQUEE TICKER (Sireny Card Showcase)              */}
      {/* ============================================================== */}
      <section className="py-6 border-y border-white/[0.08] bg-white/[0.01] overflow-hidden">
        <div className="max-w-[1340px] mx-auto px-6 flex items-center justify-between gap-4 text-xs font-mono text-[#afafaf]/70">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-yellow-400" />
            <span className="text-white font-semibold">ترندهای استودیویی امروز:</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 overflow-x-auto py-1 scrollbar-none">
            <span className="hover:text-white transition-colors cursor-pointer">#Chiaroscuro Noir</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer">#Vogue Editorial 85mm</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer">#Kodachrome 64 Vintage</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer">#Cyberpunk Rim Neon</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer">#Brutalist Architectural</span>
            <span>•</span>
            <span className="text-yellow-400 font-semibold cursor-pointer" onClick={() => setActiveCategory('pipeline')}>
              🚀 {approvedItems.length} ورودی جدید از خط تولید
            </span>
          </div>
        </div>
      </section>


      {/* ============================================================== */}
      {/* 3. STOREFRONT & PROMPT CATALOG (Ready-made Products)           */}
      {/* ============================================================== */}
      <section id="store" className="py-20 px-6 max-w-[1340px] mx-auto space-y-10">
        
        {/* SECTION HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-[#afafaf]/80">Prompt Catalog</div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
              کاتالوگ پرامپت‌های استودیویی کالیبره‌شده
            </h3>
            <p className="text-xs text-[#afafaf] max-w-lg">
              پرامپت‌های متصل به خط تولید؛ همگی همراه با متادیتا، قفل هویت چهره و دستورات فنی لنز عکاسی ارائه می‌شوند.
            </p>
          </div>

          {/* SEARCH & SORT BOXES */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* SEARCH BOX */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#afafaf] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در بین پرامپت‌ها..."
                className="w-full bg-[#000104] border border-white/[0.12] focus:border-white/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#afafaf]/60 focus:outline-none transition-colors"
              />
            </div>

            {/* SORT DROPDOWN */}
            <div className="relative w-full sm:w-44">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full bg-[#000104] border border-white/[0.12] focus:border-white/40 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
              >
                <option value="popular">محبوب‌ترین‌ها</option>
                <option value="newest">جدیدترین‌ها (خط تولید)</option>
                <option value="rating">بالاترین امتیاز</option>
                <option value="price_low">ارزان‌ترین</option>
                <option value="price_high">گران‌ترین</option>
              </select>
            </div>
          </div>
        </div>

        {/* CATEGORY FILTER TABS */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl w-fit">
          {[
            { id: 'all', label: 'همه پرامپت‌ها' },
            { id: 'pipeline', label: `🚀 تأمین‌شده از خط تولید (${approvedItems.length})`, isPipelineTab: true },
            { id: 'portraits', label: 'پرتره سینمایی ریمبراند' },
            { id: 'editorial', label: 'مد و فشن استودیویی' },
            { id: 'commercial', label: 'تبلیغاتی و مینیمال' },
            { id: 'cyberpunk', label: 'سایبرپانک و فانتزی' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategory === tab.id
                  ? 'bg-white text-black shadow-md'
                  : 'text-[#afafaf] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.isPipelineTab && approvedItems.length > 0 && activeCategory !== tab.id && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>
          ))}
        </div>

        {/* PRODUCTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => {
            const isUnlocked = unlockedProductIds.has(product.id) || product.isUnlocked;
            const inCart = cartItems.some(c => c.id === product.id);

            return (
              <div 
                key={product.id}
                className="bg-[#000104] border border-white/[0.09] hover:border-white/[0.22] rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 flex flex-col group relative"
              >
                {/* IMAGE FRAME WITH HOVER ZOOM */}
                <div className="relative aspect-[4/5] bg-black overflow-hidden">
                  <img 
                    src={product.imageUrl} 
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />

                  {/* TOP BADGES */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    <span className={`backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                      product.isPipelineSourced 
                        ? 'bg-emerald-950/90 border border-emerald-500/50 text-emerald-300' 
                        : 'bg-black/80 border border-white/10 text-white'
                    }`}>
                      {product.categoryLabel}
                    </span>
                    <span className="bg-black/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                      {product.rating}
                    </span>
                  </div>

                  {/* PIPELINE LIVE BADGE */}
                  {product.isPipelineSourced && (
                    <div className="absolute bottom-3 left-3 bg-yellow-500/90 text-black px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 shadow-lg pointer-events-none">
                      <Zap className="w-3 h-3" /> خط تولید زنده
                    </div>
                  )}

                  {/* QUICK VIEW TRIGGER */}
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-opacity flex items-center justify-center gap-2 text-xs font-bold text-white cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>بررسی جزییات پرامپت</span>
                  </button>
                </div>

                {/* CONTENT */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#afafaf] font-mono">
                      <span>{product.model}</span>
                      {product.pinterestUrl && (
                        <a 
                          href={product.pinterestUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px]"
                          title="مشاهده در پینترست"
                        >
                          <span>پینترست</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-neutral-200 transition-colors">
                      {product.title}
                    </h4>

                    {/* SPECS SNIPPET */}
                    <div className="flex items-center gap-2 text-[11px] text-[#afafaf]/80 pt-1">
                      <span>{product.specs.lens}</span>
                      <span>·</span>
                      <span>{product.specs.aspectRatio}</span>
                    </div>

                    {/* PROMPT PREVIEW WITH BLUR / UNLOCK */}
                    <div className="relative mt-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] font-mono text-neutral-300">
                      <p className={`line-clamp-2 leading-relaxed ${!isUnlocked ? 'filter blur-[3.5px] select-none' : ''}`}>
                        {cleanPromptText(product.prompt)}
                      </p>
                      {!isUnlocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px] rounded-xl">
                          <span className="flex items-center gap-1 text-[11px] text-yellow-300 font-bold">
                            <Lock className="w-3.5 h-3.5" /> قفل شده (بازگشایی پس از خرید)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PRICE & ACTIONS */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-white font-mono">
                        {product.priceToman.toLocaleString()} تومان
                      </div>
                      <div className="text-[10px] text-[#afafaf]/60 font-mono">${product.priceUsd} USD</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isUnlocked ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleCopyPrompt(product.prompt, product.id)}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedId === product.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === product.id ? 'کپی شد' : 'کپی'}</span>
                          </button>
                          <button
                            onClick={() => handleDownloadSinglePrompt(product)}
                            className="p-2 rounded-xl text-xs font-bold bg-white/[0.05] text-white hover:bg-white/[0.1] border border-white/10 transition-colors cursor-pointer"
                            title="دانلود فایل .txt پرامپت"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          disabled={inCart}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            inCart 
                              ? 'bg-neutral-800 text-neutral-400 cursor-default' 
                              : 'bg-white text-black hover:bg-neutral-200 shadow-md'
                          }`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{inCart ? 'در سبد' : 'افزودن'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-24 text-center border border-dashed border-white/10 rounded-3xl space-y-3">
            <Compass className="w-10 h-10 mx-auto text-[#afafaf]/40" />
            <p className="text-sm text-white font-medium">موردی برای این جستجو یا دسته‌بندی یافت نشد.</p>
            <p className="text-xs text-[#afafaf]">می‌توانید از طریق خط تولید، پرامپت‌های جدیدی از پینترست دریافت و به این بخش اضافه کنید.</p>
            <button
              onClick={onOpenPipeline}
              className="mt-3 px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>ورود به استودیوی خط تولید</span>
            </button>
          </div>
        )}
      </section>


      {/* ============================================================== */}
      {/* 4. SIRENY FEATURES (Ready-made features for Faster Prod)       */}
      {/* ============================================================== */}
      <section id="features" className="py-20 px-6 max-w-[1280px] mx-auto space-y-12 border-t border-white/[0.08]">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="text-xs font-mono uppercase tracking-widest text-[#afafaf]/80">Engineered Precision</div>
          <h3 className="text-3xl sm:text-4xl font-bold text-white font-display">
            ویژگی‌های استودیویی برای خروجی‌های بی‌نقص
          </h3>
          <p className="text-xs sm:text-sm text-[#afafaf] leading-relaxed">
            تمامی پرامپت‌های موجود در این پلتفرم از فیلترهای دوگانهٔ نوری و پرسپکتیو عبور کرده‌اند تا خروجی نهایی هوش مصنوعی عیناً منطبق بر واقعیت باشد.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.2] transition-colors space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-lg font-bold text-white">01. قفل سخت‌گیرانه چهره (Identity Lock)</h4>
            <p className="text-xs text-[#afafaf] leading-relaxed">
              تضمین عدم دفرمه شدن آناتومی صورت، حفظ دقیق بافت و رنگ پوست، و یکپارچگی خطوط چشم و لب بدون افکت‌های مصنوعی پلاستیکی.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.2] transition-colors space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <h4 className="text-lg font-bold text-white">02. کالیبراسیون لنز و نورپردازی ریمبراند</h4>
            <p className="text-xs text-[#afafaf] leading-relaxed">
              شبیه‌سازی فاصله کانونی لنزهای پرایم (۸۵mm و ۵۰mm)، عمق میدان باریک و شکست فیزیکی نورهای استودیویی در پس‌زمینه.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.2] transition-colors space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <h4 className="text-lg font-bold text-white">03. خط استخراج خودکار از پینترست</h4>
            <p className="text-xs text-[#afafaf] leading-relaxed">
              اتصال زنده به بیش از ۱۲ کانال پرامپت مطرح دنیا در پینترست برای تأمین و غربالگری پیوسته جدیدترین ترندهای هنری.
            </p>
          </div>
        </div>
      </section>


      {/* ============================================================== */}
      {/* 5. AUTOMATION SECTION (Automation & Smart Pipeline)            */}
      {/* ============================================================== */}
      <section id="automation" className="py-20 px-6 max-w-[1280px] mx-auto space-y-12 border-t border-white/[0.08]">
        <div className="bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.1] rounded-3xl p-8 sm:p-14 space-y-8">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-mono">
                AUTONOMOUS SOURCING PIPELINE
              </div>
              <h3 className="text-2xl sm:text-4xl font-bold text-white font-display">
                اتصال مستقیم نوار نقاله به ویترین فروشگاه
              </h3>
              <p className="text-xs sm:text-sm text-[#afafaf] leading-relaxed">
                همان سیستمی که برای خط تولید و اسکن پرامپت‌ها ساختید، مستقیماً به این فروشگاه متصل است. به محض اینکه یک پوستر در خط غربالگری تایید شود، به‌صورت خودکار با قیمت‌گذاری و تگ‌گذاری استاندارد در کاتالوگ فروشگاه قرار می‌گیرد.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onOpenPipeline}
                className="px-6 py-3.5 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-black" />
                <span>ورود به استودیوی غربالگری</span>
              </button>
            </div>
          </div>

          {/* 4 PIPELINE STEPS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-white/[0.08]">
            <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.06] space-y-2">
              <div className="text-xs font-mono text-yellow-400">01. Sourcing</div>
              <div className="text-sm font-bold text-white">دریافت زنده از پینترست</div>
              <p className="text-[11px] text-[#afafaf]">اتصال به ۵۰۰+ پین پرامپت روزانه از طریق کانال‌های معتبر.</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.06] space-y-2">
              <div className="text-xs font-mono text-blue-400">02. Engine 1</div>
              <div className="text-sm font-bold text-white">غربالگری مدل واقعی</div>
              <p className="text-[11px] text-[#afafaf]">فیلتر خودکار اینفوگرافیک و کارتون؛ حفظ تنها پرتره‌های انسانی.</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.06] space-y-2">
              <div className="text-xs font-mono text-emerald-400">03. Engine 2</div>
              <div className="text-sm font-bold text-white">OCR و قفل هویت چهره</div>
              <p className="text-[11px] text-[#afafaf]">استخراج متن دقیق کارت و ادغام با دستورات لنز و فیزیک نور.</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.06] space-y-2">
              <div className="text-xs font-mono text-purple-400">04. Marketplace</div>
              <div className="text-sm font-bold text-white">فروش و تحویل آنی</div>
              <p className="text-[11px] text-[#afafaf]">عرضه در فروشگاه با امکان تست، دانلود و کپی پرامپت برای خریداران.</p>
            </div>
          </div>
        </div>
      </section>


      {/* ============================================================== */}
      {/* 5.5. REVIEWS & SOCIAL PROOF (Sireny Customer Testimonials)    */}
      {/* ============================================================== */}
      <section id="reviews" className="py-20 px-6 max-w-[1280px] mx-auto space-y-12 border-t border-white/[0.08]">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="text-xs font-mono uppercase tracking-widest text-[#afafaf]/80">Trusted by Professionals</div>
          <h3 className="text-3xl sm:text-4xl font-bold text-white font-display">
            دیدگاه عکاسان و مدیران هنری استودیوها
          </h3>
          <p className="text-xs sm:text-sm text-[#afafaf]">
            ببینید طراحان مطرح چگونه با پرامپت‌های کالیبره‌شده ما در زمان و هزینه‌های عکاسی استودیویی صرفه‌جویی می‌کنند.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
            <Quote className="w-8 h-8 text-neutral-600" />
            <p className="text-xs text-neutral-300 leading-relaxed">
              «بزرگ‌ترین معضل من با میدجرنی پلاستیکی شدن پوست و دفرمه شدن نگاه چشم‌ها بود. پرامپت‌های Sireny با قفل چهره و لنز ۸۵ میلی‌متری خروجی را مستقیماً قابل چاپ در مجلات کردند.»
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-200 flex items-center justify-center text-black font-bold text-xs">
                SM
              </div>
              <div>
                <div className="text-xs font-bold text-white">سامان مرادی</div>
                <div className="text-[10px] text-[#afafaf]">مدیر هنری آژانس تبلیغاتی لایت</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
            <Quote className="w-8 h-8 text-neutral-600" />
            <p className="text-xs text-neutral-300 leading-relaxed">
              «خط تولید خودکار این سایت فوق‌العاده است! هر روز پرامپت‌های جدید و تست‌شده از ترندهای برتر اضافه می‌شوند و من دیگر نیازی به آزمون‌وخطای ساعت‌ها پرامپت‌نویسی ندارم.»
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-400 flex items-center justify-center text-white font-bold text-xs">
                NE
              </div>
              <div>
                <div className="text-xs font-bold text-white">نگار ابراهیمی</div>
                <div className="text-[10px] text-[#afafaf]">عکاس مد و طراح ادیتوریال</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
            <Quote className="w-8 h-8 text-neutral-600" />
            <p className="text-xs text-neutral-300 leading-relaxed">
              «لایسنس تجاری واقعی و متادیتای تفصیلی هر پرامپت باعث شده برای تمام کاتالوگ‌های فصلی برند پوشاکمان از پرامپت‌های این فروشگاه استفاده کنیم. بازگشت سرمایه فوری بود.»
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-300 flex items-center justify-center text-black font-bold text-xs">
                AR
              </div>
              <div>
                <div className="text-xs font-bold text-white">آرش راد</div>
                <div className="text-[10px] text-[#afafaf]">تولیدکننده محتوا و طراح هوش مصنوعی</div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ============================================================== */}
      {/* 6. PRICING PLANS (Flexible Plans for Every Team)               */}
      {/* ============================================================== */}
      <section id="pricing" className="py-20 px-6 max-w-[1280px] mx-auto space-y-12 border-t border-white/[0.08]">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="text-xs font-mono uppercase tracking-widest text-[#afafaf]/80">Flexible Plans</div>
          <h3 className="text-3xl sm:text-4xl font-bold text-white font-display">
            تعرفه‌ها و اشتراک‌های دسترسی نامحدود
          </h3>
          <p className="text-xs sm:text-sm text-[#afafaf]">
            پلن مناسب برای طراحان فریلنسر، آژانس‌های تبلیغاتی و استودیوهای تولید محتوا.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* STARTER */}
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-xs font-mono text-[#afafaf]">Starter Pack</div>
              <div className="text-3xl font-extrabold text-white font-mono">۹۹,۰۰۰ <span className="text-xs font-sans text-[#afafaf]">تومان</span></div>
              <p className="text-xs text-[#afafaf]">مناسب طراحانی که نیاز به چند پرامپت باکیفیت برای پروژه‌های جاری دارند.</p>
              <ul className="space-y-2.5 text-xs text-neutral-300 pt-4 border-t border-white/[0.08]">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> دسترسی به ۲۰ پرامپت استودیویی</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> قفل هویت چهره و زاویه عکاسی</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> پشتیبانی از Midjourney v6</li>
              </ul>
            </div>
            <button 
              onClick={() => alert('پلن پایه با موفقیت فعال شد.')}
              className="w-full py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              انتخاب پلن پایه
            </button>
          </div>

          {/* STUDIO PRO (FEATURED) */}
          <div className="p-8 rounded-3xl bg-white/[0.05] border border-white/20 flex flex-col justify-between space-y-6 relative shadow-2xl shadow-white/5">
            <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-white text-black text-[10px] font-extrabold tracking-wide uppercase">
              پیشنهاد ویژه
            </div>
            <div className="space-y-4">
              <div className="text-xs font-mono text-yellow-400">Studio Pro (Full Access)</div>
              <div className="text-3xl font-extrabold text-white font-mono">۲۴۹,۰۰۰ <span className="text-xs font-sans text-[#afafaf]">تومان/ماهانه</span></div>
              <p className="text-xs text-[#afafaf]">دسترسی نامحدود به تمامی پرامپت‌ها و آپدیت‌های روزانه از خط تولید.</p>
              <ul className="space-y-2.5 text-xs text-neutral-200 pt-4 border-t border-white/[0.08]">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> دسترسی نامحدود به کل کاتالوگ</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> لایسنس تجاری نامحدود (Commercial)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> دانلود فایل‌های خام JSON و متادیتا</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> اولویت در خط استخراج پرامپت جدید</li>
              </ul>
            </div>
            <button 
              onClick={() => alert('اشتراک حرفه‌ای با موفقیت فعال شد.')}
              className="w-full py-3 rounded-2xl bg-white text-black hover:bg-neutral-200 text-xs font-extrabold transition-colors cursor-pointer"
            >
              شروع اشتراک حرفه‌ای
            </button>
          </div>

          {/* AGENCY */}
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-xs font-mono text-[#afafaf]">Agency Pass</div>
              <div className="text-3xl font-extrabold text-white font-mono">۵۹۰,۰۰۰ <span className="text-xs font-sans text-[#afafaf]">تومان/ماهانه</span></div>
              <p className="text-xs text-[#afafaf]">طراحی‌شده برای آژانس‌های تبلیغاتی و تیم‌های بزرگ چندکاربره.</p>
              <ul className="space-y-2.5 text-xs text-neutral-300 pt-4 border-t border-white/[0.08]">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> اکانت برای ۵ عضو تیم</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> دسترسی به وب‌هوک و API پرامپت‌ها</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> پشتیبانی اختصاصی تلگرام و واتساپ</li>
              </ul>
            </div>
            <button 
              onClick={() => alert('درخواست مشاوره آژانس ثبت شد.')}
              className="w-full py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              تماس برای لایسنس سازمانی
            </button>
          </div>
        </div>
      </section>


      {/* ============================================================== */}
      {/* 6.5. FAQ SECTION (Frequently Asked Questions)                  */}
      {/* ============================================================== */}
      <section id="faq" className="py-20 px-6 max-w-[900px] mx-auto space-y-8 border-t border-white/[0.08]">
        <div className="text-center space-y-2">
          <div className="text-xs font-mono uppercase tracking-widest text-[#afafaf]/80">Common Questions</div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white font-display">
            سوالات متداول خریداران پرامپت
          </h3>
        </div>

        <div className="space-y-3 pt-4">
          {[
            {
              q: 'پرامپت‌ها با کدام ابزارهای هوش مصنوعی سازگار هستند؟',
              a: 'تمامی پرامپت‌های ما برای Midjourney (نسخه‌های v5.2 و v6 و v6.1)، Flux.1، Stable Diffusion XL و Google Gemini بهینه‌سازی شده‌اند و ساختار نگارش آن‌ها فاقد واژه‌های ممنوعه یا سوءتفاهم‌های الگوریتمی است.'
            },
            {
              q: 'قفل هویت چهره (Identity Lock) و قفل زاویه چگونه کار می‌کند؟',
              a: 'هر پرامپت شامل یک بلوک تخصصی مهندسی‌شده با لنگرهای منفی و پارامترهای تثبیت آناتومی است که از اعوجاج چهره، دفرمه شدن چشم‌ها و بافت غیرطبیعی پوست جلوگیری می‌کند و ساختار استخوانی مرجع را حفظ می‌نماید.'
            },
            {
              q: 'آیا لایسنس تجاری برای پروژه‌های کارفرماها شامل می‌شود؟',
              a: 'بله، با خرید هر پرامپت یا فعال‌سازی اشتراک، مجوز استفاده تجاری ۱۰۰٪ بدون محدودیت زمانی برای انواع کمپین‌های تبلیغاتی، کاتالوگ‌ها، وب‌سایت‌ها و سوشال مدیا به شما اعطا می‌گردد.'
            },
            {
              q: 'چگونه پرامپت‌های جدید خط تولید به فروشگاه متصل می‌شوند؟',
              a: 'سیستم نوار نقاله ما با موتور OCR و فیلترهای مدل واقعی به کانال‌های مرجع پینترست متصل است. هر پوستری که تایید و اسکن شود، بلافاصله با دستورات کالیبراسیون و برچسب‌های استاندارد در کاتالوگ فروشگاه قرار می‌گیرد.'
            }
          ].map((item, idx) => (
            <div 
              key={idx}
              className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden transition-colors"
            >
              <button
                onClick={() => setFaqOpenIndex(faqOpenIndex === idx ? null : idx)}
                className="w-full p-5 text-right flex items-center justify-between gap-4 text-xs sm:text-sm font-semibold text-white hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <span>{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#afafaf] transition-transform duration-200 ${faqOpenIndex === idx ? 'rotate-180 text-white' : ''}`} />
              </button>
              {faqOpenIndex === idx && (
                <div className="px-5 pb-5 text-xs text-[#afafaf] leading-relaxed border-t border-white/[0.04] pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>


      {/* ============================================================== */}
      {/* 7. SIRENY FOOTER (Serene at work.)                             */}
      {/* ============================================================== */}
      <footer className="py-16 px-6 max-w-[1280px] mx-auto border-t border-white/[0.08] text-xs text-[#afafaf] space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-white text-black font-bold flex items-center justify-center text-xs">S</div>
              <span className="text-white font-bold tracking-tight text-sm font-display">SIRENY PROMPTS</span>
            </div>
            <p className="text-[11px] text-[#afafaf]/70 max-w-sm">
              طراحی‌شده بر اساس تمپلیت معتبر Sireny برای فروشگاه پرامپت‌های استودیویی و کالیبراسیون لنزهای هوش مصنوعی.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 text-[#afafaf]">
            <a href="#store" className="hover:text-white transition-colors">فروشگاه</a>
            <a href="#features" className="hover:text-white transition-colors">امکانات</a>
            <a href="#automation" className="hover:text-white transition-colors">خط تولید خودکار</a>
            <a href="#reviews" className="hover:text-white transition-colors">نظرات</a>
            <a href="#pricing" className="hover:text-white transition-colors">تعرفه‌ها</a>
            <button onClick={onOpenPipeline} className="hover:text-white text-yellow-400 transition-colors cursor-pointer">
              استودیوی نوار نقاله ⚙️
            </button>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#afafaf]/60">
          <div>© 2026 Sireny Prompt Marketplace. تمامی حقوق محفوظ است.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">قوانین و لایسنس تجاری</a>
            <a href="#" className="hover:underline">حریم خصوصی</a>
            <a href="#" className="hover:underline">پشتیبانی</a>
          </div>
        </div>
      </footer>


      {/* ============================================================== */}
      {/* 8. SHOPPING CART SLIDE-OVER DRAWER                             */}
      {/* ============================================================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#000104] border-l border-white/[0.1] h-full flex flex-col justify-between shadow-2xl p-6 overflow-hidden">
            
            {/* CART HEADER */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-white" />
                <h4 className="text-sm font-bold text-white">سبد خرید شما ({cartItems.length})</h4>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-[#afafaf] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* CART ITEMS LIST */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="text-center py-20 space-y-2">
                  <ShoppingCart className="w-10 h-10 mx-auto text-[#afafaf]/30" />
                  <p className="text-xs text-white">سبد خرید شما خالی است.</p>
                  <p className="text-[11px] text-[#afafaf]">یک یا چند پرامپت از کاتالوگ انتخاب و اضافه کنید.</p>
                </div>
              ) : (
                cartItems.map(item => (
                  <div key={item.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex gap-3 items-center justify-between">
                    <img src={item.imageUrl} alt={item.title} className="w-14 h-14 object-cover rounded-xl border border-white/10" />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-white truncate">{item.title}</h5>
                      <div className="text-[10px] text-[#afafaf] mt-0.5">{item.categoryLabel}</div>
                      <div className="text-xs font-mono font-semibold text-white mt-1">
                        {item.priceToman.toLocaleString()} تومان
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="حذف از سبد"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* DISCOUNT & CHECKOUT FOOTER */}
            {cartItems.length > 0 && (
              <div className="pt-4 border-t border-white/[0.08] space-y-4">
                
                {/* PROMO CODE */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="کد تخفیف (مثال: SIRENY20)"
                    className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/40"
                  />
                  <button
                    onClick={handleApplyDiscount}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.1] hover:bg-white/[0.2] text-white transition-colors cursor-pointer"
                  >
                    اعمال
                  </button>
                </div>

                {discountApplied && (
                  <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> تخفیف ۲۰ درصدی با موفقیت اعمال شد!
                  </div>
                )}

                {/* TOTAL */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#afafaf]">مبلغ کل قابل پرداخت:</span>
                  <span className="font-bold text-white font-mono text-base">
                    {cartTotalToman.toLocaleString()} تومان
                  </span>
                </div>

                {/* CHECKOUT BUTTON */}
                <button
                  onClick={handleCompleteCheckout}
                  disabled={checkoutSuccess}
                  className="w-full py-3.5 rounded-2xl bg-white text-black font-extrabold text-xs hover:bg-neutral-200 transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:bg-emerald-500 disabled:text-white"
                >
                  {checkoutSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>پرداخت موفق! پرامپت‌ها بازگشایی شدند</span>
                    </>
                  ) : (
                    <>
                      <span>تکمیل خرید و دریافت آنی پرامپت‌ها</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* BATCH DOWNLOAD BUTTON IF UNLOCKED */}
                {checkoutSuccess && (
                  <button
                    onClick={handleDownloadAllPurchased}
                    className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>دانلود همه پرامپت‌ها (.txt)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* ============================================================== */}
      {/* 9. PROMPT DETAILS & TEST MODAL                                */}
      {/* ============================================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 animate-in zoom-in-95 duration-200">
          <div className="bg-[#000104] border border-white/[0.12] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl">
            
            {/* IMAGE HALF */}
            <div className="w-full md:w-1/2 bg-black flex items-center justify-center p-6 relative">
              <img 
                src={selectedProduct.imageUrl} 
                alt={selectedProduct.title} 
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl" 
              />
              {selectedProduct.pinterestUrl && (
                <a
                  href={selectedProduct.pinterestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-4 left-4 bg-red-950/90 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>مشاهده در پینترست</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* DETAILS HALF */}
            <div className="w-full md:w-1/2 flex flex-col h-[65vh] md:h-auto bg-[#000104] p-6 sm:p-8 justify-between space-y-6 overflow-y-auto">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {selectedProduct.model}
                    </span>
                    <span className="text-[11px] text-[#afafaf]">{selectedProduct.categoryLabel}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="p-1 text-[#afafaf] hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-white font-display">
                  {selectedProduct.title}
                </h3>

                {/* CONTEXT & LIGHTING */}
                {selectedProduct.contextDesc && (
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> ساختار نورپردازی و پرسپکتیو:
                    </span>
                    <p className="text-xs text-[#afafaf] leading-relaxed">
                      {selectedProduct.contextDesc}
                    </p>
                  </div>
                )}

                {/* SPECS GRID */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-[#afafaf]/60">لنز کالیبره‌شده:</div>
                    <div className="font-mono text-white text-[11px] mt-0.5">{selectedProduct.specs.lens}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-[#afafaf]/60">زاویه و پرسپکتیو:</div>
                    <div className="font-mono text-white text-[11px] mt-0.5">{selectedProduct.specs.aspectRatio}</div>
                  </div>
                </div>

                {/* PROMPT BOX */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white">متن کامل پرامپت:</span>
                  <div className="p-4 rounded-2xl bg-black border border-white/[0.1] max-h-48 overflow-y-auto">
                    <p className="text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre-wrap">
                      {cleanPromptText(selectedProduct.prompt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-white/[0.08] flex flex-wrap gap-2.5">
                <button
                  onClick={() => handleCopyPrompt(selectedProduct.prompt, selectedProduct.id)}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === selectedProduct.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === selectedProduct.id ? 'پرامپت کپی شد!' : 'کپی پرامپت'}</span>
                </button>

                <button
                  onClick={() => handleDownloadSinglePrompt(selectedProduct)}
                  className="py-3 px-4 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.12] transition-all flex items-center gap-1.5 cursor-pointer"
                  title="دانلود فایل .txt"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>دانلود TXT</span>
                </button>

                <button
                  onClick={() => onTestInGemini(cleanPromptText(selectedProduct.prompt))}
                  className="py-3 px-4 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.12] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-yellow-400" />
                  <span>تست در جمینای</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
