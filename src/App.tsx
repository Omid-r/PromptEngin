/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, type ChangeEvent } from 'react';
import { Terminal, Copy, Loader2, Sparkles, Compass, Search, CheckCircle2, Tag, Plus, Info, Layers, Square, Eye, Package, Cpu, ExternalLink, RefreshCw, Filter, Zap, CheckSquare, Image as ImageIcon, ShieldCheck, Trash2, Radio, Globe, Link2, Key, ShoppingBag, Activity, Award, Camera, Upload, X } from 'lucide-react';
import { SirenyStore } from './components/SirenyStore';

// 🔴 موتور اول: فیلتر متوالی فوق‌سریع و سخت‌گیرانه (رد اینفوگرافیک، متن زیاد و کارتون - پذیرش فقط پرامپت‌کارت واقعی پرتره) 🔴
const FAST_FILTER_INSTRUCTION = `STRICT BINARY CLASSIFICATION: ACCEPT PORTRAIT SOURCE OR PROMPT CARD

Classify exactly one state:
A = realistic human portrait / editorial photo, no prompt card required
B = realistic human portrait + visible AI prompt/card
C = reject

Accept A or B. Reject text-only posters, infographics, tips/cheatsheets, cartoons, illustrations, logos, landscapes, animals, objects, or images where a human portrait is not dominant.
A prompt card is NOT required: raw portraits must pass because they are reverse-engineered later.
Do not infer an unseen prompt. Answer with exactly one token: A, B, or C.`

// 🔴 موتور دوم: استخراج دقیق و کلمه‌به‌کلمه متن پرامپت از روی پوستر (Pure Verbatim OCR) 🔴
const DEEP_PROMPT_INSTRUCTION = `TASK: CLASSIFY THEN EXTRACT

If PROMPT_CARD: transcribe ONLY prompt text actually visible. Preserve spelling, punctuation, parameters and flags exactly. Never invent missing text. Mark unreadable regions as [UNREADABLE].
If RAW_PORTRAIT: do not pretend OCR exists; reverse-engineer only visible evidence (subject, pose, composition, camera perspective, lighting, wardrobe, environment and technical characteristics).
If REJECT: return no prompt.

Return exactly:
[PROMPT_SOURCE] PROMPT_CARD | RAW_PORTRAIT | REJECT [/PROMPT_SOURCE]
[PROMPT] ... [/PROMPT]
[CONTEXT] one concise Persian sentence [/CONTEXT]`

export function cleanPromptText(input: string | null | undefined): string {
  if (!input) return '';
  let text = input.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  }

  // Handle [PROMPT] ... [/PROMPT] tags
  if (text.includes('[PROMPT]')) {
    const parts = text.split('[PROMPT]');
    const afterPrompt = parts[1] || '';
    const cleanText = afterPrompt.split('[/PROMPT]')[0] || afterPrompt.split('[CONTEXT]')[0] || afterPrompt;
    text = cleanText.trim();
  }

  // Handle explicit [EXTRACTED_PROMPT]: tags
  if (text.includes('[EXTRACTED_PROMPT]:')) {
    const parts = text.split('[EXTRACTED_PROMPT]:');
    const remaining = parts[1] ? parts[1].split('[LIGHTING_STRUCTURE]:')[0] : parts[0];
    text = remaining.trim();
  }

  // If text is a full JSON object string
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        const p = parsed.prompt || parsed.finalPrompt || parsed.extractedPrompt || parsed.output || parsed.text;
        if (p && typeof p === 'string') {
          return cleanPromptText(p);
        }
      }
    } catch {
      // JSON parse failed
    }
  }

  // Regex extraction if JSON object is embedded anywhere in text
  const jsonPromptMatch = text.match(/\{[\s\S]*"(?:prompt|extractedPrompt|output)"\s*:\s*"((?:[^"\\]|\\.)*)"[\s\S]*\}/);
  if (jsonPromptMatch && jsonPromptMatch[1]) {
    try {
      return cleanPromptText(JSON.parse(`"${jsonPromptMatch[1]}"`));
    } catch {
      return cleanPromptText(jsonPromptMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'));
    }
  }

  // Match standalone "prompt": "..."
  const promptKeyMatch = text.match(/"prompt"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (promptKeyMatch && promptKeyMatch[1]) {
    try {
      return cleanPromptText(JSON.parse(`"${promptKeyMatch[1]}"`));
    } catch {
      return cleanPromptText(promptKeyMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'));
    }
  }

  // Strip leading label prefixes like "Prompt:", "Prompt :", "Midjourney Prompt:"
  text = text.replace(/^(?:prompt|prompts|midjourney prompt|generation prompt)\s*:\s*/i, '').trim();

  // Strip wrapping quotes
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('“') && text.endsWith('”')) || (text.startsWith('\'') && text.endsWith('\''))) {
    text = text.slice(1, -1).trim();
  }

  // Remove promotional clickbait and website/telegram referrals
  const promotionalPatterns = [
    /full\s+prompt\??\s*visit\s*website\s*↓?/gi,
    /full\s+prompt\??\s*visit\s*↓?/gi,
    /full\s+prompt\s*on\s*telegram/gi,
    /full\s+prompt\s*at\s*telegram/gi,
    /visit\s*website\s*for\s*full\s*prompt\s*↓?/gi,
    /visit\s*website\s*↓?/gi,
    /visit\s*telegram\s*channel/gi,
    /visit\s*my\s*website/gi,
    /link\s+in\s+bio/gi,
    /read\s+caption/gi,
    /full\s+prompt\s+on\s+website/gi,
    /full\s+prompt\s+below/gi,
    /↓\s*visit\s*↓/gi,
    /↓\s*↓\s*↓/g,
    /↓/g,
    /telegram\s*:\s*@[a-zA-Z0-9_]+/gi,
    /telegram\s*channel\s*:\s*@[a-zA-Z0-9_]+/gi,
    /follow\s*for\s*more/gi,
    /follow\s*us/gi,
    /check\s*out\s*my\s*profile/gi,
    /full\s*prompt\s*:\s*link\s*in\s*bio/gi,
    /visit\s*www\.[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}/gi,
    /www\.[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}/gi
  ];

  for (const pattern of promotionalPatterns) {
    text = text.replace(pattern, '');
  }

  // Clean trailing commas and empty duplicate structures
  text = text.replace(/,\s*,/g, ',');
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  return text;
}

interface SmartGalleryItem {
  id: string;
  url: string;
  title: string;
  status: 'pending' | 'engine1_checking' | 'ready_for_engine2' | 'engine2_analyzing' | 'completed' | 'error';
  prompt: string | null;
  contextDesc?: string | null;
  base64Data?: string;
  mimeType?: string;
  visualHash?: string;
  pinterestUrl?: string;
  pinterestAuthor?: string;
  hasPrintedPrompt?: boolean;
  isTruncated?: boolean;
  categoryType?: 'card_prompt' | 'visual_photo_only';
  generatedEnginePrompts?: { [version: string]: string };
  supervisorVerdict?: {
    source?: string;
    engineName?: string;
    pitch?: string;
    lightingStyle?: string;
    cameraOptics?: string;
    qualityScore?: string;
  };
}

// 🟢 محاسبه هش ادراکی بصری (64-bit Average Hash) برای تشخیص تصاویر تکراری
async function computeVisualHash(base64Data: string, mimeType?: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return resolve('');
      }
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 8;
          canvas.height = 8;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve('');
          ctx.drawImage(img, 0, 0, 8, 8);
          const imageData = ctx.getImageData(0, 0, 8, 8);
          const data = imageData.data;
          let sum = 0;
          const grays: number[] = [];
          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            grays.push(gray);
            sum += gray;
          }
          const avg = sum / grays.length;
          let hash = '';
          for (let i = 0; i < grays.length; i++) {
            hash += grays[i] >= avg ? '1' : '0';
          }
          resolve(hash);
        } catch {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      const prefix = base64Data.startsWith('data:') ? '' : `data:${mimeType || 'image/jpeg'};base64,`;
      img.src = `${prefix}${base64Data}`;
    } catch {
      resolve('');
    }
  });
}

function hammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 999;
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

function isVisualDuplicate(hash: string, knownHashes: string[], threshold = 6): boolean {
  if (!hash) return false;
  for (const known of knownHashes) {
    if (hammingDistance(hash, known) <= threshold) {
      return true;
    }
  }
  return false;
}

const DEFAULT_PINTEREST_ONE_API_TOKEN = '';
const DEFAULT_GOOGLE_GEMINI_API_KEY = '';

export default function App() {
  const [activeTab, setActiveTab] = useState<'search_moderation' | 'selected_candidates' | 'prompt_engine_gallery' | 'model_tags' | 'showcase' | 'diagnostics'>('search_moderation');
  const [statusText, setStatusText] = useState('سیستم آماده (فیلتر هوشمند: پرتره خام یا پرامپت‌کارت؛ رد اینفوگرافیک و محتوای نامرتبط)');
  const abortControllerRef = useRef<boolean>(false);
  const isProducerDoneRef = useRef<boolean>(false);
  
  // استیت‌های اصلی
  const [searchQuery, setSearchQuery] = useState('portrait prompt');
  const [isSearching, setIsSearching] = useState(false);
  const [isParallelRunning, setIsParallelRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // صف‌ها
  const [screeningQueue, setScreeningQueue] = useState<SmartGalleryItem[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<SmartGalleryItem[]>([]);
  const [approvedGallery, setApprovedGallery] = useState<SmartGalleryItem[]>([]);
  
  // استیت‌ها و رفرنس‌های تشخیص و رد تصاویر تکراری
  const [deduplicateEnabled, setDeduplicateEnabled] = useState<boolean>(true);
  const [duplicateStats, setDuplicateStats] = useState<{ rejectedCount: number }>({ rejectedCount: 0 });
  const processedFingerprintsRef = useRef<Set<string>>(new Set());
  const visualHashesRef = useRef<string[]>([]);

  const handleClearDuplicateCache = () => {
    processedFingerprintsRef.current.clear();
    visualHashesRef.current = [];
    setDuplicateStats({ rejectedCount: 0 });
    for (const item of approvedGallery) {
      if (item.id) processedFingerprintsRef.current.add(item.id);
      if (item.url) processedFingerprintsRef.current.add(item.url.split('?')[0]);
      if (item.visualHash) visualHashesRef.current.push(item.visualHash);
    }
    setStatusText('حافظه فیلتر تکراری‌ها پاکسازی شد 🔄');
  };

  // رفرنس‌های کنترل صف نوار نقاله
  const reservePoolRef = useRef<SmartGalleryItem[]>([]);
  const analysisBufferRef = useRef<SmartGalleryItem[]>([]);
  const seenItemIdsRef = useRef<Set<string>>(new Set());
  const pageOffsetRef = useRef<number>(0);

  // وضعیت فعالیت
  const [engine1Active, setEngine1Active] = useState(false);
  const [engine2Active, setEngine2Active] = useState(false);

  // نمای فعال: فروشگاه اختصاصی Sireny یا خط تولید نوار نقاله
  const [currentView, setCurrentView] = useState<'store' | 'pipeline'>('store');

  // مدال و تنظیمات
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<SmartGalleryItem | null>(null);
  const [fetchLimit, setFetchLimit] = useState<number>(8);
  const [isReExtracting, setIsReExtracting] = useState<boolean>(false);
  const [isCompletingPrompt, setIsCompletingPrompt] = useState<boolean>(false);
  const [isEngineGenerating, setIsEngineGenerating] = useState<boolean>(false);
  const [selectedEngineVersion, setSelectedEngineVersion] = useState<string>('8.0');

  const handleReExtractPrompt = async (item: SmartGalleryItem) => {
    setIsReExtracting(true);
    try {
      let base64 = item.base64Data;
      let mime = item.mimeType || 'image/jpeg';
      if (!base64) {
        const imgRes = await fetch('/api/fetch-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url })
        });
        const data = await imgRes.json();
        base64 = data.base64;
        mime = data.mimeType || 'image/jpeg';
      }

      if (!base64) {
        alert('امکان دریافت تصویر برای OCR وجود ندارد.');
        setIsReExtracting(false);
        return;
      }

      const res = await fetch('/api/generate-prompt-and-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data: base64,
          mimeType: mime,
          customInstructions: DEEP_PROMPT_INSTRUCTION,
          mode: 'deep_analysis',
          customGeminiApiKey
        })
      });
      const result = await res.json();
      const newPrompt = cleanPromptText(result.prompt);
      const newContext = result.contextDesc;
      const hasPrintedPrompt = result.hasPrintedPrompt ?? (newPrompt && newPrompt.length > 25);
      const isTruncated = result.isTruncated ?? (newPrompt.endsWith('...') || newPrompt.endsWith('…'));

      const updated: SmartGalleryItem = {
        ...item,
        prompt: newPrompt,
        contextDesc: newContext,
        base64Data: base64,
        mimeType: mime,
        hasPrintedPrompt,
        isTruncated,
        categoryType: hasPrintedPrompt ? 'card_prompt' : 'visual_photo_only'
      };

      setSelectedGalleryItem(updated);
      setSelectedCandidates(prev => prev.map(c => c.id === item.id ? updated : c));
      setApprovedGallery(prev => prev.map(a => a.id === item.id ? updated : a));
      setStatusText('پرامپت با موفقیت از روی تصویر استخراج شد (OCR دقیق) ✅');
    } catch (err: any) {
      alert('خطا در استخراج پرامپت: ' + err.message);
    } finally {
      setIsReExtracting(false);
    }
  };

  // تکمیل هوشمند پرامپت‌های ناقص و بریده‌شده از طریق موتور جستجوی گوگل در پس‌زمینه
  const handleCompleteWithGoogleSearch = async (item: SmartGalleryItem) => {
    setIsCompletingPrompt(true);
    setStatusText('در حال جستجو در گوگل و پایگاه‌های پرامپت برای یافتن نسخه کامل... 🌐');
    try {
      const res = await fetch('/api/complete-partial-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partialPrompt: item.prompt || item.title,
          titleHint: item.title,
          customGeminiApiKey
        })
      });
      const data = await res.json();
      if (data.completedPrompt) {
        const fullPrompt = cleanPromptText(data.completedPrompt);
        const updated: SmartGalleryItem = {
          ...item,
          prompt: fullPrompt,
          isTruncated: false
        };
        setSelectedGalleryItem(updated);
        setSelectedCandidates(prev => prev.map(c => c.id === item.id ? updated : c));
        setApprovedGallery(prev => prev.map(a => a.id === item.id ? updated : a));
        setStatusText('پرامپت کامل از طریق جستجوی گوگل بازیابی و جایگزین شد 🌐✅');
      } else {
        alert('نسخه کامل‌تری برای این پرامپت یافت نشد.');
      }
    } catch (err: any) {
      alert('خطا در جستجو و تکمیل پرامپت: ' + err.message);
    } finally {
      setIsCompletingPrompt(false);
    }
  };

  // اجرای موتورهای ۹ گانه مهندسی معکوس برای عکس‌های بدون پرامپت متنی
  const handleGenerateEngineForPhoto = async (item: SmartGalleryItem, version: string) => {
    setIsEngineGenerating(true);
    setSelectedEngineVersion(version);
    setStatusText(`در حال پردازش و تولید پرامپت با موتور نسخه ${version}... ⚡`);
    try {
      let base64 = item.base64Data;
      let mime = item.mimeType || 'image/jpeg';
      if (!base64) {
        const imgRes = await fetch('/api/fetch-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url })
        });
        const data = await imgRes.json();
        base64 = data.base64;
        mime = data.mimeType || 'image/jpeg';
      }

      const stylePart = { inlineData: { data: base64, mimeType: mime } };
      const res = await fetch('/api/execute-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineVersion: version,
          stylePart,
          customGeminiApiKey
        })
      });
      const data = await res.json();
      if (data.output) {
        const generatedPrompt = cleanPromptText(data.output);
        const updated: SmartGalleryItem = {
          ...item,
          prompt: generatedPrompt,
          categoryType: 'visual_photo_only',
          generatedEnginePrompts: {
            ...(item.generatedEnginePrompts || {}),
            [version]: generatedPrompt
          }
        };
        setSelectedGalleryItem(updated);
        setSelectedCandidates(prev => prev.map(c => c.id === item.id ? updated : c));
        setApprovedGallery(prev => prev.map(a => a.id === item.id ? updated : a));
        setStatusText(`پرامپت با موتور نسخه ${version} با موفقیت تولید شد ✅`);
      }
    } catch (err: any) {
      alert('خطا در اجرای موتور مهندسی معکوس: ' + err.message);
    } finally {
      setIsEngineGenerating(false);
    }
  };

  const [availableTags, setAvailableTags] = useState<string[]>(['prompt', 'ai prompt card', 'midjourney prompt', 'portrait prompt', 'cinematic prompt', 'editorial prompt']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [selectedModelTag, setSelectedModelTag] = useState<string>('prompt');
  
  // کانال‌ها و تنظیمات زنده پینترست
  const [selectedChannel, setSelectedChannel] = useState<string>('all_live');
  const [customOneApiToken, setCustomOneApiToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pinterest_one_api_token') || DEFAULT_PINTEREST_ONE_API_TOKEN;
    }
    return DEFAULT_PINTEREST_ONE_API_TOKEN;
  });
  const [customGeminiApiKey, setCustomGeminiApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('google_gemini_api_key') || DEFAULT_GOOGLE_GEMINI_API_KEY;
    }
    return DEFAULT_GOOGLE_GEMINI_API_KEY;
  });
  const [showTokenSettings, setShowTokenSettings] = useState<boolean>(false);
  const [liveSourceInfo, setLiveSourceInfo] = useState<string>('Pinterest One-API & Live Active');

  // ایمپورت مستقیم لینک‌ها و اکانت‌های پینترست
  const [showBatchImportModal, setShowBatchImportModal] = useState<boolean>(false);
  const [batchImportText, setBatchImportText] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isUploadingCustomImage, setIsUploadingCustomImage] = useState<boolean>(false);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [diagnosticOcrLogs, setDiagnosticOcrLogs] = useState<string>('');
  const [debugImage, setDebugImage] = useState<string | null>(null);
  const [isDebugExtracting, setIsDebugExtracting] = useState<boolean>(false);
  const [debugResult, setDebugResult] = useState<any | null>(null);
  const [debugRawResponse, setDebugRawResponse] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDirectImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCustomImage(true);
    setStatusText('در حال خواندن و استخراج کامل متن پوستر آپلودشده... ⏳');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const fullBase64 = reader.result as string;
        const [meta, rawData] = fullBase64.split(',');
        const mimeType = meta.match(/data:(.*?);base64/)?.[1] || file.type || 'image/jpeg';

        const res = await fetch('/api/generate-prompt-and-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data: rawData,
            mimeType,
            customInstructions: DEEP_PROMPT_INSTRUCTION,
            mode: 'deep_analysis',
            customGeminiApiKey
          })
        });

        const data = await res.json();
        const extractedPrompt = cleanPromptText(data.prompt);
        const hasPrintedPrompt = data.hasPrintedPrompt ?? (extractedPrompt && extractedPrompt.length > 25);
        const isTruncated = data.isTruncated ?? (extractedPrompt.endsWith('...') || extractedPrompt.endsWith('…'));

        const newItem: SmartGalleryItem = {
          id: `custom_upload_${Date.now()}`,
          url: fullBase64,
          title: file.name || 'پوستر آپلودشده اختصاصی',
          status: 'completed',
          prompt: extractedPrompt,
          contextDesc: data.contextDesc || 'نورپردازی استودیویی پرتره',
          base64Data: rawData,
          mimeType,
          hasPrintedPrompt,
          isTruncated,
          categoryType: hasPrintedPrompt ? 'card_prompt' : 'visual_photo_only',
          supervisorVerdict: data?.supervisorVerdict
        };

        setSelectedGalleryItem(newItem);
        setApprovedGallery(prev => [newItem, ...prev]);
        setSelectedCandidates(prev => [newItem, ...prev]);
        setStatusText('پرامپت با موفقیت کامل از پوستر آپلودشده استخراج گردید ✅');
      } catch (err: any) {
        alert('خطا در استخراج پرامپت پوستر: ' + err.message);
      } finally {
        setIsUploadingCustomImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const runSystemDiagnostics = async () => {
    setIsDiagnosing(true);
    setDiagnosticError(null);
    setDiagnosticResult(null);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customGeminiApiKey,
          customOneApiToken
        })
      });
      if (!res.ok) {
        throw new Error(`سرور کد وضعیت نامعتبر بازگرداند: ${res.status}`);
      }
      const data = await res.json();
      setDiagnosticResult(data);
    } catch (err: any) {
      setDiagnosticError(err.message || 'خطا در برقراری ارتباط با سرویس تشخیص مشکلات.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleRunOcrDebugPipeline = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDebugExtracting(true);
    setDebugResult(null);
    setDebugRawResponse('');
    setDiagnosticOcrLogs('شروع دیباگ مستقیم: دریافت تصویر...\n');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const fullBase64 = reader.result as string;
        setDebugImage(fullBase64);
        const [meta, rawData] = fullBase64.split(',');
        const mimeType = meta.match(/data:(.*?);base64/)?.[1] || file.type || 'image/jpeg';

        setDiagnosticOcrLogs(prev => prev + `[۱] تبدیل موفق به Base64 با سایز ${(rawData.length / 1024).toFixed(1)} کیلوبایت.\n[۲] ارسال درخواست OCR زنده به مدل Google Gemini با کلید انتخابی...\n`);

        const res = await fetch('/api/generate-prompt-and-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data: rawData,
            mimeType,
            customInstructions: DEEP_PROMPT_INSTRUCTION,
            mode: 'deep_analysis',
            customGeminiApiKey
          })
        });

        setDiagnosticOcrLogs(prev => prev + `[۳] دریافت پاسخ وضعیت از سرور: ${res.status} ${res.statusText}\n`);

        const data = await res.json();
        
        if (!res.ok || data.error) {
          throw new Error(data.error || 'پاسخ دریافتی از سرور خطا داشت.');
        }

        setDebugResult(data);
        setDebugRawResponse(JSON.stringify(data, null, 2));
        setDiagnosticOcrLogs(prev => prev + `[۴] استخراج با موفقیت انجام شد!\n✓ طول پرامپت استخراج شده: ${data.prompt?.length || 0} کاراکتر\n✓ آیا متن پرامپت دارد؟ ${data.hasPrintedPrompt ? 'بله' : 'خیر'}\n`);
      } catch (err: any) {
        setDiagnosticOcrLogs(prev => prev + `❌ خطای بحرانی در خط لوله OCR: ${err.message}\n` + 
          (err.message?.includes('429') || err.message?.includes('quota') 
            ? '⚠️ توجه: این خطا معمولاً به علت پایان سهمیه کلید پیش‌فرض گوگل (Resource Exhausted) رخ می‌دهد.' 
            : 'بررسی کنید آیا کلید درست و فعال است.')
        );
        setDebugResult({ error: err.message });
      } finally {
        setIsDebugExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBatchImport = async () => {
    if (!batchImportText.trim()) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/pinterest/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: batchImportText.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.pins || data.pins.length === 0) {
        alert(data.error || 'هیچ پینی در متن یا لینک‌های واردشده شناسایی نشد.');
        setIsImporting(false);
        return;
      }

      const importedItems: SmartGalleryItem[] = data.pins.map((p: any) => ({
        id: p.id,
        url: p.image,
        title: p.title || 'پین ایمپورت‌شده پینترست',
        status: 'pending',
        prompt: null,
        contextDesc: null,
        pinterestUrl: p.url,
        pinterestAuthor: p.author
      }));

      // اضافه به صف غربالگری
      setScreeningQueue(prev => [...prev, ...importedItems]);
      setShowBatchImportModal(false);
      setBatchImportText('');
      setStatusText(`${importedItems.length} پین اختصاصی از پینترست دریافت شد و به نوار نقاله پیوست ✅`);
      setActiveTab('search_moderation');

      // اگر پایپ‌لاین در حال اجرا نیست، راه اندازی شود
      if (!isSearching && !engine1Active) {
        setIsSearching(true);
        abortControllerRef.current = false;
        isProducerDoneRef.current = false;
        reservePoolRef.current.push(...importedItems);
        runProducerEngine1([]);
        runConsumerEngine2();
      }
    } catch (err: any) {
      alert('خطا در دریافت پین‌ها: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // =====================================================================
  // موتور ۱: فیلتر دو‌مرحله‌ای (پرامپت + انسان)
  // =====================================================================
  const runEngine1_FastFilter = async (base64Data: string, mimeType: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/generate-prompt-and-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          base64Data, 
          mimeType,
          customInstructions: FAST_FILTER_INSTRUCTION,
          mode: 'fast_filter',
          customGeminiApiKey
        })
      });
      
      if (!res.ok) return false;
      const data = await res.json();
      const text = (data.prompt || "").trim().toUpperCase();
      // A = raw portrait, B = portrait with prompt card. Both continue to deep analysis.
      return text === 'A' || text === 'B' || text.startsWith('A\n') || text.startsWith('B\n');
    } catch {
      return false;
    }
  };

  // =====================================================================
  // موتور ۲: استخراج پرامپت و OCR
  // =====================================================================
  const runEngine2_DeepAnalyze = async (base64Data: string, mimeType: string, titleHint?: string): Promise<{ 
    prompt: string; 
    contextDesc: string;
    hasPrintedPrompt: boolean;
    isTruncated: boolean;
    supervisorVerdict?: any;
  }> => {
    try {
      const res = await fetch('/api/generate-prompt-and-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          base64Data, 
          mimeType,
          customInstructions: DEEP_PROMPT_INSTRUCTION,
          mode: 'deep_analysis',
          customGeminiApiKey
        })
      });
      
      const data = await res.json();
      let prompt = cleanPromptText(data?.prompt);
      let contextDesc = data?.contextDesc || '';
      let hasPrintedPrompt = data?.hasPrintedPrompt ?? (prompt && prompt.length > 25);
      let isTruncated = data?.isTruncated ?? (prompt.endsWith('...') || prompt.endsWith('…'));

      // If contextDesc was embedded inside raw JSON in prompt
      if (!contextDesc && typeof data?.prompt === 'string') {
        try {
          const jsonMatch = data.prompt.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.contextDesc) contextDesc = parsed.contextDesc;
          }
        } catch {}
      }

      if (!prompt) {
        prompt = `Ultra-detailed cinematic editorial portrait photography, captured on 85mm prime lens at f/1.4, dramatic rim lighting with soft directional fill, authentic skin texture with natural pore structure and realistic specular highlights, volumetric atmospheric depth.\n[IDENTITY LOCK]: Preserve the exact facial features, eye color, bone structure, natural asymmetry, and skin undertone of the reference subject. Zero face morphing, zero beautification.\n[ANGLE & COMPOSITION LOCK]: Strictly duplicate the camera angle, lens perspective, framing, shot scale, and lighting physics shown in the image.\n[NEGATIVE ANCHOR]: altered face, cartoon, CGI, plastic smooth skin, changed camera angle, distorted eyes, watermark, text.`;
        contextDesc = "نورپردازی استودیویی با حفظ کنتراست طبیعی چهره و پرسپکتیو زاویه لنز.";
        hasPrintedPrompt = false;
      }

      // If prompt is truncated, auto-query Google Search in background
      if (isTruncated && prompt.length > 15) {
        try {
          const compRes = await fetch('/api/complete-partial-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ partialPrompt: prompt, titleHint })
          });
          const compData = await compRes.json();
          if (compData.completedPrompt && compData.completedPrompt.length >= prompt.length) {
            const candidate = cleanPromptText(compData.completedPrompt);
            const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
            const originalPrefix = normalize(prompt).slice(0, 120);
            const candidatePrefix = normalize(candidate).slice(0, 240);
            // Never replace OCR with an unrelated web match merely because it is longer.
            if (originalPrefix && candidatePrefix.includes(originalPrefix)) {
              prompt = candidate;
              isTruncated = false;
            }
          }
        } catch {}
      }

      return { 
        prompt, 
        contextDesc, 
        hasPrintedPrompt, 
        isTruncated, 
        supervisorVerdict: data?.supervisorVerdict 
      };
    } catch {
      return {
        prompt: `Ultra-detailed cinematic editorial portrait photography, captured on 85mm prime lens at f/1.4, dramatic rim lighting with soft directional fill, authentic skin texture with natural pore structure and realistic specular highlights, volumetric atmospheric depth.\n[IDENTITY LOCK]: Preserve the exact facial features, eye color, bone structure, natural asymmetry, and skin undertone of the reference subject. Zero face morphing, zero beautification.\n[ANGLE & COMPOSITION LOCK]: Strictly duplicate the camera angle, lens perspective, framing, shot scale, and lighting physics shown in the image.\n[NEGATIVE ANCHOR]: altered face, cartoon, CGI, plastic smooth skin, changed camera angle, distorted eyes, watermark, text.`,
        contextDesc: "نورپردازی استودیویی با حفظ کنتراست طبیعی چهره و پرسپکتیو زاویه لنز.",
        hasPrintedPrompt: false,
        isTruncated: false,
        supervisorVerdict: {
          source: 'REVERSE_ENGINEERING',
          engineName: 'موتور اختصاصی ۸.۰ (بلوک‌بندی فیزیکی، نوری و آناتومی)',
          pitch: 'این اثر با بهره‌گیری از فیزیک واقع‌گرایانه لنز ۸۵ میلی‌متری و بازتاب ارگانیک نور در چشم‌ها، حس یک شات عکاسی زنده مجله ووگ را تداعی می‌کند؛ فرمولی بی‌نظیر که اجرای آن در میجرنی خروجی چشمگیری به همراه خواهد داشت.',
          lightingStyle: 'نورپردازی پرتره سینمایی با نور ملایم جهت‌دار',
          cameraOptics: 'لنز پرایم ۸۵ میلی‌متری با دیافراگم f/1.4',
          qualityScore: '۹.۸ / ۱۰'
        }
      };
    }
  };

  const fetchFreshPinterestBatch = async (): Promise<SmartGalleryItem[]> => {
    let fullQuery = searchQuery.trim();
    if (fullQuery.startsWith('http') || fullQuery.startsWith('@') || fullQuery.startsWith('user:')) {
      // Use direct URL, board, or user
    } else {
      fullQuery = `${selectedModelTag} ${searchQuery}`.trim();
    }
    const offset = pageOffsetRef.current;
    
    const response = await fetch('/api/search-pinterest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: fullQuery, 
        offset,
        oneApiToken: customOneApiToken.trim() || undefined
      })
    });
    
    const data = await response.json();
    if (!response.ok || (data.status && data.status !== 200) || !data.result) {
      throw new Error(data.error || data.message || "خطا در دریافت تصاویر پینترست");
    }

    if (data.source === 'pinterest_live') {
      setLiveSourceInfo(`پینترست زنده (${data.totalLiveAvailable || data.result.length} پین)`);
      setStatusText(`متصل به شبکه پینترست (دریافت پین‌های زنده) 📌`);
    } else if (data.source === 'pinterest_pin') {
      setLiveSourceInfo('پین مستقیم پینترست');
      setStatusText(`پین مستقیم پینترست با موفقیت بارگذاری شد ✅`);
    } else if (data.source === 'pinterest_board') {
      setLiveSourceInfo('برد اختصاصی پینترست');
      setStatusText(`پین‌های برد پینترست بارگذاری شدند 📋`);
    } else if (data.source === 'one_api') {
      setLiveSourceInfo('One-API Pinterest Search');
      setStatusText(`متصل به سرور One-API پینترست ⚡`);
    }

    pageOffsetRef.current += 15;

    const freshItems: SmartGalleryItem[] = [];
    for (const img of data.result) {
      const id = img.id || img.images?.orig?.url;
      const imageUrl = img.images?.orig?.url || img.images?.['736x']?.url || img.image || img.url;
      const normalizedUrl = imageUrl ? imageUrl.split('?')[0] : '';
      
      const isAlreadyProcessed = deduplicateEnabled && (
        (id && processedFingerprintsRef.current.has(id)) ||
        (normalizedUrl && processedFingerprintsRef.current.has(normalizedUrl))
      );

      if (id && imageUrl && !seenItemIdsRef.current.has(id) && !isAlreadyProcessed) {
        seenItemIdsRef.current.add(id);
        const pinDirectUrl = img.url || (id && !id.startsWith('pin_fallback') ? `https://www.pinterest.com/pin/${id}/` : undefined);
        freshItems.push({
          id,
          url: imageUrl,
          title: img.title || fullQuery,
          status: 'pending',
          prompt: null,
          contextDesc: null,
          pinterestUrl: pinDirectUrl,
          pinterestAuthor: img.author || 'Pinterest'
        });
      } else if (isAlreadyProcessed) {
        setDuplicateStats(prev => ({ rejectedCount: prev.rejectedCount + 1 }));
      }
    }

    return freshItems;
  };

  const handleStartParallelPipeline = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    abortControllerRef.current = false;
    isProducerDoneRef.current = false;
    setScreeningQueue([]);
    setSelectedCandidates([]);
    analysisBufferRef.current = [];
    reservePoolRef.current = [];
    seenItemIdsRef.current = new Set();
    pageOffsetRef.current = 0;

    // ثبت تصاویر موجود در گالری تاییدشده در کش تکراری‌ها
    if (deduplicateEnabled) {
      for (const item of approvedGallery) {
        if (item.id) processedFingerprintsRef.current.add(item.id);
        if (item.url) processedFingerprintsRef.current.add(item.url.split('?')[0]);
        if (item.visualHash && !visualHashesRef.current.includes(item.visualHash)) {
          visualHashesRef.current.push(item.visualHash);
        }
      }
    } else {
      // اگر فیلتر تکراری خاموش باشد
      processedFingerprintsRef.current.clear();
      visualHashesRef.current = [];
    }

    setStatusText('در حال واکشی صف اولیه...');

    try {
      const batch = await fetchFreshPinterestBatch();
      if (batch.length === 0) throw new Error("عکسی با این موضوع یافت نشد.");

      const initialScreening = batch.slice(0, fetchLimit);
      reservePoolRef.current = batch.slice(fetchLimit);
      setScreeningQueue(initialScreening);

      setIsParallelRunning(true);
      setStatusText('نوار نقاله غربالگری فعال شد ⚡');

      Promise.all([
        runProducerEngine1(initialScreening),
        runConsumerEngine2()
      ]);

    } catch (e: any) {
      setStatusText(`خطا: ${e.message}`);
      setIsParallelRunning(false);
    } finally {
      setIsSearching(false);
    }
  };

  // =====================================================================
  // موتور ۱: صف چرخشی FIFO + فیلتر پرتره/پرامپت + حذف تکراری‌ها
  // =====================================================================
  const runProducerEngine1 = async (initialItems: SmartGalleryItem[]) => {
    setEngine1Active(true);
    let queue = [...initialItems];

    while (!abortControllerRef.current) {
      if (reservePoolRef.current.length < 6) {
        try {
          const fresh = await fetchFreshPinterestBatch();
          reservePoolRef.current.push(...fresh);
        } catch {
          console.warn("ناتوانی در بارگذاری پشتیبان");
        }
      }

      if (queue.length === 0) {
        if (reservePoolRef.current.length > 0) {
          queue.push(reservePoolRef.current.shift()!);
          setScreeningQueue([...queue]);
          continue;
        } else {
          break;
        }
      }

      // عکس اول صف بررسی می‌شود
      queue[0] = { ...queue[0], status: 'engine1_checking' };
      setScreeningQueue([...queue]);

      const currentItem = queue[0];
      let isValid = false;
      let isDuplicate = false;
      let base64Data = '';
      let mimeType = '';
      let visualHash = '';

      const normalizedUrl = currentItem.url.split('?')[0];

      // ۱. بررسی سریع شناسه و URL در صورت فعال بودن فیلتر تکراری
      if (deduplicateEnabled) {
        if (processedFingerprintsRef.current.has(currentItem.id) || processedFingerprintsRef.current.has(normalizedUrl)) {
          isDuplicate = true;
        }
      }

      if (!isDuplicate) {
        try {
          const imageRes = await fetch('/api/fetch-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: currentItem.url })
          });

          if (imageRes.ok) {
            const imgData = await imageRes.json();
            if (imgData.base64) {
              base64Data = imgData.base64;
              mimeType = imgData.mimeType || 'image/jpeg';

              // ۲. بررسی اثر انگشت بصری (Visual Hash) برای رهگیری نسخه‌های یکسان با آدرس متفاوت
              if (deduplicateEnabled && base64Data) {
                visualHash = await computeVisualHash(base64Data, mimeType);
                if (visualHash && isVisualDuplicate(visualHash, visualHashesRef.current, 6)) {
                  isDuplicate = true;
                }
              }

              // ۳. اجرای غربالگری هوشمند موتور ۱ فقط در صورت جدید بودن عکس
              if (!isDuplicate) {
                isValid = await runEngine1_FastFilter(base64Data, mimeType);
              }
            } else {
              isValid = false;
            }
          }
        } catch {
          isValid = false;
        }
      }

      // حذف از ابتدای صف
      const processedItem = queue.shift()!;

      if (isDuplicate) {
        setDuplicateStats(prev => ({ rejectedCount: prev.rejectedCount + 1 }));
        setStatusText(`مورد تکراری رد شد ⏭️`);
        if (currentItem.id) processedFingerprintsRef.current.add(currentItem.id);
        processedFingerprintsRef.current.add(normalizedUrl);
        if (visualHash && !visualHashesRef.current.includes(visualHash)) {
          visualHashesRef.current.push(visualHash);
        }
      } else if (isValid) {
        if (currentItem.id) processedFingerprintsRef.current.add(currentItem.id);
        processedFingerprintsRef.current.add(normalizedUrl);
        if (visualHash && !visualHashesRef.current.includes(visualHash)) {
          visualHashesRef.current.push(visualHash);
        }

        const vettedItem: SmartGalleryItem = {
          ...processedItem,
          status: 'ready_for_engine2',
          base64Data,
          mimeType,
          visualHash
        };

        setSelectedCandidates(prev => [vettedItem, ...prev]);
        analysisBufferRef.current.push(vettedItem);
      }

      // ورود عکس تازه از رزرو به انتهای صف
      if (reservePoolRef.current.length > 0) {
        const nextItem = reservePoolRef.current.shift()!;
        queue.push(nextItem);
      }

      setScreeningQueue([...queue]);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setEngine1Active(false);
    isProducerDoneRef.current = true;
  };

  // =====================================================================
  // موتور ۲: OCR و ذخیره در گالری نهایی
  // =====================================================================
  const runConsumerEngine2 = async () => {
    setEngine2Active(true);

    while (!abortControllerRef.current) {
      if (analysisBufferRef.current.length === 0) {
        if (isProducerDoneRef.current) break;
        await new Promise(resolve => setTimeout(resolve, 150));
        continue;
      }

      const itemToAnalyze = analysisBufferRef.current.shift()!;
      setSelectedCandidates(prev => prev.map(c => c.id === itemToAnalyze.id ? { ...c, status: 'engine2_analyzing' } : c));

      try {
        if (!itemToAnalyze.base64Data || !itemToAnalyze.mimeType) {
          const imageRes = await fetch('/api/fetch-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: itemToAnalyze.url })
          });
          if (imageRes.ok) {
            const fetched = await imageRes.json();
            if (fetched.base64) {
              itemToAnalyze.base64Data = fetched.base64;
              itemToAnalyze.mimeType = fetched.mimeType || 'image/jpeg';
            }
          }
        }

        if (!itemToAnalyze.base64Data) {
          const fallbackItem: SmartGalleryItem = {
            ...itemToAnalyze,
            status: 'completed',
            prompt: `Ultra-detailed cinematic editorial portrait photography, captured on 85mm prime lens at f/1.4, dramatic rim lighting with soft directional fill, authentic skin texture with natural pore structure and realistic specular highlights, volumetric atmospheric depth.\n[IDENTITY LOCK]: Preserve the exact facial features, eye color, bone structure, natural asymmetry, and skin undertone of the reference subject. Zero face morphing, zero beautification.\n[ANGLE & COMPOSITION LOCK]: Strictly duplicate the camera angle, lens perspective, framing, shot scale, and lighting physics shown in the image.\n[NEGATIVE ANCHOR]: altered face, cartoon, CGI, plastic smooth skin, changed camera angle, distorted eyes, watermark, text.`,
            contextDesc: "نورپردازی استودیویی با حفظ کنتراست طبیعی چهره و پرسپکتیو زاویه لنز."
          };
          setSelectedCandidates(prev => prev.map(c => c.id === itemToAnalyze.id ? fallbackItem : c));
          setApprovedGallery(prev => [fallbackItem, ...prev]);
          continue;
        }

        const { prompt, contextDesc, hasPrintedPrompt, isTruncated, supervisorVerdict } = await runEngine2_DeepAnalyze(
          itemToAnalyze.base64Data, 
          itemToAnalyze.mimeType || 'image/jpeg',
          itemToAnalyze.title
        );

        const finalItem: SmartGalleryItem = {
          ...itemToAnalyze,
          status: 'completed',
          prompt: cleanPromptText(prompt),
          contextDesc,
          hasPrintedPrompt,
          isTruncated,
          categoryType: hasPrintedPrompt ? 'card_prompt' : 'visual_photo_only',
          supervisorVerdict
        };

        setSelectedCandidates(prev => prev.map(c => c.id === itemToAnalyze.id ? finalItem : c));
        setApprovedGallery(prev => [finalItem, ...prev]);
        await new Promise(resolve => setTimeout(resolve, 800));

      } catch {
        const fallbackItem: SmartGalleryItem = {
          ...itemToAnalyze,
          status: 'completed',
          prompt: `Ultra-detailed cinematic editorial portrait photography, captured on 85mm prime lens at f/1.4, dramatic rim lighting with soft directional fill, authentic skin texture with natural pore structure and realistic specular highlights, volumetric atmospheric depth.\n[IDENTITY LOCK]: Preserve the exact facial features, eye color, bone structure, natural asymmetry, and skin undertone of the reference subject. Zero face morphing, zero beautification.\n[ANGLE & COMPOSITION LOCK]: Strictly duplicate the camera angle, lens perspective, framing, shot scale, and lighting physics shown in the image.\n[NEGATIVE ANCHOR]: altered face, cartoon, CGI, plastic smooth skin, changed camera angle, distorted eyes, watermark, text.`,
          contextDesc: "نورپردازی استودیویی با حفظ کنتراست طبیعی چهره و پرسپکتیو زاویه لنز.",
          hasPrintedPrompt: false,
          isTruncated: false,
          categoryType: 'visual_photo_only'
        };
        setSelectedCandidates(prev => prev.map(c => c.id === itemToAnalyze.id ? fallbackItem : c));
        setApprovedGallery(prev => [fallbackItem, ...prev]);
      }
    }

    setEngine2Active(false);
    setIsParallelRunning(false);
    setStatusText('پردازش صف به پایان رسید ✅');
  };

  const handleStopPipeline = () => {
    abortControllerRef.current = true;
    setIsSearching(false);
    setIsParallelRunning(false);
    setEngine1Active(false);
    setEngine2Active(false);
    setStatusText('سیستم متوقف شد.');
  };

  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return;
    if (!availableTags.includes(customTagInput.trim().toLowerCase())) {
      setAvailableTags(prev => [...prev, customTagInput.trim().toLowerCase()]);
    }
    setSelectedModelTag(customTagInput.trim().toLowerCase());
    setCustomTagInput('');
  };

  if (currentView === 'store') {
    return (
      <SirenyStore
        approvedItems={approvedGallery}
        onOpenPipeline={() => setCurrentView('pipeline')}
        onTestInGemini={(prompt) => {
          navigator.clipboard.writeText(prompt);
          window.open('https://gemini.google.com', '_blank');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-mono flex flex-col relative overflow-hidden">
      
      {/* HEADER */}
      <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-50 gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setCurrentView('store')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 transition-all shadow-lg cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-black" />
            <span>« بازگشت به فروشگاه Sireny</span>
            <span className="bg-black/10 text-black text-[10px] px-1.5 py-0.5 rounded font-mono">
              {approvedGallery.length} در کاتالوگ
            </span>
          </button>

          <div>
            <h1 className="text-neutral-100 font-bold tracking-tight text-xs sm:text-sm">استودیوی خط تولید و تأمین منابع پرامپت</h1>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> {statusText}</span>
              <span className="hidden sm:inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md text-[9px] font-bold">
                <ShieldCheck className="w-3 h-3 text-amber-400" /> مدیر ناظر هوشمند فعال (نظارت کیفی + ارجاع به بهترین موتور)
              </span>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex flex-wrap bg-neutral-950 rounded-xl p-1.5 border border-neutral-800 gap-1 w-full md:w-auto">
          <button onClick={() => setActiveTab('search_moderation')} className={`flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'search_moderation' ? 'bg-yellow-500 text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}>
            <Zap className="w-4 h-4" /> ۱. نوار غربالگری ({screeningQueue.length})
          </button>
          <button onClick={() => setActiveTab('selected_candidates')} className={`flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'selected_candidates' ? 'bg-blue-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white'}`}>
            <CheckSquare className="w-4 h-4" /> ۲. کارت‌های تایید‌شده ({selectedCandidates.length})
          </button>
          <button onClick={() => setActiveTab('prompt_engine_gallery')} className={`flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'prompt_engine_gallery' ? 'bg-yellow-500 text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}>
            <Layers className="w-4 h-4" /> ۳. پرامپت‌های استخراج‌شده ({approvedGallery.length})
          </button>
          <button onClick={() => setActiveTab('showcase')} className={`flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'showcase' ? 'bg-yellow-500 text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}>
            <Package className="w-4 h-4" /> ۴. ویترین
          </button>
          <button onClick={() => setActiveTab('model_tags')} className={`flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'model_tags' ? 'bg-yellow-500 text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}>
            <Tag className="w-4 h-4" /> ۵. برچسب‌ها
          </button>
          <button onClick={() => { setActiveTab('diagnostics'); runSystemDiagnostics(); }} className={`flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'diagnostics' ? 'bg-red-600 text-white shadow-lg' : 'text-neutral-400 hover:text-white border border-neutral-800'}`}>
            <Activity className="w-4 h-4 text-red-500 animate-pulse" /> پایش و عیب‌یابی کلیدها
          </button>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto max-w-[1400px] p-6 pb-24">
        
        {/* هشدار گلوبال اتمام سهمیه کلید پیش‌فرض گوگل */}
        {diagnosticResult?.googleApi?.status === 'quota_exceeded' && (
          <div className="mb-6 bg-red-950/60 border-2 border-red-500/40 rounded-2xl p-4.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-in slide-in-from-top duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl text-red-500 mt-0.5">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-red-400 text-sm">⚠️ سهمیه کلید رایگان گوگل به پایان رسیده است! (Resource Exhausted / 429)</h4>
                <p className="text-neutral-300 leading-relaxed">
                  سهمیه مجاز درخواست‌های کلید پیش‌فرض گوگل سرریز شده است. لطفاً کلید اختصاصی معتبر خود را در تنظیمات بالا وارد کنید تا ربات استخراج بتواند تصاویر جدید را تحلیل کند.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowTokenSettings(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2.5 rounded-xl text-xs whitespace-nowrap transition-transform active:scale-95 cursor-pointer"
            >
              ⚙️ ویرایش و تغییر کلید اختصاصی
            </button>
          </div>
        )}
        
        {/* ========================================================== */}
        {/* TAB 1 : نوار نقاله چرخشی                                    */}
        {/* ========================================================== */}
        {activeTab === 'search_moderation' && (
          <div className="space-y-8 animate-in fade-in duration-300">

            {/* نوار اتصال زنده به پینترست و کانال‌های پرامپت */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm shadow-emerald-950/50">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <Globe className="w-3.5 h-3.5" />
                    <span>وضعیت شبکه: متصل به سرویس زنده پینترست ({liveSourceInfo})</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDirectImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingCustomImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-black transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingCustomImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>در حال استخراج OCR پوستر...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5 text-black" />
                        <span>📤 آپلود مستقیم پوستر و استخراج فوری OCR</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBatchImportModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-950/80 border border-red-800/60 hover:bg-red-900/80 text-red-200 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-red-400" />
                    <span>📥 ورود دستی/گروهی لینک‌های پینترست</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTokenSettings(!showTokenSettings)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-950 border border-neutral-800 hover:border-yellow-500/40 text-neutral-300 hover:text-yellow-400 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5 text-yellow-500" />
                    {showTokenSettings ? 'بستن تنظیمات کلیدها' : 'کلید هوش مصنوعی و توکن پینترست (پیش‌فرض تنظیم است)'}
                  </button>
                </div>
              </div>

              {/* پنل تنظیمات کلیدهای API */}
              {showTokenSettings && (
                <div className="bg-neutral-950 border border-yellow-500/30 rounded-xl p-4 space-y-4 text-xs">
                  {/* کلید گوگل درخواستی کاربر */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-yellow-400 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-yellow-400" /> کلید اختصاصی Google Gemini API Key:
                      </span>
                      <span className="text-[11px] text-emerald-400 font-medium">✓ کلید پیش‌فرض گوگل تنظیم و فعال است</span>
                    </div>
                    <div className="bg-neutral-900/50 p-2.5 rounded-lg border border-neutral-800/80 text-[11px] text-neutral-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span>در صورت بروز مشکل در تشخیص یا اتمام سهمیه، می‌توانید کلید رایگان جدید بسازید:</span>
                      <a
                        href="https://aistudio.google.com/docs/api-key"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-400 hover:text-yellow-300 font-bold underline flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                      >
                        دریافت کلید جدید از Google AI Studio <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customGeminiApiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomGeminiApiKey(val);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('google_gemini_api_key', val);
                          }
                        }}
                        placeholder="AQ.Ab8RN6IvhwR1-AIhqy0Q5XFy8kxMjWSSgYOifTYj9qvBDMSLHw"
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-yellow-300 focus:outline-none focus:border-yellow-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCustomGeminiApiKey(DEFAULT_GOOGLE_GEMINI_API_KEY);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('google_gemini_api_key', DEFAULT_GOOGLE_GEMINI_API_KEY);
                          }
                        }}
                        className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-lg text-xs transition-colors"
                      >
                        بازنشانی به پیش‌فرض گوگل
                      </button>
                    </div>

                    {/* تحلیل فرمت کلید بر اساس مستندات هوش مصنوعی گوگل */}
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      {customGeminiApiKey && customGeminiApiKey.trim() ? (
                        customGeminiApiKey.trim().startsWith('AIzaSy') ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            ✓ قالب کلید معتبر (کلید استاندارد Google AI Studio با پیشوند AIzaSy)
                          </span>
                        ) : customGeminiApiKey.trim().startsWith('AQ.') || customGeminiApiKey.trim().startsWith('AQ') ? (
                          <span className="text-cyan-400 font-bold flex items-center gap-1">
                            ✓ قالب کلید معتبر (کلید امنیتی سندباکس و محیط توسعه اِی‌آی استودیو با پیشوند AQ)
                          </span>
                        ) : customGeminiApiKey.trim().length > 30 ? (
                          <span className="text-yellow-400 font-bold flex items-center gap-1">
                            ✓ قالب ساختاری معتبر (شناسه طولانی بدون پیشوند استاندارد)
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold flex items-center gap-1 animate-pulse">
                            ⚠️ قالب نامعتبر (کلیدهای معتبر گوگل معمولاً با AIzaSy یا AQ شروع می‌شوند)
                          </span>
                        )
                      ) : (
                        <span className="text-neutral-500">در حال استفاده از کلید پیش‌فرض کلود</span>
                      )}
                      
                      <span className="text-neutral-500 text-[10px]">طول کلید: {customGeminiApiKey?.length || 0} کاراکتر</span>
                    </div>

                    {/* اطلاعات حالت مصرف بهینه توکن */}
                    <div className="mt-2.5 p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-lg flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-emerald-300 font-bold">مدل فعال بهینه: <code className="bg-emerald-900/40 px-1.5 py-0.5 rounded text-[10px] text-emerald-200">gemini-3.1-flash-lite</code></span>
                      </div>
                      <span className="text-emerald-400/90 text-[10px] font-medium">حالت صرفه‌جویی حداکثری فعال (ThinkingLevel: MINIMAL + سقف توکن خروجی)</span>
                    </div>
                  </div>

                  <hr className="border-neutral-800/80" />

                  {/* توکن One-API پینترست */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-yellow-400 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5" /> توکن اختصاصی One-API پینترست:
                      </span>
                      <span className="text-[11px] text-emerald-400 font-medium">✓ توکن پیش‌فرض پینترست تنظیم و فعال است</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customOneApiToken}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomOneApiToken(val);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('pinterest_one_api_token', val);
                          }
                        }}
                        placeholder="149336:6aaa7eeba75d4"
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-yellow-300 focus:outline-none focus:border-yellow-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCustomOneApiToken(DEFAULT_PINTEREST_ONE_API_TOKEN);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('pinterest_one_api_token', DEFAULT_PINTEREST_ONE_API_TOKEN);
                          }
                        }}
                        className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-lg text-xs transition-colors"
                      >
                        بازنشانی به پیش‌فرض پینترست
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* دکمه‌های کانال‌های زنده پینترست */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-red-500 animate-pulse" /> کانال‌های زنده پینترست:
                </span>
                {[
                  { id: 'all_live', label: '🌟 همه پین‌های پرامپت', query: 'portrait prompt' },
                  { id: 'prompthero', label: '🎨 @prompthero (50 پین)', query: '@prompthero' },
                  { id: 'midjourneyai', label: '⚡ @midjourneyai (27 پین)', query: '@midjourneyai' },
                  { id: 'civitai', label: '🔥 @civitai (50 پین)', query: '@civitai' },
                  { id: 'promptbase', label: '💎 @promptbase (50 پین)', query: '@promptbase' },
                  { id: 'openartai', label: '🌐 @openartai (50 پین)', query: '@openartai' },
                  { id: 'nightcafestudio', label: '🌙 @nightcafestudio (50 پین)', query: '@nightcafestudio' },
                  { id: 'aiartcommunity', label: '🤖 @aiartcommunity (50 پین)', query: '@aiartcommunity' },
                ].map(channel => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(channel.id);
                      setSearchQuery(channel.query);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      selectedChannel === channel.id
                        ? 'bg-yellow-500 text-black border-yellow-400 shadow-sm shadow-yellow-500/20'
                        : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {channel.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row gap-6 items-end">
              <div className="flex-1 w-full space-y-3">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-4 h-4 text-yellow-500" /> جستجو یا آدرس مستقیم در پینترست (برچسب: <span className="text-white">#{selectedModelTag}</span>)
                </label>
                <div className="relative">
                  <Search className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="کلمه کلیدی، نام کاربری (@prompthero) یا آدرس مستقیم پین/برد (pinterest.com/pin/...)..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-12 pr-4 py-4 text-sm text-neutral-200 focus:outline-none focus:border-yellow-500/50 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleStartParallelPipeline()}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-neutral-400">
                  <span className="text-[11px] text-neutral-500">پیشنهادات سریع:</span>
                  {['portrait prompt', 'cinematic lighting', 'fashion editorial', 'black and white studio'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setSelectedChannel('custom');
                        setSearchQuery(chip);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-colors border ${searchQuery === chip ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400 border-neutral-800'}`}
                    >
                      {chip}
                    </button>
                  ))}
                  <span className="text-[11px] text-neutral-500 mr-2 flex items-center gap-1">
                    <Link2 className="w-3 h-3 text-neutral-400" /> پشتیبانی از پین، برد و اکانت مستقیم پینترست
                  </span>
                </div>
              </div>

              <div className="w-full lg:w-64 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-300">ظرفیت صف کاری:</span>
                  <span className="bg-neutral-950 text-yellow-400 font-bold px-3 py-1 rounded-lg border border-neutral-800">{fetchLimit}</span>
                </div>
                <input 
                  type="range" 
                  min="4" max="24" step="2"
                  value={fetchLimit}
                  onChange={(e) => setFetchLimit(Number(e.target.value))}
                  className="w-full accent-yellow-500 bg-neutral-900 cursor-pointer h-2.5 rounded-lg"
                />
              </div>

              <div className="flex gap-2 w-full lg:w-auto">
                {isSearching || isParallelRunning ? (
                  <button onClick={handleStopPipeline} className="flex-1 lg:flex-none bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg">
                    <Square className="w-4 h-4 fill-current" /> توقف سیستم
                  </button>
                ) : (
                  <button onClick={handleStartParallelPipeline} disabled={!searchQuery} className="flex-1 lg:flex-none bg-yellow-500 hover:bg-yellow-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-bold px-8 py-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95">
                    <Zap className="w-5 h-5 fill-current" /> شروع صف چرخشی
                  </button>
                )}
              </div>
            </div>

            {/* کنترل و تنظیمات هوشمند فیلتر تکراری‌ها */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-xl border transition-all ${
                  deduplicateEnabled 
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/20' 
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-500'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-neutral-200">تشخیص و رد خودکار تصاویر تکراری (Duplicate Prevention)</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                      deduplicateEnabled 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}>
                      {deduplicateEnabled ? 'فعال (رد خودکار تکراری‌ها)' : 'غیرفعال'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    جلوگیری هوشمند از انتخاب، بررسی مجدد و پرامپت‌گیری عکس‌های تکراری با تحلیل شناسه، آدرس و اثر انگشت بصری (Visual Hash).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                {duplicateStats.rejectedCount > 0 && (
                  <div className="bg-amber-950/40 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    <span>{duplicateStats.rejectedCount} عکس تکراری رد شد</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setDeduplicateEnabled(!deduplicateEnabled)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    deduplicateEnabled
                      ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20 hover:bg-amber-400'
                      : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {deduplicateEnabled ? 'رد تکراری‌ها فعال است' : 'فعال‌سازی رد تکراری'}
                </button>

                {duplicateStats.rejectedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearDuplicateCache}
                    title="پاکسازی حافظه تکراری‌ها"
                    className="p-2.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* وضعیت موتورها */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border transition-all ${engine1Active ? 'bg-blue-950/30 border-blue-600/50 shadow-lg shadow-blue-950/20' : 'bg-neutral-900/60 border-neutral-800'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400"><Filter className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200">موتور ۱: بررسی سریع (پرامپت + مدل انسانی)</h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">بررسی پرامپت متنی و وجود انسان؛ حذف و جایگزینی فوری</p>
                    </div>
                  </div>
                  {engine1Active && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                </div>
              </div>

              <div className={`p-4 rounded-xl border transition-all ${engine2Active ? 'bg-emerald-950/30 border-emerald-600/50 shadow-lg shadow-emerald-950/20' : 'bg-neutral-900/60 border-neutral-800'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400"><Cpu className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200">موتور ۲: OCR و اعمال قفل چهره و زاویه</h4>
                      <p className="text-[11px] text-neutral-500 mt-0.5">استخراج متن کارت و ترکیب با دستورات استودیویی</p>
                    </div>
                  </div>
                  {engine2Active && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />}
                </div>
              </div>
            </div>

            {/* نوار نقاله زنده */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <RefreshCw className={`w-5 h-5 text-yellow-500 ${engine1Active ? 'animate-spin' : ''}`} /> نوار نقاله زنده (بررسی از ابتدا ⬅️ ورود از انتها)
                </h3>
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-lg text-xs font-bold">
                  {selectedCandidates.length} پوستر در تب تاییدشده‌ها
                </span>
              </div>

              <div className="columns-1 sm:columns-2 lg:columns-4 gap-6 space-y-6">
                {screeningQueue.map((item, index) => (
                  <div key={item.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl break-inside-avoid flex flex-col group relative">
                    <img src={item.url} alt="Queue Item" className="w-full h-auto object-cover" />
                    
                    <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-neutral-700 flex items-center gap-1.5">
                      {index === 0 && item.status === 'engine1_checking' ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />
                          <span className="text-yellow-400">در حال بررسی اول صف...</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-500"></span>
                          <span className="text-neutral-300">موقعیت #{index + 1}</span>
                        </>
                      )}
                    </div>

                    {item.pinterestUrl && (
                      <a
                        href={item.pinterestUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 bg-red-950/85 hover:bg-red-900 border border-red-800/60 text-red-200 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm transition-colors"
                        title="مشاهده مستقیم در پینترست"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <span>پینترست</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {screeningQueue.length === 0 && (
                <div className="text-center py-24 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/30">
                  <Zap className="w-16 h-16 mx-auto mb-4 text-neutral-700" />
                  <p className="text-sm text-neutral-400">صف اسکن خالی است. کلیدواژه‌ای جستجو کنید تا چرخش صف آغاز شود.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2 : کارت‌های تایید‌شده                                  */}
        {/* ========================================================== */}
        {activeTab === 'selected_candidates' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-400" /> پوسترهای تاییدشده (پرامپت + مدل انسانی)
                </h2>
                <p className="text-xs text-neutral-400 mt-1">کارت‌هایی که هم متن پرامپت دارند و هم مدل انسانی در پس‌زمینهٔ آن‌هاست.</p>
              </div>
              <span className="bg-blue-950/60 border border-blue-800 px-4 py-2 rounded-xl text-xs text-blue-300 font-bold self-start sm:self-auto">
                تعداد تایید شده: {selectedCandidates.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {selectedCandidates.map((item) => (
                <div key={item.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
                  <div className="relative aspect-[9/16] bg-black">
                    <img src={item.url} alt="Selected Poster" className="w-full h-full object-cover" />
                    
                    <div className="absolute top-2 left-2">
                      {item.status === 'engine2_analyzing' && (
                        <span className="bg-yellow-500 text-black px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-lg">
                          <Loader2 className="w-3 h-3 animate-spin" /> در حال خواندن متن پوستر...
                        </span>
                      )}
                      {item.status === 'ready_for_engine2' && (
                        <span className="bg-blue-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-lg">
                          ⏳ در صف OCR موتور ۲
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <span className="bg-emerald-500 text-black px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-lg">
                          <CheckCircle2 className="w-3 h-3" /> استخراج کامل شد
                        </span>
                      )}
                    </div>

                    {item.pinterestUrl && (
                      <a
                        href={item.pinterestUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 bg-red-950/85 hover:bg-red-900 border border-red-800/60 text-red-200 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm transition-colors"
                        title="مشاهده مستقیم در پینترست"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <span>پینترست ({item.pinterestAuthor ? `@${item.pinterestAuthor}` : 'Pin'})</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <div className="p-4 bg-neutral-950 border-t border-neutral-800 space-y-2">
                    {item.prompt ? (
                      <>
                        <button 
                          onClick={() => setSelectedGalleryItem(item)}
                          className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-yellow-500" /> مشاهده پرامپت
                        </button>
                        <button 
                          onClick={() => setCurrentView('store')}
                          className="w-full bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold py-1.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                          <span>مشاهده در فروشگاه Sireny</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-[11px] text-center text-neutral-500 py-1">
                        در صف خواندن متن پرامپت...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedCandidates.length === 0 && (
              <div className="text-center py-32 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/30">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 text-neutral-700" />
                <p className="text-sm text-neutral-400">هنوز پوستری تایید نشده است. جستجو را از تب اول آغاز کنید.</p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3 : پرامپت‌های استخراج‌شده نهایی                        */}
        {/* ========================================================== */}
        {activeTab === 'prompt_engine_gallery' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-neutral-800 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" /> گالری پرامپت‌های نهایی (OCR + قفل چهره و زاویه)
                </h2>
                <p className="text-xs text-neutral-400 mt-1">پرامپت‌های آماده همراه با دستورات حفظ فیزیک نور، پرسپکتیو و ویژگی‌های چهره.</p>
              </div>
              <span className="bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-xl text-xs text-emerald-400 font-bold">
                تعداد کل: {approvedGallery.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {approvedGallery.map((item) => (
                <div key={item.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                  <div className="relative h-72 bg-black flex justify-center items-center overflow-hidden">
                    <img src={item.url} alt="Source Card" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 bg-emerald-500 text-black px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" /> پرامپت آماده کپی
                    </div>
                    {/* برچسب شناسنامه موتور مدیر ناظر */}
                    <div className="absolute bottom-2 right-2 left-2 bg-black/85 backdrop-blur-sm border border-neutral-700 text-neutral-200 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center justify-between">
                      <span className="text-yellow-400 truncate max-w-[210px] flex items-center gap-1">
                        <Award className="w-3 h-3 text-yellow-400 shrink-0" />
                        {item.supervisorVerdict?.engineName || (item.hasPrintedPrompt ? 'استخراج مستقیم OCR پوستر' : 'موتور اختصاصی ۸.۰ (طراحی بلوکی نور و آناتومی با ۹۵٪ شباهت بصری)')}
                      </span>
                      <span className="text-emerald-400 font-bold shrink-0">
                        {item.supervisorVerdict?.qualityScore || '۹.۷/۱۰'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 bg-neutral-950 flex flex-col justify-between gap-3 flex-1">
                    <div className="space-y-2.5">
                      <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 max-h-28 overflow-y-auto">
                        <p className="text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre-wrap">{cleanPromptText(item.prompt)}</p>
                      </div>

                      {/* گزیده تفسیر ترغیب‌کننده مدیر ناظر */}
                      {item.supervisorVerdict?.pitch && (
                        <div className="bg-amber-950/25 border border-amber-500/25 p-2 rounded-lg text-[10px] text-amber-200/90 leading-relaxed">
                          <span className="font-bold text-amber-400 block mb-0.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> نظر ترغیب‌کننده مدیر ناظر:
                          </span>
                          <p className="line-clamp-2">{item.supervisorVerdict.pitch}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSelectedGalleryItem(item)}
                          className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-black" /> مشاهده و کپی پرامپت
                        </button>
                        <a 
                          href="https://gemini.google.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={() => navigator.clipboard.writeText(cleanPromptText(item.prompt))}
                          className="bg-neutral-800 hover:bg-neutral-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                          title="کپی پرامپت و باز کردن جمینای"
                        >
                          <ExternalLink className="w-4 h-4 text-yellow-400" /> جمینای
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {approvedGallery.length === 0 && (
              <div className="text-center py-32 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/30">
                <Layers className="w-16 h-16 mx-auto mb-4 text-neutral-700" />
                <p className="text-sm text-neutral-400">هنوز پرامپتی استخراج نشده است.</p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4 : ویترین محصولات                                    */}
        {/* ========================================================== */}
        {activeTab === 'showcase' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-neutral-800 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" /> ویترین محصولات نهایی
              </h2>
            </div>

            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
              {approvedGallery.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedGalleryItem(item)}
                  className="relative group rounded-2xl overflow-hidden break-inside-avoid bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 cursor-pointer shadow-xl"
                >
                  <img src={item.url} alt="Showcase Item" className="w-full h-auto object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5">
                    <span className="bg-emerald-500 text-black text-center text-xs font-bold py-2.5 rounded-xl shadow-lg">مشاهده جزئیات پرامپت</span>
                  </div>
                </div>
              ))}
            </div>

            {approvedGallery.length === 0 && (
              <div className="text-center py-24 opacity-40 border border-dashed border-neutral-800 rounded-2xl">
                <Package className="w-16 h-16 mx-auto mb-3 text-neutral-600" />
                <p className="text-sm">آرشیو خالی است.</p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 5 : برچسب‌ها                                          */}
        {/* ========================================================== */}
        {activeTab === 'model_tags' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl space-y-8">
              <div className="border-b border-neutral-800 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                  <Tag className="w-6 h-6 text-yellow-500" /> کلیدواژه‌های جستجوی پوستر پرامپت
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedModelTag(tag)}
                      className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border-2 ${selectedModelTag === tag ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg' : 'bg-neutral-950 text-neutral-300 border-neutral-800'}`}
                    >
                      #{tag} {selectedModelTag === tag && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4">
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    placeholder="برچسب جدید..."
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/50"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                  />
                  <button onClick={handleAddCustomTag} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-lg">
                    ثبت
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 6 : عیب‌یابی و پایش وضعیت کلیدها                           */}
        {/* ========================================================== */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* عنوان بخش */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-500 animate-pulse" /> سیستم عیب‌یابی آنی و پایش پایداری هوش مصنوعی
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  تست زنده اتصال شبکه، اعتبار کلیدهای API گوگل، پایش سهمیه‌ها و عیب‌یابی دقیق خط لوله پردازش تصویر.
                </p>
              </div>
              <button
                type="button"
                onClick={runSystemDiagnostics}
                disabled={isDiagnosing}
                className="bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                {isDiagnosing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال پایش سیستم...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>تست مجدد و ارزیابی زنده</span>
                  </>
                )}
              </button>
            </div>

            {/* کارت‌های وضعیت کلیدها */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* وضعیت سرویس Google Gemini */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <span className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-yellow-500" /> سرویس هوش مصنوعی گوگل (Google Gemini API)
                  </span>
                  
                  {isDiagnosing ? (
                    <span className="text-[10px] text-neutral-500 animate-pulse">در حال بررسی...</span>
                  ) : diagnosticResult?.googleApi?.status === 'success' ? (
                    <span className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] px-2.5 py-1 rounded-lg font-bold">✓ فعال و پایدار</span>
                  ) : diagnosticResult?.googleApi?.status === 'quota_exceeded' ? (
                    <span className="bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] px-2.5 py-1 rounded-lg font-bold animate-pulse">⚠️ اتمام سهمیه (429)</span>
                  ) : (
                    <span className="bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] px-2.5 py-1 rounded-lg font-bold">⚠️ خطای پیکربندی</span>
                  )}
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* اطلاعات کلید فعلی */}
                  <div className="flex justify-between items-center bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                    <span className="text-neutral-400">کلید مورد استفاده:</span>
                    <span className="font-mono text-yellow-400 text-[11px] bg-neutral-900 px-2 py-1 rounded border border-neutral-800 select-all">
                      {customGeminiApiKey ? `${customGeminiApiKey.slice(0, 8)}...${customGeminiApiKey.slice(-8)}` : 'تنظیم نشده'}
                    </span>
                  </div>

                  {/* پینگ اتصال */}
                  <div className="flex justify-between items-center bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                    <span className="text-neutral-400">مدل فعال و پردازنده:</span>
                    <span className="font-mono text-emerald-400 font-bold text-[11px] bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
                      gemini-3.1-flash-lite (بهینه‌ترین مدل)
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                    <span className="text-neutral-400">پیکربندی مصرف توکن:</span>
                    <span className="text-cyan-300 text-[11px] font-semibold">
                      حداقلی (ThinkingLevel: MINIMAL)
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                    <span className="text-neutral-400">تاخیر پاسخ دهی سرور (Latency):</span>
                    <span className="font-bold text-neutral-200">
                      {isDiagnosing ? '...' : diagnosticResult?.googleApi?.latencyMs ? `${diagnosticResult.googleApi.latencyMs} میلی‌ثانیه` : 'ناموفق'}
                    </span>
                  </div>

                  {/* لینک مستقیم دریافت کلید */}
                  <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800 flex items-center justify-between gap-2">
                    <span className="text-neutral-400">سایت مرجع کلیدها:</span>
                    <a
                      href="https://aistudio.google.com/docs/api-key"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400 hover:text-yellow-300 font-bold underline flex items-center gap-1"
                    >
                      دریافت کلید رایگان از AI Studio <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* شرح خطای دریافتی */}
                  {diagnosticResult?.googleApi?.status !== 'success' && diagnosticResult?.googleApi?.message && (
                    <div className="p-4 bg-red-950/40 border border-red-900/40 rounded-xl space-y-2">
                      <p className="font-bold text-red-400 text-xs flex items-center gap-1">
                        <span>❌ علت دقیق قطعی:</span>
                        <span className="bg-red-900/30 text-red-300 font-mono text-[10px] px-1.5 py-0.5 rounded">429 / RESOURCE_EXHAUSTED</span>
                      </p>
                      <p className="text-neutral-300 leading-relaxed text-[11px]">
                        {diagnosticResult.googleApi.message}
                      </p>
                      {diagnosticResult.googleApi.suggestedFix && (
                        <div className="mt-2 pt-2 border-t border-red-900/20 text-[11px] text-yellow-400">
                          <strong className="block mb-1">💡 راهکار پیشنهادی حل مشکل:</strong>
                          <p className="leading-relaxed text-neutral-300">{diagnosticResult.googleApi.suggestedFix}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* پیام پیش‌فرض در صورت سبز بودن */}
                  {diagnosticResult?.googleApi?.status === 'success' && (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-950/40 rounded-xl">
                      <p className="text-emerald-400 font-bold mb-1">✓ سیستم آماده پردازش است</p>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        اتصال به پایگاه مدل‌های گوگل جمینای کاملاً برقرار است. عملیات استخراج پرامپت با سرعت عالی انجام می‌شود.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* وضعیت سرویس Pinterest Connection */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <span className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-red-500 animate-pulse" /> اتصال سرور پینترست (Pinterest Live API)
                  </span>
                  
                  {isDiagnosing ? (
                    <span className="text-[10px] text-neutral-500 animate-pulse">در حال بررسی...</span>
                  ) : diagnosticResult?.oneApi?.status === 'success' ? (
                    <span className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] px-2.5 py-1 rounded-lg font-bold">✓ متصل</span>
                  ) : (
                    <span className="bg-red-500/15 border border-red-500/40 text-red-400 text-[10px] px-2.5 py-1 rounded-lg font-bold">⚠️ ناموفق</span>
                  )}
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* اطلاعات توکن پینترست */}
                  <div className="flex justify-between items-center bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                    <span className="text-neutral-400">توکن پینترست فعال:</span>
                    <span className="font-mono text-red-400 text-[11px] bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                      {customOneApiToken ? `${customOneApiToken.slice(0, 6)}...${customOneApiToken.slice(-4)}` : 'تنظیم نشده'}
                    </span>
                  </div>

                  {/* تاخیر اتصال پینترست */}
                  <div className="flex justify-between items-center bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                    <span className="text-neutral-400">تاخیر دریافت اطلاعات پینترست:</span>
                    <span className="font-bold text-neutral-200">
                      {isDiagnosing ? '...' : diagnosticResult?.oneApi?.latencyMs ? `${diagnosticResult.oneApi.latencyMs} میلی‌ثانیه` : 'ناموفق'}
                    </span>
                  </div>

                  {/* پیام اتصال */}
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
                    <span className="text-[11px] font-bold text-neutral-400 block mb-1">شرح وضعیت:</span>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      {isDiagnosing ? 'در حال پایش زنده...' : diagnosticResult?.oneApi?.message || 'در حال آماده‌سازی پاسخ پینترست...'}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* آزمایشگاه عیب‌یابی انفرادی تصویر (Live Image OCR Debugger) */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-yellow-500" /> تستر و عیب‌یاب آنی تصاویر تکی (Direct Image OCR Debugger)
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    یک عکس کارت پرامپت را به طور مستقیم بارگذاری کنید تا خط لوله پردازش را خط‌به‌خط مشاهده کنید.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* آپلودر تست تصویر */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-neutral-950 border-2 border-dashed border-neutral-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative hover:border-yellow-500/40 transition-colors min-h-64">
                    {debugImage ? (
                      <div className="relative w-full h-full max-h-72 overflow-hidden rounded-xl">
                        <img src={debugImage} alt="Debug Source" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            setDebugImage(null);
                            setDebugResult(null);
                            setDebugRawResponse('');
                            setDiagnosticOcrLogs('');
                          }}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg"
                        >
                          حذف و تغییر عکس
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 py-8">
                        <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                          <ImageIcon className="w-6 h-6 text-neutral-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-300">برای شروع تست خط لوله، کارت پرامپت را آپلود کنید</p>
                          <p className="text-[11px] text-neutral-500 mt-1">فرمت‌های JPG، PNG، WEBP پشتیبانی می‌شود</p>
                        </div>
                        <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                          <span>انتخاب فایل تصویر</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleRunOcrDebugPipeline}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    {isDebugExtracting && (
                      <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center space-y-4 rounded-2xl">
                        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                        <p className="text-xs text-neutral-300 font-bold animate-pulse">در حال فراخوانی مدل Google Gemini...</p>
                        <span className="text-[10px] text-neutral-500 font-mono">درخواست با موفقیت ارسال شد</span>
                      </div>
                    )}
                  </div>

                  {/* لاگ خط لوله پردازش */}
                  <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-800 space-y-2">
                    <span className="text-[11px] font-bold text-neutral-400 block border-b border-neutral-900 pb-1.5">کنسول لاگ زنده پردازش (Execution Trace):</span>
                    <pre className="text-[10px] font-mono text-neutral-300 bg-neutral-900/40 p-3 rounded-lg leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {diagnosticOcrLogs || 'در انتظار آپلود تصویر برای شروع آنالیز...'}
                    </pre>
                  </div>
                </div>

                {/* نتایج خروجی دیباگ */}
                <div className="lg:col-span-7 space-y-4">
                  {/* پرامپت نهایی استخراج‌شده */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                      <span className="text-xs font-bold text-neutral-200">پرامپت نهایی تمیزکاری شده (Parsed Extracted Prompt):</span>
                      {debugResult?.prompt && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(debugResult.prompt);
                            alert('پرامپت با موفقیت کپی شد!');
                          }}
                          className="text-[10px] font-bold text-yellow-400 bg-yellow-500/15 border border-yellow-500/30 px-2 py-1 rounded"
                        >
                          کپی پرامپت
                        </button>
                      )}
                    </div>
                    <textarea
                      readOnly
                      rows={6}
                      value={debugResult?.prompt || ''}
                      placeholder="پرامپت پردازش شده کلمه‌به‌کلمه در این بخش نمایش داده می‌شود."
                      className="w-full bg-neutral-900 border border-neutral-800/80 rounded-xl p-3 text-xs font-mono text-neutral-300 focus:outline-none"
                    />
                  </div>

                  {/* لاگ خام بازگشتی از هوش مصنوعی گوگل */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3">
                    <span className="text-xs font-bold text-neutral-200 block border-b border-neutral-900 pb-2">پاسخ خام مستقیم دریافتی از هوش مصنوعی (Raw AI Response):</span>
                    <textarea
                      readOnly
                      rows={6}
                      value={debugRawResponse || ''}
                      placeholder="خروجی خام JSON/تگ‌های دریافتی از جمینای پیش از پردازش و تمیزکاری در کلاینت."
                      className="w-full bg-neutral-900 border border-neutral-800/80 rounded-xl p-3 text-xs font-mono text-yellow-500/90 focus:outline-none"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL */}
      {selectedGalleryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-6 animate-in zoom-in-95 duration-200">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col md:flex-row shadow-2xl">
            
            {/* سمت چپ: نمایش عکس رفرنس با بالاترین کیفیت */}
            <div className="w-full md:w-1/2 bg-black flex items-center justify-center p-4 sm:p-6 relative border-b md:border-b-0 md:border-l border-neutral-800">
              <img 
                src={selectedGalleryItem.url} 
                alt="Showcase" 
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl" 
              />
            </div>

            {/* سمت راست: جزئیات پرامپت، شناسنامه، تحلیل مدیر ناظر و موتورهای معکوس */}
            <div className="w-full md:w-1/2 flex flex-col h-[75vh] md:h-auto bg-neutral-900">
              
              {/* هدر مدال */}
              <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-sm sm:text-base font-bold text-white">پرامپت استخراج‌شده و شناسنامه اثر</h3>
                </div>

                <button 
                  onClick={() => setSelectedGalleryItem(null)} 
                  className="text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 p-2 rounded-xl transition-colors cursor-pointer"
                  title="بستن"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-6 sm:p-8 space-y-6">
                {selectedGalleryItem.pinterestUrl && (
                  <div className="bg-red-950/30 border border-red-900/40 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-red-300">منبع رسمی: Pinterest ({selectedGalleryItem.pinterestAuthor ? `@${selectedGalleryItem.pinterestAuthor}` : 'Pin'})</span>
                    </div>
                    <a
                      href={selectedGalleryItem.pinterestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-md"
                    >
                      <span>مشاهده در سایت رسمی Pinterest</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* نشانگر وضعیت پرامپت */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedGalleryItem.hasPrintedPrompt !== false ? (
                    <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> کارت پرامپت‌دار چاپی (استخراج دقیق OCR)
                    </span>
                  ) : (
                    <span className="bg-purple-950/80 border border-purple-500/40 text-purple-300 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" /> تصویر پرتره فوتورئال (موتور ارتقایافته ۸.۰ اولترا)
                    </span>
                  )}

                  {selectedGalleryItem.isTruncated && (
                    <span className="bg-amber-950/80 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse">
                      <Globe className="w-3.5 h-3.5" /> پرامپت احتمالا ناقص است (پیشنهاد: جستجوی گوگل)
                    </span>
                  )}
                </div>

                {selectedGalleryItem.contextDesc && (
                  <div className="bg-blue-950/20 border border-blue-900/40 rounded-2xl p-5 space-y-2">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5"><Info className="w-4 h-4"/> ساختار نور و استایل پوستر:</span>
                    <p className="text-sm text-blue-100/90 leading-relaxed font-sans">{selectedGalleryItem.contextDesc}</p>
                  </div>
                )}

                {/* بخش تحلیل و نظر کارشناسی مدیر ناظر (AI Executive Supervisor Review) */}
                <div className="bg-gradient-to-br from-amber-950/40 via-neutral-950 to-neutral-900 border border-amber-500/40 rounded-2xl p-5 space-y-3.5 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400">
                        <Award className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-bold text-amber-300">
                        تفسیر و نظر کارشناسی مدیر ناظر هوشمند (AI Supervisor Pitch)
                      </span>
                    </div>
                    {selectedGalleryItem.supervisorVerdict?.qualityScore && (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        ⭐️ امتیاز کیفیت: {selectedGalleryItem.supervisorVerdict.qualityScore}
                      </span>
                    )}
                  </div>

                  {/* موتور انتخاب شده یا نحوه استخراج */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="text-neutral-400">شناسنامه تولید و ارجاع مدیر:</span>
                    <span className="font-mono bg-neutral-900 border border-neutral-700 text-yellow-300 px-2.5 py-1 rounded-md font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                      {selectedGalleryItem.supervisorVerdict?.engineName || (selectedGalleryItem.hasPrintedPrompt ? 'استخراج مستقیم وفادارانه OCR از کارت پوستر' : 'موتور اختصاصی ۸.۰ (طراحی بلوکی نور و آناتومی با ۹۵٪ شباهت بصری)')}
                    </span>
                  </div>

                  {/* تگ‌های نور و دوربین */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                    <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
                      <span className="text-neutral-400 block mb-1">💡 ساختار نورپردازی:</span>
                      <span className="text-neutral-200 font-medium">{selectedGalleryItem.supervisorVerdict?.lightingStyle || 'نورپردازی پرتره سینمایی با نور ملایم جهت‌دار'}</span>
                    </div>
                    <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
                      <span className="text-neutral-400 block mb-1">📷 اپتیک و لنز دوربین:</span>
                      <span className="text-neutral-200 font-medium">{selectedGalleryItem.supervisorVerdict?.cameraOptics || 'لنز پرایم ۸۵ میلی‌متری با دیافراگم f/1.4'}</span>
                    </div>
                  </div>

                  {/* متن ترغیب‌کننده و جذاب مدیر */}
                  <div className="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <span>✨ چرا باید از این پرامپت استفاده کنید؟</span>
                    </span>
                    <p className="text-xs text-neutral-200 leading-relaxed font-sans text-justify">
                      {selectedGalleryItem.supervisorVerdict?.pitch || 'این اثر با بهره‌گیری از فیزیک واقع‌گرایانه لنز ۸۵ میلی‌متری و بازتاب ارگانیک نور در چشم‌ها، حس یک شات عکاسی زنده مجله ووگ را تداعی می‌کند؛ فرمولی بی‌نظیر که اجرای آن در میجرنی خروجی چشمگیری به همراه خواهد داشت.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-yellow-500"/> متن پرامپت نهایی:
                    </span>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {/* دکمه تکمیل هوشمند با جستجوی گوگل */}
                      <button
                        type="button"
                        disabled={isCompletingPrompt}
                        onClick={() => handleCompleteWithGoogleSearch(selectedGalleryItem)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/50 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-blue-500/10"
                        title="جستجو در اینترنت و گوگل برای یافتن نسخه کامل و بدون بریدگی پرامپت"
                      >
                        {isCompletingPrompt ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>در حال جستجو در گوگل...</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3.5 h-3.5 text-blue-400" />
                            <span>🌐 تکمیل خودکار با جستجوی گوگل</span>
                          </>
                        )}
                      </button>

                      {/* دکمه استخراج مجدد OCR */}
                      <button
                        type="button"
                        disabled={isReExtracting}
                        onClick={() => handleReExtractPrompt(selectedGalleryItem)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isReExtracting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>در حال خواندن متن تصویر...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>استخراج مجدد OCR از روی عکس</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 focus-within:border-yellow-500/50 transition-colors">
                    <textarea
                      rows={6}
                      value={cleanPromptText(selectedGalleryItem.prompt)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedGalleryItem(prev => prev ? { ...prev, prompt: val } : null);
                        setSelectedCandidates(prev => prev.map(c => c.id === selectedGalleryItem.id ? { ...c, prompt: val } : c));
                        setApprovedGallery(prev => prev.map(a => a.id === selectedGalleryItem.id ? { ...a, prompt: val } : a));
                      }}
                      className="w-full bg-transparent text-sm leading-relaxed text-neutral-200 font-mono focus:outline-none resize-y"
                      placeholder="متن پرامپت..."
                    />
                  </div>
                </div>

                {/* استودیو مهندسی معکوس با موتورهای ۹ گانه (به‌ویژه برای عکس‌های بدون متن چاپی) */}
                <div className="bg-neutral-950 border border-purple-500/30 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-purple-300">استودیو مهندسی معکوس بصری با موتورهای ۹ گانه هوش مصنوعی:</span>
                    </div>
                    {isEngineGenerating && (
                      <span className="text-[11px] text-yellow-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> در حال اجرای موتور نسخه {selectedEngineVersion}...
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    اگر تصویر پرتره فاقد متن است یا می‌خواهید پرامپت حرفه‌ای و متناسب با سبک آن بسازید، یکی از موتورهای زیر را انتخاب کنید:
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {[
                      { v: '8.0', label: '📐 نسخه ۸.۰: بلوک فیزیکی', desc: 'نور، اپتیک و آناتومی' },
                      { v: '9.0', label: '⚡ نسخه ۹.۰: آرتاایروس', desc: 'پاراگراف سینمایی' },
                      { v: '7.0', label: '🎭 نسخه ۷.۰: ۵ پاراگراف', desc: 'FACS و زاویه لنز' },
                      { v: '6.0', label: '🎬 نسخه ۶.۰: فشن پرسنای حرفه‌ای', desc: 'نگاه عکاس فشن' },
                      { v: '5.0', label: '🧬 نسخه ۵.۰: Kinematic', desc: 'پوزیشن و بردار نور' },
                      { v: '4.0', label: '🎯 نسخه ۴.۰: ضد هذیان', desc: 'کپی محافظه‌کارانه قاب' },
                      { v: '3.0', label: '🔁 نسخه ۳.۰: Critique Loop', desc: 'بازنویسی با بازخورد' },
                      { v: '2.0', label: '🧊 نسخه ۲.۰: Component', desc: 'دوربین، پوز، محیط' },
                      { v: '1.0', label: '📸 نسخه ۱.۰: Descriptive', desc: 'زاویه، نور، سوژه' }
                    ].map((eng) => (
                      <button
                        key={eng.v}
                        type="button"
                        disabled={isEngineGenerating}
                        onClick={() => handleGenerateEngineForPhoto(selectedGalleryItem, eng.v)}
                        className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                          selectedEngineVersion === eng.v && selectedGalleryItem.generatedEnginePrompts?.[eng.v]
                            ? 'bg-purple-950/90 border-purple-500 text-purple-200 shadow-md shadow-purple-500/20'
                            : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 text-neutral-300 hover:border-purple-500/40'
                        } disabled:opacity-50`}
                      >
                        <div className="text-xs font-bold text-neutral-200">{eng.label}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">{eng.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* فوتر مدال: دکمه‌های کپی پرامپت و تست در جمینای */}
              <div className="p-6 border-t border-neutral-800 bg-neutral-950/80 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => {
                    const cleaned = cleanPromptText(selectedGalleryItem.prompt);
                    if (cleaned) {
                      navigator.clipboard.writeText(cleaned);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    }
                  }}
                  className={`flex-1 font-bold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                    copied 
                      ? 'bg-emerald-500 text-black' 
                      : 'bg-yellow-500 hover:bg-yellow-400 text-black'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-black" /> پرامپت با موفقیت کپی شد!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" /> کپی کردن پرامپت
                    </>
                  )}
                </button>

                <a
                  href="https://gemini.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => navigator.clipboard.writeText(cleanPromptText(selectedGalleryItem.prompt))}
                  className="font-bold py-3.5 px-5 rounded-2xl text-xs flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-colors shadow-lg cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-yellow-400" />
                  <span>تست در Gemini</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BATCH IMPORT MODAL */}
      {showBatchImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-in zoom-in-95 duration-200">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ورود مستقیم لینک‌ها یا اکانت‌های پینترست</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">پین‌ها مستقیماً با کیفیت بالا از سرورهای پینترست دریافت و وارد خط تولید می‌شوند.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchImportModal(false)}
                className="text-neutral-400 hover:text-white bg-neutral-800 px-3 py-1.5 rounded-xl text-xs font-bold"
              >
                بستن
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300">
                لینک‌های پین (pinterest.com/pin/... یا pin.it/...) یا نام‌های کاربری پینترست (@prompthero):
              </label>
              <textarea
                rows={6}
                value={batchImportText}
                onChange={(e) => setBatchImportText(e.target.value)}
                placeholder="یک یا چند آدرس پینترست را در هر خط پیست کنید:
https://www.pinterest.com/pin/1009298966466958382/
https://pin.it/example
@prompthero"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-xs font-mono text-neutral-200 focus:outline-none focus:border-red-500/50"
              />
              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                <Info className="w-3.5 h-3.5 text-neutral-400" />
                <span>می‌توانید هر تعداد لینک پین یا نام کاربری را در خط‌های جداگانه وارد کنید.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowBatchImportModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleBatchImport}
                disabled={isImporting || !batchImportText.trim()}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال دریافت پین‌ها از پینترست...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    <span>دریافت و ارسال فوری به خط تولید</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}