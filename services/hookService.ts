// ──────────────────────────────────────────────────────
// Hook Lab Service — Gemini-powered hook text variants
// with visual design styles & AI backgrounds
// ──────────────────────────────────────────────────────

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { searchPexelsVideos, searchPexelsPhotos, getBestVideoUrl, hasPexelsApiKey } from './pexelsService';

export type HookStyle = 'numbered_list' | 'curiosity_gap' | 'bold_claim' | 'pain_point';
export type HookMode = 'speaker' | 'visual' | 'cinematic';
export type HookDesign = 'glassmorphism' | 'neo_brutalism' | 'clay_morphism' | 'minimalism' | 'liquid_glass' | 'skeuomorphism';

export const HOOK_MODES: { id: HookMode; name: string; icon: string; description: string }[] = [
  { id: 'speaker', name: 'Speaker', icon: '🎬', description: 'Text over your actual video' },
  { id: 'visual', name: 'AI Visual', icon: '🖼️', description: 'AI/Pexels background image' },
  { id: 'cinematic', name: 'Cinematic', icon: '🎭', description: 'Dark overlay with effects' },
];

export const HOOK_DESIGNS: { id: HookDesign; name: string; icon: string; description: string }[] = [
  { id: 'glassmorphism', name: 'Glass', icon: '🪟', description: 'Frosted blur, translucent cards' },
  { id: 'neo_brutalism', name: 'Brutal', icon: '🔲', description: 'Bold borders, offset shadows' },
  { id: 'clay_morphism', name: 'Clay', icon: '🫧', description: 'Soft 3D, puffy pastel cards' },
  { id: 'minimalism', name: 'Minimal', icon: '▫️', description: 'Clean white, thin lines' },
  { id: 'liquid_glass', name: 'Liquid', icon: '💧', description: 'Flowing gradients, chromatic' },
  { id: 'skeuomorphism', name: 'Skeu', icon: '🎛️', description: 'Metal textures, embossed' },
];

export interface HookVariant {
  id: string;
  style: HookStyle;
  styleName: string;
  hookText: string;
  confidence: number;
  reason: string;
  suggestedCaptionStyle?: string;
  visualKeyword: string;
  backgroundVideoUrl?: string;
  aiImageUrl?: string;
}

export interface ActiveHook {
  text: string;
  style: HookStyle;
  hookMode: HookMode;
  hookDesign: HookDesign;
  duration: number;
  backgroundVideoUrl?: string;
  aiImageUrl?: string;
}

export const HOOK_STYLES: { id: HookStyle; name: string; icon: string; description: string }[] = [
  { id: 'numbered_list', name: 'Numbered List', icon: '📋', description: 'Value promise with a number' },
  { id: 'curiosity_gap', name: 'Curiosity Gap', icon: '🤔', description: 'Open question that stops the scroll' },
  { id: 'bold_claim', name: 'Bold Claim', icon: '💥', description: 'Contrarian take with high energy' },
  { id: 'pain_point', name: 'Pain Point', icon: '🎯', description: 'Relatable problem, instant empathy' },
];

/**
 * Fetch a Pexels background video for a given visual keyword
 */
export async function fetchHookBackground(visualKeyword: string): Promise<string | undefined> {
  if (!hasPexelsApiKey()) return undefined;
  try {
    const videos = await searchPexelsVideos(visualKeyword, 3, 'portrait');
    if (videos.length > 0) {
      const pick = videos[Math.floor(Math.random() * Math.min(3, videos.length))];
      return getBestVideoUrl(pick);
    }
  } catch (e) {
    console.warn('[HookLab] Pexels fetch failed:', e);
  }
  return undefined;
}

/**
 * Generate/fetch an AI background image for a hook.
 * Tries Gemini image gen first, falls back to Pexels photos.
 */
export async function generateHookImage(
  hookText: string,
  visualKeyword: string,
  apiKey: string
): Promise<string | undefined> {
  // 1. Try Gemini image generation first
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Generate a cinematic, vertical (9:16) background image. Theme: "${visualKeyword}". Dark, moody, no text in image, dramatic lighting, saturated colors.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-preview-image-generation',
        contents: prompt,
        config: { responseModalities: ['TEXT', 'IMAGE'] as any },
      });

      const parts = (response as any).candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          console.log('[HookLab] AI image generated successfully');
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    } catch (e: any) {
      console.warn('[HookLab] Gemini image gen failed, falling back to Pexels:', e.message);
    }
  }

  // 2. Fallback: Pexels portrait photos
  if (hasPexelsApiKey() && visualKeyword) {
    try {
      const photos = await searchPexelsPhotos(visualKeyword, 5, 'portrait');
      if (photos.length > 0) {
        const pick = photos[Math.floor(Math.random() * Math.min(5, photos.length))];
        console.log('[HookLab] Using Pexels photo as hook background');
        return pick.src.portrait || pick.src.large;
      }
    } catch (e) {
      console.warn('[HookLab] Pexels photo fetch failed:', e);
    }
  }

  return undefined;
}

export async function generateHookVariants(
  srtText: string,
  topicContext: string,
  apiKey: string
): Promise<HookVariant[]> {
  if (!apiKey) throw new Error("API Key is required");

  const ai = new GoogleGenAI({ apiKey });

  const variantSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        style: { type: Type.STRING, enum: ['numbered_list', 'curiosity_gap', 'bold_claim', 'pain_point'] },
        hookText: { type: Type.STRING, description: "5-15 word hook. For numbered_list, START with a digit." },
        confidence: { type: Type.NUMBER, description: "1-10 retention prediction" },
        reason: { type: Type.STRING, description: "One sentence why this hook works" },
        suggestedCaptionStyle: {
          type: Type.STRING,
          enum: ['karaoke', 'pop-in', 'boxed', 'typewriter', 'bounce', 'glow', 'emoji', 'gradient', 'underline', 'netflix'],
        },
        visualKeyword: {
          type: Type.STRING,
          description: "A 2-3 word Pexels search term for a background video that matches the STORY of this hook. Must be cinematic and relevant to the specific content. Examples: 'coding dark screen', 'rocket launch space', 'ocean waves cinematic', 'gym workout energy', 'city night lights'.",
        },
      },
      required: ["style", "hookText", "confidence", "reason", "suggestedCaptionStyle", "visualKeyword"],
    },
  };

  const prompt = `You are a viral short-form video strategist. Analyze this transcript and generate scroll-stopping hooks.

TOPIC: ${topicContext || "General Educational Content"}

TRANSCRIPT:
${srtText.substring(0, 2000)}

Generate exactly 4 hooks — one per style. Each hook becomes a full-screen animated overlay for the first few seconds.

STYLES:
1. NUMBERED_LIST — Start with a digit: "3 ways to...", "The #1 thing..."
2. CURIOSITY_GAP — Open question: "What happens if...?", "Ever wondered why...?"
3. BOLD_CLAIM — Contrarian: "Stop doing...", "This is ruining your..."
4. PAIN_POINT — Empathetic: "Struggling with...?", "If you're tired of..."

RULES:
- 5-15 words MAX per hook. Punchy and speakable.
- Use SPECIFIC subject matter from the transcript — not generic
- Numbered list hooks MUST start with a digit
- Confidence 8-10: specific, surprising, or data-backed. 5-7: good but generic.
- VISUAL KEYWORD: Must describe a cinematic visual that matches the STORY being told. Think about what imagery would make the hook feel powerful. Be specific—don't use generic terms like "business" or "motivation".`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: variantSchema, maxOutputTokens: 2048 },
  });

  const variants = JSON.parse(response.text || "[]") as any[];
  const names: Record<string, string> = {
    numbered_list: 'Numbered List', curiosity_gap: 'Curiosity Gap',
    bold_claim: 'Bold Claim', pain_point: 'Pain Point',
  };

  // Generate variants first
  const hookVariants: HookVariant[] = variants.map((v) => ({
    id: crypto.randomUUID(),
    style: v.style as HookStyle,
    styleName: names[v.style] || v.style,
    hookText: v.hookText,
    confidence: Math.min(10, Math.max(1, v.confidence)),
    reason: v.reason,
    suggestedCaptionStyle: v.suggestedCaptionStyle,
    visualKeyword: v.visualKeyword || '',
  }));

  // Fetch Pexels backgrounds in parallel (non-blocking)
  if (hasPexelsApiKey()) {
    const bgPromises = hookVariants.map(async (variant) => {
      if (variant.visualKeyword) {
        variant.backgroundVideoUrl = await fetchHookBackground(variant.visualKeyword);
      }
    });
    await Promise.allSettled(bgPromises);
  }

  return hookVariants;
}
