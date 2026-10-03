import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ override: true });


const IDENTITY_LOCK = `IDENTITY - CRITICAL: Use the uploaded photo as the sole, exclusive, and non-negotiable identity reference. Preserve the exact facial identity, features, proportions, natural asymmetry, skin tone, hairline, hair color, texture, and length. The final result must unmistakably look like the same person. Do not beautify, idealize, reshape, de-age, or replace the identity with a generic model.`;
const QUALITY_ANCHOR = `TECHNICAL QUALITY: High-end photorealistic editorial photography. Preserve realistic light transitions and highlight detail.`;
const BASE_NEGATIVE = `NEGATIVE PROMPT: soft beauty retouching, plastic skin, exaggerated retouching, heavy smile, colorful distractions, messy smoke over the face, low detail, distorted anatomy, extra accessories, text, logo, watermark, cluttered background, cartoon, CGI, generic model, unnatural eye reflections, grainy digital noise, flat lighting`;


const FALLBACK_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest'
];

const DEFAULT_GEMINI_API_KEY = '';

function getAiClient(userApiKey?: string): GoogleGenAI | null {
  const apiKey = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY || process.env.API_KEY || DEFAULT_GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

function generateFallbackStudioPrompt(customTitleOrStyle?: string): { prompt: string; contextDesc: string } {
  if (customTitleOrStyle) {
    const lower = customTitleOrStyle.toLowerCase();
    if (
      customTitleOrStyle.includes('--') ||
      lower.includes('portrait') ||
      lower.includes('lighting') ||
      lower.includes('cinematic') ||
      lower.includes('photo') ||
      lower.includes('editorial') ||
      lower.includes('studio')
    ) {
      const clean = customTitleOrStyle
        .replace(/^(?:prompt|prompts|midjourney prompt|generation prompt)\s*:\s*/i, '')
        .replace(/https?:\/\/\S+/g, '')
        .trim();
      if (clean.length > 10) {
        return {
          prompt: clean,
          contextDesc: "ساختار نورپردازی و ترکیب‌بندی استخراج‌شده از اطلاعات رفرنس."
        };
      }
    }
  }

  const styleHint = customTitleOrStyle ? ` Styled after reference: ${customTitleOrStyle.replace(/https?:\/\/\S+/g, '').slice(0, 80)}.` : '';
  const prompt = `Ultra-detailed cinematic editorial portrait photography, captured on 85mm prime lens at f/1.4, dramatic rim lighting with soft directional fill, authentic skin texture with natural pore structure and realistic specular highlights, volumetric atmospheric depth.${styleHint}\n${IDENTITY_LOCK}\n${QUALITY_ANCHOR}\n${BASE_NEGATIVE}`;
  const contextDesc = "ساختار نورپردازی پرتره سینمایی با هایلایت‌های ملایم جهت‌دار و حفظ کامل هویت بصری و پرسپکتیو زاویه لنز.";
  return { prompt, contextDesc };
}

function extractPromptAndContext(rawText: string): { prompt: string; contextDesc?: string; hasPrintedPrompt?: boolean } {
  if (!rawText) return { prompt: '' };

  let text = rawText.trim();

  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json|text)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  }

  // Handle [PROMPT] ... [/PROMPT] tags
  if (text.includes('[PROMPT]')) {
    const promptParts = text.split('[PROMPT]');
    const afterPrompt = promptParts[1] || '';
    const promptText = afterPrompt.split('[/PROMPT]')[0] || afterPrompt.split('[CONTEXT]')[0] || afterPrompt;
    
    let contextText = '';
    if (text.includes('[CONTEXT]')) {
      const contextParts = text.split('[CONTEXT]');
      const afterContext = contextParts[1] || '';
      contextText = afterContext.split('[/CONTEXT]')[0] || afterContext;
    }

    const cleanP = promptText.trim();
    if (cleanP) {
      return {
        prompt: cleanP,
        contextDesc: contextText.trim() || 'نورپردازی استودیویی پرتره',
        hasPrintedPrompt: true
      };
    }
  }

  // Handle [EXTRACTED_PROMPT]: ...
  if (text.includes('[EXTRACTED_PROMPT]:')) {
    const parts = text.split('[EXTRACTED_PROMPT]:');
    const remaining = parts[1] ? parts[1].split('[LIGHTING_STRUCTURE]:')[0] : parts[0];
    const contextPart = text.split('[LIGHTING_STRUCTURE]:')[1] || '';
    return {
      prompt: remaining.trim(),
      contextDesc: contextPart.trim() || 'نورپردازی استودیویی پرتره',
      hasPrintedPrompt: true
    };
  }

  // Attempt JSON parsing
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && typeof parsed === 'object') {
        const prompt = (parsed.prompt || parsed.finalPrompt || parsed.extractedPrompt || parsed.output || parsed.text || '').trim();
        const contextDesc = (parsed.contextDesc || parsed.description || parsed.context || '').trim();
        const hasPrintedPrompt = typeof parsed.hasPrintedPrompt === 'boolean' ? parsed.hasPrintedPrompt : (prompt.length > 20);
        if (prompt) {
          return { prompt, contextDesc, hasPrintedPrompt };
        }
      }
    }
  } catch (e) {
    // JSON parse failed
  }

  // Regex fallback if malformed JSON string: "prompt": "..."
  const promptFieldMatch = text.match(/"prompt"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (promptFieldMatch) {
    try {
      const unescaped = JSON.parse(`"${promptFieldMatch[1]}"`);
      const contextMatch = text.match(/"contextDesc"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const context = contextMatch ? JSON.parse(`"${contextMatch[1]}"`) : undefined;
      return { prompt: unescaped.trim(), contextDesc: context?.trim(), hasPrintedPrompt: true };
    } catch {
      return { prompt: promptFieldMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim(), hasPrintedPrompt: true };
    }
  }

  return { prompt: text, contextDesc: 'نورپردازی استودیویی پرتره', hasPrintedPrompt: text.length > 20 };
}

async function generateWithRetry(ai: GoogleGenAI | null, params: any, retries = 3) {
  if (!ai) {
    return null;
  }

  let currentModelIndex = Math.max(0, FALLBACK_MODELS.indexOf(params.model));

  // پیکربندی پیش‌فرض مصرف حداقلی توکن (Ultra Token-Saving Config)
  if (!params.config) {
    params.config = {};
  }
  if (params.config.thinkingConfig === undefined) {
    params.config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
  }
  if (params.config.maxOutputTokens === undefined) {
    params.config.maxOutputTokens = 800; // جلوگیری از تولید توکن‌های سرریز
  }
  if (params.config.temperature === undefined) {
    params.config.temperature = 0.15; // پاسخ قطعی، کوتاه و بدون حاشیه‌روی
  }

  for (let i = 0; i < retries; i++) {
    try {
      params.model = FALLBACK_MODELS[currentModelIndex];
      return await ai.models.generateContent(params);
    } catch (err: any) {
      if (err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('UNAUTHENTICATED') || err?.message?.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')) {
        return null;
      }
      
      const errMsg = String(err?.message || '').toLowerCase();
      const isRateLimitOrOverload = 
        err.status === 503 || 
        err.status === 429 || 
        err.status === 500 || 
        errMsg.includes('quota') || 
        errMsg.includes('resource_exhausted') || 
        errMsg.includes('overloaded') ||
        errMsg.includes('rate-limit') ||
        errMsg.includes('exceeded your current quota');

      if (isRateLimitOrOverload && i < retries - 1) {
        currentModelIndex = (currentModelIndex + 1) % FALLBACK_MODELS.length;
        await new Promise(r => setTimeout(r, 800 * (i + 1))); 
      } else {
        return null;
      }
    }
  }
  return null;
}

function cleanClickbaitText(text: string): string {
  if (!text) return '';
  let cleaned = text;

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
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove duplicate commas that might result from removal
  cleaned = cleaned.replace(/,\s*,/g, ',');
  // Clean up trailing/leading whitespace and excess newlines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  return cleaned;
}

async function groundPromptWithGoogleSearch(ai: GoogleGenAI, extractedPrompt: string): Promise<string | null> {
  try {
    const searchPrompt = `The following text is a truncated or incomplete AI / Midjourney image generation prompt extracted from a Pinterest image.
Snippet: "${extractedPrompt}"

Please use Google Search to find the actual COMPLETE, UNTRUNCATED version of this prompt. It is likely published on PromptHero, Midjourney, Pinterest, Civitai, or similar platforms.
Search for the exact matching strings and retrieve the full prompt text.

CRITICAL: Return ONLY the raw, complete prompt text itself (including Midjourney parameters like --ar, --v, etc. if present). Do not write any conversational intro or outro, do not wrap it in a markdown code block, just output the full text of the prompt.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const resultText = response?.text?.trim();
    if (resultText && resultText.length > extractedPrompt.length && !resultText.toLowerCase().includes('could not find')) {
      console.log('[Google Grounding] Successfully retrieved full untruncated prompt using Google Search!');
      return resultText;
    }
    return null;
  } catch (error) {
    console.warn('[Google Grounding] Search grounding failed or skipped:', error);
    return null;
  }
}

const MODEL_NAME = 'gemini-3.1-flash-lite';

const CURATED_PINTEREST_PINS = [
  {
    id: 'pin_curated_1',
    title: 'Self portrait prompt cards | Creative photography prompts, Creative writing',
    image: 'https://i.pinimg.com/originals/da/c0/13/dac0135cb98adf0c0c8a304c404215d1.png',
    images: {
      orig: { url: 'https://i.pinimg.com/originals/da/c0/13/dac0135cb98adf0c0c8a304c404215d1.png' },
      '736x': { url: 'https://i.pinimg.com/originals/da/c0/13/dac0135cb98adf0c0c8a304c404215d1.png' }
    },
    url: 'https://www.pinterest.com/pin/dac0135cb98adf0c0c8a304c404215d1/'
  },
  {
    id: 'pin_curated_2',
    title: 'Costume design & editorial prompts | Fashion keywords, Outfit prompts',
    image: 'https://i.pinimg.com/originals/30/ad/78/30ad78dc548aaf69264c27ed6e0a0208.jpg',
    images: {
      orig: { url: 'https://i.pinimg.com/originals/30/ad/78/30ad78dc548aaf69264c27ed6e0a0208.jpg' },
      '736x': { url: 'https://i.pinimg.com/originals/30/ad/78/30ad78dc548aaf69264c27ed6e0a0208.jpg' }
    },
    url: 'https://www.pinterest.com/pin/333266441196154306/'
  },
  {
    id: 'pin_curated_3',
    title: 'Cinematic Male Portrait Lighting & Poses Prompts',
    image: 'https://i.pinimg.com/originals/2e/18/b7/2e18b70762ab35313eebf0244fbf4a9b.jpg',
    images: {
      orig: { url: 'https://i.pinimg.com/originals/2e/18/b7/2e18b70762ab35313eebf0244fbf4a9b.jpg' },
      '736x': { url: 'https://i.pinimg.com/originals/2e/18/b7/2e18b70762ab35313eebf0244fbf4a9b.jpg' }
    },
    url: 'https://www.pinterest.com/pin/2e18b70762ab35313eebf0244fbf4a9b/'
  },
  {
    id: 'pin_curated_4',
    title: 'Monochrome Film Noir Portrait Photography Prompt Card',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    images: {
      orig: { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80' },
      '736x': { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80' }
    },
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
  },
  {
    id: 'pin_curated_5',
    title: 'Studio Lighting Aesthetic Editorial Portrait Prompt',
    image: 'https://i.pinimg.com/originals/f6/54/14/f6541461ff2c4fb13a7549fd05d455bd.jpg',
    images: {
      orig: { url: 'https://i.pinimg.com/originals/f6/54/14/f6541461ff2c4fb13a7549fd05d455bd.jpg' },
      '736x': { url: 'https://i.pinimg.com/originals/f6/54/14/f6541461ff2c4fb13a7549fd05d455bd.jpg' }
    },
    url: 'https://www.pinterest.com/pin/f6541461ff2c4fb13a7549fd05d455bd/'
  }
];

interface LivePinItem {
  id: string;
  title: string;
  image: string;
  images: {
    orig: { url: string };
    '736x': { url: string };
  };
  url: string;
  author?: string;
  source?: string;
}

// کانال‌ها و تولیدکنندگان معتبر پرامپت و هنر هوش مصنوعی در پینترست
const PINTEREST_PROMPT_CREATORS = [
  'prompthero',
  'promptbase',
  'midjourneyai',
  'openartai',
  'civitai',
  'aiartcommunity',
  'nightcafestudio',
  'artbreeder',
  'midjourneyprompts',
  'promptpal',
  'stablediffusion',
  'lexica_art'
];

// حافظه کش برای پین‌های زنده پینترست
let cachedLivePins: LivePinItem[] = [];
let lastLiveFetchTime = 0;

async function fetchLivePinsFromCreator(creator: string): Promise<LivePinItem[]> {
  try {
    const cleanHandle = creator.replace(/^@/, '').trim();
    const res = await fetch(`https://widgets.pinterest.com/v3/pidgets/users/${cleanHandle}/pins/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(7000)
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rawPins = data.data?.pins || [];

    return rawPins.map((p: any) => {
      const thumb = p.images?.['736x']?.url || p.images?.['236x']?.url || p.images?.orig?.url;
      const hdUrl = thumb ? thumb.replace('/236x/', '/736x/') : '';
      const origUrl = thumb ? thumb.replace('/236x/', '/originals/') : '';
      return {
        id: String(p.id),
        title: (p.description && p.description.trim()) ? p.description.trim() : `Pinterest AI Prompt Card by @${cleanHandle}`,
        image: hdUrl || thumb,
        images: {
          orig: { url: origUrl || hdUrl || thumb },
          '736x': { url: hdUrl || thumb }
        },
        url: p.link || `https://www.pinterest.com/pin/${p.id}/`,
        author: cleanHandle,
        source: 'pinterest_live'
      };
    });
  } catch {
    return [];
  }
}

async function getAggregatedLivePins(): Promise<LivePinItem[]> {
  const now = Date.now();
  if (cachedLivePins.length > 0 && now - lastLiveFetchTime < 1000 * 60 * 15) {
    return cachedLivePins;
  }

  const results = await Promise.allSettled(
    PINTEREST_PROMPT_CREATORS.map(c => fetchLivePinsFromCreator(c))
  );

  const aggregated: LivePinItem[] = [];
  const seenIds = new Set<string>();

  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      for (const pin of r.value) {
        if (!seenIds.has(pin.id) && pin.image) {
          seenIds.add(pin.id);
          aggregated.push(pin);
        }
      }
    }
  }

  if (aggregated.length > 0) {
    cachedLivePins = aggregated;
    lastLiveFetchTime = now;
    return aggregated;
  }

  return CURATED_PINTEREST_PINS as any;
}

async function resolveDirectPinterestUrl(urlOrUser: string): Promise<LivePinItem[] | null> {
  const trimmed = urlOrUser.trim();

  // 1. Multiple Pin URLs or single Pin URL in the text
  const pinUrls = [...trimmed.matchAll(/https?:\/\/(?:www\.)?(?:pinterest\.com\/pin\/\d+|pin\.it\/[a-zA-Z0-9_\-]+)/g)].map(m => m[0]);
  if (pinUrls.length > 0) {
    const resolved = await Promise.allSettled(pinUrls.map(async (pUrl) => {
      const oembedRes = await fetch(`https://www.pinterest.com/oembed.json?url=${encodeURIComponent(pUrl)}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (oembedRes.ok) {
        const d = await oembedRes.json();
        const thumb = d.thumbnail_url || '';
        const hdUrl = thumb.replace('/236x/', '/736x/');
        const origUrl = thumb.replace('/236x/', '/originals/');
        const pinIdMatch = pUrl.match(/\/pin\/(\d+)/);
        const pinId = pinIdMatch ? pinIdMatch[1] : `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        return {
          id: pinId,
          title: d.title || `Pinterest Pin by ${d.author_name || 'Creator'}`,
          image: hdUrl || thumb,
          images: {
            orig: { url: origUrl || hdUrl || thumb },
            '736x': { url: hdUrl || thumb }
          },
          url: pUrl,
          author: d.author_name || 'Pinterest',
          source: 'pinterest_pin'
        };
      }
      return null;
    }));
    const valid: LivePinItem[] = [];
    for (const r of resolved) {
      if (r.status === 'fulfilled' && r.value) {
        valid.push(r.value);
      }
    }
    if (valid.length > 0) return valid;
  }

  // 2. Direct Board URL: https://www.pinterest.com/username/boardname/
  const boardMatch = trimmed.match(/pinterest\.com\/([a-zA-Z0-9_\-]+)\/([a-zA-Z0-9_\-]+)/);
  if (boardMatch && !trimmed.includes('/pin/')) {
    const user = boardMatch[1];
    const board = boardMatch[2];
    try {
      const bRes = await fetch(`https://widgets.pinterest.com/v3/pidgets/boards/${user}/${board}/pins/`, {
        signal: AbortSignal.timeout(6000)
      });
      if (bRes.ok) {
        const d = await bRes.json();
        const pins = d.data?.pins || [];
        if (pins.length > 0) {
          return pins.map((p: any) => {
            const thumb = p.images?.['736x']?.url || p.images?.['236x']?.url || p.images?.orig?.url;
            const hdUrl = thumb ? thumb.replace('/236x/', '/736x/') : '';
            return {
              id: String(p.id),
              title: p.description || `Board pin: ${board}`,
              image: hdUrl || thumb,
              images: {
                orig: { url: hdUrl.replace('/736x/', '/originals/') || hdUrl },
                '736x': { url: hdUrl }
              },
              url: p.link || `https://www.pinterest.com/pin/${p.id}/`,
              author: user,
              source: 'pinterest_board'
            };
          });
        }
      }
    } catch {}
  }

  // 3. Direct User Profile: @username, https://www.pinterest.com/username/, or plain username
  const isDirectUsername = trimmed.startsWith('@') ||
    trimmed.startsWith('user:') ||
    (!trimmed.includes(' ') && !trimmed.includes('/') && trimmed.length >= 3 && trimmed.length <= 30 && PINTEREST_PROMPT_CREATORS.includes(trimmed.toLowerCase()));

  const userMatch = trimmed.startsWith('@') 
    ? trimmed.slice(1) 
    : (trimmed.match(/pinterest\.com\/([a-zA-Z0-9_\-]+)\/?$/)?.[1] || (trimmed.startsWith('user:') ? trimmed.split(':')[1] : (isDirectUsername ? trimmed : null)));

  if (userMatch) {
    const pins = await fetchLivePinsFromCreator(userMatch);
    if (pins.length > 0) return pins;
  }

  return null;
}

const DEFAULT_ONE_API_TOKEN = '';

async function executePinterestSearch(query: string, offset = 0, userToken?: string) {
  const token = (userToken && userToken.trim()) || process.env.ONE_API_TOKEN || process.env.ONE_API_KEY || DEFAULT_ONE_API_TOKEN;

  // 1. Check if user query is a direct Pinterest Link (Pin, Board, User, @username)
  const directPins = await resolveDirectPinterestUrl(query);
  if (directPins && directPins.length > 0) {
    return {
      status: 200,
      source: directPins[0]?.source || 'pinterest_direct',
      totalAvailable: directPins.length,
      result: directPins
    };
  }

  // 2. If One-API token is available, search One-API Pinterest API
  if (token) {
    try {
      const response = await fetch(`https://api.one-api.ir/pinterest/v1/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: { 'one-api-token': token },
        signal: AbortSignal.timeout(6000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.status === 200 && Array.isArray(data.result) && data.result.length > 0) {
          return {
            ...data,
            source: 'one_api'
          };
        }
      }
    } catch (e) {
      console.warn('One-API Pinterest search failed, using live Pinterest streams:', e);
    }
  }

  // 3. Fetch Live Pinterest Streams (PromptHero, MidjourneyAI, PromptBase, AI Art Community, etc.)
  const allLive = await getAggregatedLivePins();

  let filtered = allLive;
  const qClean = query.trim().toLowerCase();
  if (qClean && qClean !== 'portrait' && qClean !== 'portrait prompt' && qClean !== 'all') {
    const words = qClean.split(/\s+/).filter(w => w.length > 2);
    const matched = allLive.filter(pin => {
      const text = `${pin.title} ${pin.author || ''}`.toLowerCase();
      return words.some(w => text.includes(w));
    });
    if (matched.length > 0) {
      filtered = matched;
    }
  }

  // Paginate with offset
  const pageSize = 20;
  const startIdx = offset % Math.max(1, filtered.length);
  const sliced = filtered.slice(startIdx, startIdx + pageSize);
  const results = sliced.length > 0 ? sliced : filtered.slice(0, pageSize);

  return {
    status: 200,
    source: 'pinterest_live',
    totalLiveAvailable: allLive.length,
    result: results
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Keep image payloads practical while avoiding an unbounded JSON body.
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/search-pinterest', async (req, res) => {
    try {
      const { query, offset, oneApiToken } = req.body;
      const effectiveQuery = (typeof query === 'string' && query.trim()) ? query.trim() : 'portrait prompt';
      const effectiveOffset = typeof offset === 'number' ? offset : 0;

      const data = await executePinterestSearch(effectiveQuery, effectiveOffset, oneApiToken);
      res.json(data);
    } catch (error: any) {
      console.error('Pinterest Search Error:', error);
      // Fallback instead of crashing the pipeline
      const fallbackResult = CURATED_PINTEREST_PINS.map((item, idx) => ({
        ...item,
        id: `pin_fallback_${Date.now()}_${idx}`
      }));
      res.json({ status: 200, result: fallbackResult });
    }
  });

  app.get('/api/pinterest/channels', async (req, res) => {
    try {
      const channels = PINTEREST_PROMPT_CREATORS.map(handle => ({
        handle,
        name: handle.charAt(0).toUpperCase() + handle.slice(1),
        url: `https://www.pinterest.com/${handle}/`
      }));
      res.json({
        status: 200,
        channels,
        cachedCount: cachedLivePins.length
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/pinterest/import', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text containing Pinterest links or handles is required' });
      }
      const resolved = await resolveDirectPinterestUrl(text);
      if (resolved && resolved.length > 0) {
        return res.json({ status: 200, pins: resolved });
      }
      return res.status(404).json({ error: 'هیچ پین یا لینکی در متن واردشده یافت نشد' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/fetch-image', async (req, res) => {
    try {
      const { url } = req.body;
      if (typeof url !== 'string' || !url.trim()) return res.status(400).json({ error: 'URL parameter is required' });
      let target: URL;
      try { target = new URL(url.trim()); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

      // This endpoint performs server-side fetching: allowlist destinations to prevent SSRF.
      const hostname = target.hostname.toLowerCase();
      const allowedHosts = ['pinterest.com', 'www.pinterest.com', 'pin.it', 'i.pinimg.com', 'images.unsplash.com'];
      const isAllowedHost = allowedHosts.some(host => hostname === host || hostname.endsWith('.' + host));
      if (target.protocol !== 'https:' || !isAllowedHost) {
        return res.status(400).json({ error: 'Image host is not allowed' });
      }

      let response: Response | null = null;
      const isPinterest = hostname.includes('pinterest.com') || hostname === 'pin.it' || hostname.endsWith('.pinimg.com');
      try {
        response = await fetch(target.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': isPinterest ? 'https://www.pinterest.com/' : 'https://www.google.com/',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          },
          signal: AbortSignal.timeout(8000)
        });
      } catch {}

      if (!response || !response.ok) {
        try {
          const proxyUrl = 'https://wsrv.nl/?url=' + encodeURIComponent(target.toString()) + '&default=' + encodeURIComponent(target.toString());
          const proxyRes = await fetch(proxyUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'image/*,*/*' },
            signal: AbortSignal.timeout(8000)
          });
          if (proxyRes.ok) response = proxyRes;
        } catch {}
      }

      if (!response || !response.ok) {
        return res.status(200).json({ base64: null, mimeType: null, error: 'Image unavailable (' + (response?.status || 'Fetch failed') + ')' });
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.startsWith('image/')) return res.status(415).json({ base64: null, mimeType: null, error: 'Remote resource is not an image' });

      const buffer = Buffer.from(await response.arrayBuffer());
      res.json({ base64: buffer.toString('base64'), mimeType: contentType.split(';', 1)[0] || 'image/jpeg' });
    } catch (error: any) {
      console.warn('Fetch Image Warning:', error?.message || error);
      res.status(200).json({ base64: null, mimeType: null, error: error?.message || 'Failed to fetch image' });
    }
  });
  app.post('/api/execute-engine', async (req, res) => {
    try {
      const { engineVersion, stylePart, facePart, feedbackPart, customGeminiApiKey } = req.body;
      const userKey = customGeminiApiKey || (req.headers['x-gemini-api-key'] as string);
      const ai = getAiClient(userKey);
      let output = '';

      if (ai) {
        if (engineVersion === '1.0') {
          const res1 = await generateWithRetry(ai, { model: MODEL_NAME, contents: ["Analyze this image and reverse-engineer it into a descriptive prompt covering camera angle, lighting, background, and subject pose.", stylePart] });
          const res3 = await generateWithRetry(ai, { model: MODEL_NAME, contents: [`Master prompt: "${res1?.text || ''}"\nCRITICAL: End output exactly with:\n${IDENTITY_LOCK}\n${BASE_NEGATIVE}`] });
          output = res3?.text?.trim() || '';
        } else if (engineVersion === '2.0') {
          const res1 = await generateWithRetry(ai, { model: MODEL_NAME, contents: ["Break down this image into blocks: [CAMERA], [POSE], [ENVIRONMENT], [LIGHTING], [COLOR].", stylePart] });
          const res3 = await generateWithRetry(ai, { model: MODEL_NAME, contents: [`Structure:\n${res1?.text || ''}\nSynthesize into a COMMA-SEPARATED prompt.\nCRITICAL: End output exactly with:\n${IDENTITY_LOCK}\n${BASE_NEGATIVE}`] });
          output = res3?.text?.trim() || '';
        } else if (engineVersion === '3.0') {
          const res1 = await generateWithRetry(ai, { model: MODEL_NAME, contents: ["IMAGE 1 (GOAL):", stylePart, "IMAGE 2 (FAILED):", feedbackPart, "Compare and critique what Image 2 got wrong."] });
          const res3 = await generateWithRetry(ai, { model: MODEL_NAME, contents: ["IMAGE 1 (GOAL):", stylePart, `Critique:\n${res1?.text || ''}\nWrite a NEW, comma-separated prompt.\nCRITICAL: End output exactly with:\n${IDENTITY_LOCK}\n${BASE_NEGATIVE}`] });
          output = res3?.text?.trim() || '';
        } else if (engineVersion === '4.0') {
          const clonePrompt = `Write a prompt to clone this EXACT image. Rules: 1. EXPLICIT ASPECT RATIO. 2. ANTI-HALLUCINATION. Output ONLY comma-separated prompt ending with:\n${IDENTITY_LOCK}\n${BASE_NEGATIVE}`;
          const res1 = await generateWithRetry(ai, { model: MODEL_NAME, contents: [clonePrompt, stylePart] });
          output = res1?.text?.trim() || '';
        } else if (engineVersion === '7.0') {
          const step1Prompt = `Reverse-engineer this image into a strict 5-paragraph natural language prompt. DO NOT use tag lists.
          Paragraph 1: "${IDENTITY_LOCK}"
          Paragraph 2: Describe camera shot, composition, geometric head tilt, eye gaze direction, and exact eyelid/lip tension (FACS).
          Paragraph 3: Describe wardrobe, background, and lighting.
          Paragraph 4: "${QUALITY_ANCHOR}"
          Paragraph 5: "${BASE_NEGATIVE}"`;
          const res1 = await generateWithRetry(ai, { model: MODEL_NAME, contents: [step1Prompt, stylePart] });
          output = res1?.text?.trim() || '';
        } else if (engineVersion === '8.0') {
          const step1Prompt = `TASK: 95% VISUAL SIMILARITY REVERSE-ENGINEERING (ENGINE 8.0 ULTRA)
Analyze this portrait image with extreme precision and reverse-engineer it into a structured, production-grade LABELED BLOCK prompt designed to achieve 95%+ visual similarity in Midjourney v6 / photorealistic models.

CRITICAL INSTRUCTIONS:
- Break down the image into exact physical, optical, and anatomical parameters.
- Capture micro-details: exact head tilt angle, eye gaze direction, catchlights, skin micro-pores, subsurface scattering, key light position, and textile weave.

STRUCTURE YOUR OUTPUT EXACTLY USING THESE LABELED BLOCKS:
[SUBJECT & ANATOMICAL IDENTITY]: Ultra-detailed physical description of the person (estimated age, ethnicity, bone structure, eye shape and color, eyebrow arch, nose bridge, lip shape, hair color, texture, styling, and hairline). ${IDENTITY_LOCK}
[EXPRESSION & MICRO-GAZE]: Exact facial action units (FACS), eyelid tension, lip parting, emotional subtlety, and direct/indirect eye gaze vector with precise corneal catchlights.
[WARDROBE & TEXTILES]: Exact garments, fabric material, weave texture, collar construction, color palette, seam details, and natural drape folds.
[PHOTOMETRIC LIGHTING SETUP]: Primary key light angle (e.g. 45-degree Rembrandt/Butterfly lighting with large softbox modifier), fill light ratio (3:1), rim/hair light separation, ambient shadow penumbra, and specular highlight placement on skin.
[OPTICS & CAMERA SCIENCE]: Camera focal length (85mm f/1.4 portrait prime), precise depth of field, creamy circular bokeh, framing (close-up / medium portrait), sensor color science (Kodak Portra 400 tonal gradation, authentic grain).
[ENVIRONMENT & BACKGROUND]: Background color tones, depth separation, atmospheric lighting, and architectural or studio elements.
[TECHNICAL ANCHORS]: ${QUALITY_ANCHOR}
[NEGATIVE EXCLUSIONS]: ${BASE_NEGATIVE}`;
          const res1 = await generateWithRetry(ai, { model: MODEL_NAME, contents: [step1Prompt, stylePart] });
          output = res1?.text?.trim() || '';
        } else if (engineVersion === '9.0') {
          const step1Prompt = `You are a master AI prompt engineer specialized in the "Artairus" cinematic aesthetic. Reverse engineer this image into a flowing, highly stylized, single paragraph prompt. 
          Focus heavily on extracting optical imperfections and dramatic lighting.
          Write the prompt as a cohesive description.
          CRITICAL: End your output exactly with this string:
          ${IDENTITY_LOCK}
          ${BASE_NEGATIVE}, sharp digital look, sterile lighting.`;
          const res1 = await generateWithRetry(ai, { model: MODEL_NAME, contents: [step1Prompt, stylePart] });
          output = res1?.text?.trim() || '';
        }
      }

      const cleanedOutput = extractPromptAndContext(output).prompt || output;
      res.json({ output: cleanedOutput || generateFallbackStudioPrompt().prompt });
    } catch {
      res.json({ output: generateFallbackStudioPrompt().prompt });
    }
  });

  app.post('/api/generate-persona', async (req, res) => {
    try {
      const { stylePart, customGeminiApiKey } = req.body;
      const userKey = customGeminiApiKey || (req.headers['x-gemini-api-key'] as string);
      const ai = getAiClient(userKey);
      if (ai) {
        const response = await generateWithRetry(ai, {
          model: MODEL_NAME,
          contents: [`Write a dynamic 'System Role' for an AI. Start exactly with: "You are an elite photographer..." Keep it under 150 words.`, stylePart]
        });
        if (response?.text) {
          return res.json({ output: response.text.trim() });
        }
      }
      res.json({ output: "You are an elite photographer and lighting director specializing in cinematic chiaroscuro, natural skin textures, and 85mm prime lens perspective." });
    } catch {
      res.json({ output: "You are an elite photographer and lighting director specializing in cinematic chiaroscuro, natural skin textures, and 85mm prime lens perspective." });
    }
  });

  app.post('/api/generate-prompt-v5-v6', async (req, res) => {
    try {
      const { engineVersion, personaOutput, stylePart, customGeminiApiKey } = req.body;
      const userKey = customGeminiApiKey || (req.headers['x-gemini-api-key'] as string);
      const ai = getAiClient(userKey);
      
      if (ai) {
        let p = engineVersion === '5.0' ? `Reverse engineer. KINEMATIC WIREFRAME. End with:\n${IDENTITY_LOCK}\n${BASE_NEGATIVE}` : `Reverse engineer using TROJAN HORSE method. End with:\n${IDENTITY_LOCK}\n${BASE_NEGATIVE}`;
        const response = await generateWithRetry(ai, {
          model: MODEL_NAME,
          contents: [p, stylePart],
          config: {
            systemInstruction: personaOutput
          }
        });
        const rawOutput = response?.text?.trim() || '';
        if (rawOutput) {
          const cleanedOutput = extractPromptAndContext(rawOutput).prompt || rawOutput;
          return res.json({ output: cleanedOutput || generateFallbackStudioPrompt().prompt });
        }
      }
      res.json({ output: generateFallbackStudioPrompt().prompt });
    } catch {
      res.json({ output: generateFallbackStudioPrompt().prompt });
    }
  });

  app.post('/api/analyze-sample-subject', async (req, res) => {
    try {
      const { base64Data, mimeType, customGeminiApiKey } = req.body;
      const userKey = customGeminiApiKey || (req.headers['x-gemini-api-key'] as string);
      const ai = getAiClient(userKey);
      
      if (ai) {
        const resData = await generateWithRetry(ai, {
          model: MODEL_NAME,
          contents: [
            `Analyze this reference image and classify the primary subject into one of these categories: زن (woman), مرد (man), بچه (child), پیرزن (elderly woman), پیرمرد (elderly man), حیوان (animal), شیء (object). Also provide a precise search query in English to find similar Pinterest model references. Return in JSON format with keys: category, subQuery, description (in Persian).`,
            { inlineData: { data: base64Data, mimeType } }
          ]
        });
        if (resData?.text) {
          return res.json({ output: resData.text.trim() });
        }
      }
      
      res.json({ 
        output: JSON.stringify({ 
          category: "زن", 
          subQuery: "cinematic portrait photography prompt", 
          description: "پرتره فوتورئالیستی با نورپردازی طبیعی و زاویه مستقیم لنز" 
        }) 
      });
    } catch {
      res.json({ 
        output: JSON.stringify({ 
          category: "زن", 
          subQuery: "cinematic portrait photography prompt", 
          description: "پرتره فوتورئالیستی با نورپردازی طبیعی و زاویه مستقیم لنز" 
        }) 
      });
    }
  });

  app.post('/api/generate-prompt-and-context', async (req, res) => {
    try {
      const { base64Data, mimeType, customInstructions, mode, customGeminiApiKey } = req.body;
      const userKey = customGeminiApiKey || (req.headers['x-gemini-api-key'] as string);
      const ai = getAiClient(userKey);
      const imagePart = { inlineData: { data: base64Data, mimeType } };

      if (mode === 'fast_filter') {
        const filterPrompt = customInstructions || `STRICT BINARY CLASSIFICATION: VALID AI PORTRAIT PROMPT CARD vs REJECT
Evaluate if this image features a real human portrait AND has an AI generation prompt card/box/text overlay.
Answer with exactly one word: YES or NO.`;
        if (ai) {
          const resPrompt = await generateWithRetry(ai, {
            model: MODEL_NAME,
            contents: [filterPrompt, imagePart],
            config: {
              maxOutputTokens: 5,
              temperature: 0.1,
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
            }
          });
          const text = resPrompt?.text?.trim() || '';
          if (text) {
            const extracted = extractPromptAndContext(text);
            return res.json({
              prompt: extracted.prompt || text,
              contextDesc: ''
            });
          }
        }
        return res.json({
          prompt: 'YES',
          contextDesc: ''
        });
      }

      // Motor 2: AI Supervisor Engine & High-Precision Classifier / Synthesizer
      const supervisorInstruction = `TASK: EXECUTIVE AI SUPERVISOR & MASTER PROMPT ARCHITECT
You are the Executive Supervisor and Creative Director of an elite AI Studio prompt production house. Your job is to rigorously audit this image, make an expert decision, and produce both the ultimate prompt and a captivating, professional Persian review.

STEP 1: INSPECTION & AUDIT
- Check if this image has an actual printed AI prompt card/box/text overlay.
- If YES:
  * PROMPT_SOURCE: OCR
  * ENGINE_NAME: استخراج مستقیم وفادارانه OCR از کارت پوستر
  * Extract all prompt text verbatim with zero omission or summary.
- If NO (the image is a raw photograph, or only has a few short/meaningless words or simple titles like "posing tips", "cute girl", "autumn vibes" which is NOT an AI prompt):
  * PROMPT_SOURCE: REVERSE_ENGINEERING
  * ENGINE_NAME: موتور اختصاصی ۸.۰ (طراحی بلوکی نور و آناتومی با ۹۵٪ شباهت بصری)
  * EXECUTE ENGINE 8.0 ULTRA PROTOCOL (95% Visual Similarity Architecture):
    Synthesize an ultra-detailed, highly structured Midjourney prompt using ALL-CAPS LABELED BLOCKS:
    1. [SUBJECT & ANATOMICAL IDENTITY]: Describe the exact face, bone structure, eye shape, nose bridge, lip contours, skin undertones, hair texture/styling, and facial geometry. Include: "${IDENTITY_LOCK}"
    2. [EXPRESSION & MICRO-GAZE]: Exact facial action units (FACS), eyelid tension, lip parting, emotional nuance, gaze angle, and corneal specular catchlights.
    3. [WARDROBE & TEXTILES]: Exact clothing items, fabrics, weave textures, collar construction, and natural drape folds.
    4. [PHOTOMETRIC LIGHTING SETUP]: Primary key light angle (e.g. 45-degree Rembrandt/Butterfly lighting with large modifier), fill light ratio (3:1), rim/hair light separation, ambient shadow penumbra, and specular highlight placement on cheekbones/skin.
    5. [OPTICS & CAMERA SCIENCE]: Camera focal length (85mm f/1.4 portrait prime), precise depth of field, creamy circular bokeh, framing, sensor color science (Kodak Portra 400 tonal gradation, authentic fine film grain).
    6. [ENVIRONMENT & BACKGROUND]: Background color tones, depth separation, atmospheric lighting, and architectural or studio elements.
    7. [TECHNICAL ANCHORS]: "${QUALITY_ANCHOR}"
    8. [NEGATIVE EXCLUSIONS]: "${BASE_NEGATIVE}"

STEP 2: PROFESSIONAL PERSUASIVE INTERPRETATION (تفسیر حرفه‌ای و ترغیب‌کننده به زبان فارسی)
Write a captivating, deeply persuasive and authoritative review in Persian that makes the user eager to use this prompt.
Analyze:
1. ساختار نورپردازی و کنتراست (نور ملایم جهت‌دار، ریم‌لایت، سایه‌روشن طبیعی).
2. اپتیک و ترکیب‌بندی دوربین (لنز ۸۵ میلی‌متری، عمق میدان، پرسپکتیو چشم).
3. ترغیب اختصاصی (چرا باید این پرامپت را تست کنید؟ توضیح دهید چرا خروجی این فرمول از کارهای متداول هوش مصنوعی فراتر و چشم‌نواز است).

STEP 3: CLICKBAIT CLEANUP
Never include "FULL PROMPT? VISIT WEBSITE ↓", telegram ads, or URL references.

FORMAT YOUR RESPONSE EXACTLY AS:
[PROMPT_SOURCE]
<OCR or REVERSE_ENGINEERING>
[/PROMPT_SOURCE]

[ENGINE_NAME]
<exact title of the engine in Persian>
[/ENGINE_NAME]

[PROMPT]
<complete verbatim transcribed prompt or generated engine prompt>
[/PROMPT]

[CONTEXT]
<one concise Persian sentence describing lighting and composition>
[/CONTEXT]

[SUPERVISOR_PITCH]
<the 2-3 paragraph captivating, highly persuasive and professional Persian critique and pitch>
[/SUPERVISOR_PITCH]

[LIGHTING_STYLE]
<e.g. نورپردازی دراماتیک رامبراند با ریم‌لایت ملایم>
[/LIGHTING_STYLE]

[CAMERA_OPTICS]
<e.g. لنز پرایم ۸۵ میلی‌متری با دیافراگم f/1.4>
[/CAMERA_OPTICS]

[QUALITY_SCORE]
<e.g. ۹.۸ / ۱۰>
[/QUALITY_SCORE]`;

      if (ai) {
        const resPrompt = await generateWithRetry(ai, {
          model: MODEL_NAME,
          contents: [supervisorInstruction, imagePart]
        });

        const rawText = resPrompt?.text?.trim() || '';
        if (rawText) {
          // Parse structured tags
          let source = 'OCR';
          if (rawText.includes('[PROMPT_SOURCE]')) {
            const srcPart = rawText.split('[PROMPT_SOURCE]')[1]?.split('[/PROMPT_SOURCE]')[0]?.trim();
            if (srcPart === 'REVERSE_ENGINEERING' || srcPart === 'NO_OCR_RAW_IMAGE') {
              source = 'REVERSE_ENGINEERING';
            }
          }

          let engineName = source === 'OCR' 
            ? 'استخراج مستقیم وفادارانه OCR از کارت پوستر' 
            : 'موتور اختصاصی ۸.۰ (طراحی بلوکی نور و آناتومی با ۹۵٪ شباهت بصری)';

          if (rawText.includes('[ENGINE_NAME]')) {
            const engPart = rawText.split('[ENGINE_NAME]')[1]?.split('[/ENGINE_NAME]')[0]?.trim();
            if (engPart) engineName = engPart;
          }

          let supervisorPitch = '';
          if (rawText.includes('[SUPERVISOR_PITCH]')) {
            supervisorPitch = rawText.split('[SUPERVISOR_PITCH]')[1]?.split('[/SUPERVISOR_PITCH]')[0]?.trim();
          }

          let lightingStyle = 'نورپردازی پرتره سینمایی با نور ملایم جهت‌دار';
          if (rawText.includes('[LIGHTING_STYLE]')) {
            const lPart = rawText.split('[LIGHTING_STYLE]')[1]?.split('[/LIGHTING_STYLE]')[0]?.trim();
            if (lPart) lightingStyle = lPart;
          }

          let cameraOptics = 'لنز پرایم ۸۵ میلی‌متری با دیافراگم f/1.4';
          if (rawText.includes('[CAMERA_OPTICS]')) {
            const cPart = rawText.split('[CAMERA_OPTICS]')[1]?.split('[/CAMERA_OPTICS]')[0]?.trim();
            if (cPart) cameraOptics = cPart;
          }

          let qualityScore = '۹.۷ / ۱۰';
          if (rawText.includes('[QUALITY_SCORE]')) {
            const qPart = rawText.split('[QUALITY_SCORE]')[1]?.split('[/QUALITY_SCORE]')[0]?.trim();
            if (qPart) qualityScore = qPart;
          }

          const parsed = extractPromptAndContext(rawText);
          let extractedPrompt = parsed.prompt || rawText;
          const extractedContextDesc = parsed.contextDesc || 'نورپردازی استودیویی با زاویه مستقیم و نور ملایم جهت‌دار.';
          
          // Apply secondary client-side cleanup for clickbait/telegram promotions
          extractedPrompt = cleanClickbaitText(extractedPrompt);

          let hasPrintedPrompt = source === 'OCR';
          let isTruncated = extractedPrompt.endsWith('...') || extractedPrompt.endsWith('…') || 
                            extractedPrompt.toLowerCase().includes('visit website') ||
                            extractedPrompt.toLowerCase().includes('telegram') ||
                            extractedPrompt.toLowerCase().includes('link in bio') ||
                            extractedPrompt.toLowerCase().includes('full prompt?');

          // If the OCR prompt is incomplete or contains truncation triggers, activate Google Search Grounding to find the full version!
          if (source === 'OCR' && isTruncated) {
            console.log('[Grounding] Detected truncated or incomplete prompt on card. Querying Google Search for full untruncated prompt...');
            const groundedPrompt = await groundPromptWithGoogleSearch(ai, extractedPrompt);
            if (groundedPrompt && groundedPrompt.length > extractedPrompt.length) {
              extractedPrompt = cleanClickbaitText(groundedPrompt);
              isTruncated = false; // Resolved using Google Search Grounding
              console.log('[Grounding] Successfully updated prompt with full untruncated Google grounded version!');
            }
          }

          if (!supervisorPitch) {
            supervisorPitch = `این اثر با بهره‌گیری از مهندسی نوری پیشرفته و فیزیک واقع‌گرایانه لنز ۸۵ میلی‌متری، یک سر و گردن از خروجی‌های متداول هوش مصنوعی بالاتر است. تفکیک ارگانیک سایه‌روشن‌ها و بازتاب طبیعی در چشم‌ها، حس یک شات زنده مجله ووگ یا عکاسی ادیتوریال را تداعی می‌کند؛ فرمولی بی‌نظیر که اجرای آن در میجرنی خروجی چشمگیری به همراه خواهد داشت.`;
          }

          return res.json({
            prompt: extractedPrompt,
            contextDesc: extractedContextDesc,
            hasPrintedPrompt,
            isTruncated,
            supervisorVerdict: {
              source,
              engineName,
              pitch: supervisorPitch,
              lightingStyle,
              cameraOptics,
              qualityScore
            }
          });
        }
      }

      // Fallback
      return res.json({
        prompt: 'Cinematic portrait photography, 85mm lens, natural directional lighting, high resolution.',
        contextDesc: 'نورپردازی پرتره سینمایی با نور ملایم جهت‌دار.',
        hasPrintedPrompt: false,
        isTruncated: false
      });
    } catch {
      return res.json({
        prompt: 'Cinematic portrait photography, 85mm lens, natural directional lighting, high resolution.',
        contextDesc: 'نورپردازی پرتره سینمایی با نور ملایم جهت‌دار.',
        hasPrintedPrompt: false,
        isTruncated: false
      });
    }
  });

  // موتور تکمیل پرامپت‌های ناقص و بریده‌شده از طریق جستجوی زنده در وب و گوگل
  app.post('/api/complete-partial-prompt', async (req, res) => {
    try {
      const { partialPrompt, titleHint, customGeminiApiKey } = req.body;
      if (!partialPrompt || !partialPrompt.trim()) {
        return res.status(400).json({ error: 'partialPrompt is required' });
      }

      const cleanSnippet = partialPrompt.replace(/^(?:prompt|prompts)\s*:\s*/i, '').replace(/[…\.\s]+$/, '').trim();
      const userKey = customGeminiApiKey || (req.headers['x-gemini-api-key'] as string);
      const ai = getAiClient(userKey);

      if (ai) {
        try {
          const searchQuery = `"${cleanSnippet.slice(0, 100)}" midjourney prompt`;
          const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `You are an expert AI prompt recovery system.
The following is a partial or truncated Midjourney/AI generation prompt extracted from an image card:
"${cleanSnippet}"
${titleHint ? `Related Pin context: "${titleHint}"` : ''}

Task: Search the web/Google to find the exact, full, and complete original prompt matching this snippet from Midjourney galleries, PromptHero, Civitai, Lexica, or Pinterest.
If the full prompt is found, output the complete verbatim prompt including all flags (--ar, --v, etc.).
If the exact full prompt is not found on the web, intelligently complete the sentence and parameters naturally to create a production-grade cinematic portrait prompt.

Output ONLY the final completed prompt. Do not add conversational intro or outro.`,
            config: {
              tools: [{ googleSearch: {} }]
            }
          });

          const completedText = response?.text?.trim();
          if (completedText) {
            const cleaned = extractPromptAndContext(completedText).prompt || completedText;
            return res.json({
              completedPrompt: cleaned,
              source: 'google_search_grounding'
            });
          }
        } catch {
          // fallback completion
        }
      }

      // Local intelligent completion fallback
      const completedFallback = `${cleanSnippet}, 8k resolution, editorial portrait photography, 85mm lens f/1.4, cinematic lighting, photorealistic skin texture, --ar 16:9 --v 6.0 --style raw`;
      return res.json({
        completedPrompt: completedFallback,
        source: 'local_heuristic_completion'
      });
    } catch (error: any) {
      res.json({
        completedPrompt: req.body?.partialPrompt || '',
        source: 'fallback'
      });
    }
  });

  // موتور پیشرفته تشخیص مشکلات و عیب‌یابی سیستم (System Diagnostic Engine)
  app.post('/api/diagnose', async (req, res) => {
    try {
      const { customGeminiApiKey, customOneApiToken } = req.body;
      const userKey = customGeminiApiKey || (req.headers['x-gemini-api-key'] as string);
      const ai = getAiClient(userKey);
      
      const diagnosisResult = {
        timestamp: new Date().toISOString(),
        googleApi: {
          status: 'checking',
          message: '',
          errorDetails: '',
          quotaStatus: 'unknown',
          latencyMs: 0,
          activeModel: MODEL_NAME,
          suggestedFix: ''
        },
        oneApi: {
          status: 'checking',
          message: '',
          latencyMs: 0
        }
      };

      // 1. Google Gemini Diagnosis
      if (!ai) {
        diagnosisResult.googleApi.status = 'danger';
        diagnosisResult.googleApi.message = 'کلید API یافت نشد. لطفاً یک کلید معتبر تنظیم کنید.';
        diagnosisResult.googleApi.suggestedFix = 'کلید گوگل خود را در بخش تنظیمات وارد کنید.';
      } else {
        const start = Date.now();
        try {
          // Send a fast test prompt with minimum tokens
          const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: 'ping',
            config: {
              maxOutputTokens: 2,
              temperature: 0,
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
            }
          });
          
          diagnosisResult.googleApi.latencyMs = Date.now() - start;
          if (response && response.text) {
            diagnosisResult.googleApi.status = 'success';
            diagnosisResult.googleApi.message = 'ارتباط زنده با گوگل برقرار است و کلید فعال است. (تست پینگ موفق)';
            diagnosisResult.googleApi.quotaStatus = 'normal';
          } else {
            diagnosisResult.googleApi.status = 'warning';
            diagnosisResult.googleApi.message = 'پاسخ دریافتی خالی بود ولی خطایی ثبت نشد.';
          }
        } catch (error: any) {
          diagnosisResult.googleApi.latencyMs = Date.now() - start;
          const errMsg = String(error.message || error);
          diagnosisResult.googleApi.errorDetails = errMsg;
          
          if (
            errMsg.includes('quota') || 
            errMsg.includes('exhausted') || 
            errMsg.includes('limit') || 
            errMsg.includes('429')
          ) {
            diagnosisResult.googleApi.status = 'quota_exceeded';
            diagnosisResult.googleApi.quotaStatus = 'exhausted';
            diagnosisResult.googleApi.message = 'خطای اتمام سهمیه (429 - Resource Exhausted)! سهمیه رایگان این کلید به پایان رسیده است.';
            diagnosisResult.googleApi.suggestedFix = 'کلید فعلی به حد نصاب مجاز درخواست در دقیقه/روز رسیده است. لطفاً کلید معتبر خودتان را در بخش تنظیمات بالا (بخش کلید اختصاصی) جایگزین کنید تا برنامه مجدد شروع به استخراج کند.';
          } else if (
            errMsg.includes('key') || 
            errMsg.includes('invalid') || 
            errMsg.includes('unauthenticated') || 
            errMsg.includes('401') || 
            errMsg.includes('403')
          ) {
            diagnosisResult.googleApi.status = 'invalid_key';
            diagnosisResult.googleApi.message = 'خطای احراز هویت (401/403 - Invalid API Key)! کلید وارد شده معتبر نیست.';
            diagnosisResult.googleApi.suggestedFix = 'اطمینان حاصل کنید که کلید کپی شده فاصله خالی نداشته باشد و معتبر باشد.';
          } else if (
            errMsg.includes('overloaded') || 
            errMsg.includes('busy') || 
            errMsg.includes('503')
          ) {
            diagnosisResult.googleApi.status = 'overloaded';
            diagnosisResult.googleApi.message = 'خطای موقتی شلوغی سرورهای گوگل (Model Overloaded).';
            diagnosisResult.googleApi.suggestedFix = 'چند ثانیه منتظر بمانید و دکمه را مجدداً بفشارید. سیستم به‌طور خودکار روی مدل‌های ثانویه جابجا می‌شود.';
          } else {
            diagnosisResult.googleApi.status = 'error';
            diagnosisResult.googleApi.message = `خطای متفرقه از سمت گوگل: ${errMsg}`;
            diagnosisResult.googleApi.suggestedFix = 'تنظیمات کلید را بررسی کنید یا اتصال اینترنت سرور را ارزیابی نمایید.';
          }
        }
      }

      // 2. Pinterest One-API & Live Network Diagnosis
      const oneApiToken = (customOneApiToken && customOneApiToken.trim()) || DEFAULT_ONE_API_TOKEN;
      const startOne = Date.now();
      try {
        let isSuccess = false;
        let msg = '';
        
        // اول بررسی سرور One-API
        try {
          const testRes = await fetch(`https://api.one-api.ir/pinterest/v1/search?q=portrait`, {
            method: 'GET',
            headers: { 'one-api-token': oneApiToken },
            signal: AbortSignal.timeout(7000)
          });
          diagnosisResult.oneApi.latencyMs = Date.now() - startOne;
          if (testRes.ok) {
            const data = await testRes.json();
            if (data && (data.status === 200 || Array.isArray(data.result))) {
              isSuccess = true;
              msg = 'اتصال به سرویس جستجوی One-API پینترست برقرار است و توکن شما فعال می‌باشد.';
            }
          }
        } catch {
          // در صورت بروز تاخیر در شبکه داخلی، بررسی اتصال مستقیم زنده پینترست
        }

        // اگر One-API پاسخ نداد، اتصال مستقیم به شبکه ابری پینترست ارزیابی می‌شود
        if (!isSuccess) {
          const liveRes = await fetch(`https://widgets.pinterest.com/v3/pidgets/users/prompthero/pins/`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(6000)
          });
          diagnosisResult.oneApi.latencyMs = Date.now() - startOne;
          if (liveRes.ok) {
            isSuccess = true;
            msg = 'اتصال مستقیم به شبکه ابری پینترست (Live Direct Stream) کاملاً برقرار است و تصاویر دریافت می‌شوند.';
          }
        }

        if (isSuccess) {
          diagnosisResult.oneApi.status = 'success';
          diagnosisResult.oneApi.message = msg;
        } else {
          diagnosisResult.oneApi.status = 'warning';
          diagnosisResult.oneApi.message = 'پاسخ دریافتی از پینترست با تاخیر مواجه شد. تصاویر از کش پشتیبان لود خواهند شد.';
        }
      } catch (err: any) {
        diagnosisResult.oneApi.latencyMs = Date.now() - startOne;
        diagnosisResult.oneApi.status = 'error';
        diagnosisResult.oneApi.message = `خطا در اتصال به پینترست: ${err.message || 'خطای شبکه'}`;
      }

      res.json(diagnosisResult);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error executing diagnostics' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
