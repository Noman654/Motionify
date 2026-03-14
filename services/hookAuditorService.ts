// ──────────────────────────────────────────────────────
// Hook Auditor Service — Gemini Vision-powered hook reviewer
// Captures frames and sends them to Gemini for visual critique
// with ACTIONABLE suggestions (design, mode, caption style)
// ──────────────────────────────────────────────────────

import { GoogleGenAI, Type, Schema } from "@google/genai";

export type AuditSeverity = 'critical' | 'warning' | 'info' | 'pass';
export type AuditCategory = 'readability' | 'occlusion' | 'hierarchy' | 'timing' | 'color' | 'scroll_stop';
export type AuditVerdict = 'pass' | 'warning' | 'fail';

export interface AuditIssue {
  category: AuditCategory;
  severity: AuditSeverity;
  description: string;
  fix: string;
  frameIndex: number;
}

export interface HookAuditResult {
  overallScore: number;
  verdict: AuditVerdict;
  issues: AuditIssue[];
  suggestedCaptionStyle: string;
  suggestedDesign: string;  // Actionable: glassmorphism, neo_brutalism, clay_morphism, minimalism, liquid_glass, skeuomorphism
  suggestedMode: string;    // Actionable: speaker, visual, cinematic
  summary: string;
}

const HOOK_AUDIT_PROMPT = `You are a world-class TikTok/Instagram Reels retention expert analyzing a short-form video hook.

You are given 3 screenshot frames captured at 0s, 1s, and 2s of a video with a hook text overlay. The hook transcript is also provided.

EVALUATE these factors:
1. **TEXT READABILITY** — Is text clearly readable? Check contrast, sizing, visual noise.
2. **FACE OCCLUSION** — Does text cover important visual content?
3. **VISUAL HIERARCHY** — Does the viewer see the hook text FIRST?
4. **TIMING** — Can a viewer read and absorb the hook within 2 seconds?
5. **COLOR HARMONY** — Does the styling work with the video's palette?
6. **SCROLL-STOP POWER** — Would Frame 0 stop someone mid-scroll?

SCORING: 9-10 = ship it, 7-8 = solid, 5-6 = needs fixes, 3-4 = significant problems, 1-2 = critical.

DESIGN STYLES AVAILABLE (suggest which would work best):
- glassmorphism: Frosted glass card, blur, subtle borders
- neo_brutalism: Bold accent color bg, thick black borders, offset shadow — ATTENTION-GRABBING
- clay_morphism: Soft puffy shadows, rounded, friendly
- minimalism: Clean, thin text, no card, elegant
- liquid_glass: Gradient glass, floating animation, futuristic
- skeuomorphism: Metal gradient, embossed text, classic

BACKGROUND MODES AVAILABLE (suggest which would work best):
- speaker: Text overlaid on the actual video (viral default — speaker visible)
- visual: AI-generated or stock photo background image
- cinematic: Dark overlay with accent glows

For each issue, suggest a SPECIFIC fix. Always recommend the best design style and background mode.`;

const auditResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.NUMBER, description: "1-10 hook visual effectiveness score" },
    verdict: { type: Type.STRING, enum: ['pass', 'warning', 'fail'] },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: ['readability', 'occlusion', 'hierarchy', 'timing', 'color', 'scroll_stop'] },
          severity: { type: Type.STRING, enum: ['critical', 'warning', 'info', 'pass'] },
          description: { type: Type.STRING, description: "Clear, actionable description" },
          fix: { type: Type.STRING, description: "Specific fix or recommendation" },
          frameIndex: { type: Type.NUMBER, description: "Which frame (0, 1, or 2)" }
        },
        required: ["category", "severity", "description", "fix", "frameIndex"]
      }
    },
    suggestedCaptionStyle: {
      type: Type.STRING,
      description: "Best caption style: karaoke, pop-in, boxed, typewriter, bounce, glow, emoji, gradient, underline, netflix"
    },
    suggestedDesign: {
      type: Type.STRING,
      enum: ['glassmorphism', 'neo_brutalism', 'clay_morphism', 'minimalism', 'liquid_glass', 'skeuomorphism'],
      description: "Best visual design style for this hook"
    },
    suggestedMode: {
      type: Type.STRING,
      enum: ['speaker', 'visual', 'cinematic'],
      description: "Best background mode for this hook"
    },
    summary: { type: Type.STRING, description: "One-sentence actionable verdict" }
  },
  required: ["overallScore", "verdict", "issues", "suggestedCaptionStyle", "suggestedDesign", "suggestedMode", "summary"]
};


/**
 * Capture the actual visual output of the player container using html-to-image.
 * This captures EVERYTHING the viewer sees: video, hook overlay, text, animations.
 * Falls back to native Canvas (video frame only) if DOM capture fails.
 */
export async function capturePlayerFrame(
  videoElement: HTMLVideoElement,
  playerContainer: HTMLElement,
  targetTime: number,
  _hookText?: string,
  _hookStyle?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const onSeeked = async () => {
      videoElement.removeEventListener('seeked', onSeeked);

      // Wait for the frame + overlay to render
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200))));

      // Try 1: html-to-image (captures actual DOM visual)
      try {
        const { toJpeg } = await import('html-to-image');
        const dataUrl = await toJpeg(playerContainer, {
          quality: 0.6,
          pixelRatio: 0.5, // Half-res for smaller payload
          backgroundColor: '#000000',
          skipFonts: true,
          // Filter out controls and non-visual elements
          filter: (node: HTMLElement) => {
            if (!node.classList) return true;
            if (node.classList.contains('player-controls-bar')) return false;
            if (node.tagName === 'BUTTON') return false;
            return true;
          },
        });

        const base64 = dataUrl.split(',')[1];
        if (base64 && base64.length > 100) {
          console.log(`[Hook Auditor] DOM capture success at ${targetTime}s (${Math.round(base64.length / 1024)}KB)`);
          resolve(base64);
          return;
        }
      } catch (e) {
        console.warn(`[Hook Auditor] html-to-image failed at ${targetTime}s, falling back to canvas:`, e);
      }

      // Fallback: Native Canvas (video frame only)
      try {
        const W = 270, H = 480;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d')!;

        const vw = videoElement.videoWidth || videoElement.clientWidth;
        const vh = videoElement.videoHeight || videoElement.clientHeight;
        if (vw && vh) {
          const va = vw / vh, ca = W / H;
          let sx = 0, sy = 0, sw = vw, sh = vh;
          if (va > ca) { sw = vh * ca; sx = (vw - sw) / 2; }
          else { sh = vw / ca; sy = (vh - sh) / 2; }
          ctx.drawImage(videoElement, sx, sy, sw, sh, 0, 0, W, H);
        } else {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, W, H);
          ctx.drawImage(videoElement, 0, 0, W, H);
        }

        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
        console.log(`[Hook Auditor] Canvas fallback at ${targetTime}s (${Math.round(base64.length / 1024)}KB)`);
        resolve(base64);
      } catch (err) {
        reject(err);
      }
    };

    videoElement.addEventListener('seeked', onSeeked);
    videoElement.currentTime = targetTime;
  });
}


/**
 * Run the hook audit using Gemini 2.0 Flash Vision.
 * Takes 3 base64-encoded JPEG frames and the hook text.
 */
export async function auditHookVisuals(
  frames: string[], // base64 JPEG frames at 0s, 1s, 2s
  hookText: string,
  apiKey: string
): Promise<HookAuditResult> {
  if (!apiKey) throw new Error("API Key is required for AI Review");
  if (frames.length < 3) throw new Error("Need exactly 3 frames for audit");

  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = [];

  // Add the 3 frames as inline image data
  frames.forEach((frame, i) => {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: frame
      }
    });
    parts.push({
      text: `[Frame ${i} — captured at ${i} second${i !== 1 ? 's' : ''}]`
    });
  });

  // Add the text prompt
  parts.push({
    text: `${HOOK_AUDIT_PROMPT}\n\n---\n\nHOOK TRANSCRIPT: "${hookText}"\n\nAnalyze the 3 frames above and provide your audit.`
  });

  // Retry wrapper for transient errors
  const attempt = async (tryNum: number): Promise<HookAuditResult> => {
    try {
      console.log(`[Hook Auditor] Attempt ${tryNum} — sending ${frames.length} frames to gemini-2.5-flash...`);
      console.log(`[Hook Auditor] Frame sizes: ${frames.map(f => `${Math.round(f.length / 1024)}KB`).join(', ')}`);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: auditResponseSchema,
          maxOutputTokens: 4096,
        }
      });

      const rawText = response.text || "{}";
      console.log(`[Hook Auditor] Response: ${rawText.substring(0, 200)}...`);

      const result = JSON.parse(rawText);

      // Validate and normalize
      return {
        overallScore: Math.min(10, Math.max(1, result.overallScore || 5)),
        verdict: (['pass', 'warning', 'fail'].includes(result.verdict) ? result.verdict : 'warning') as AuditVerdict,
        issues: Array.isArray(result.issues) ? result.issues : [],
        suggestedCaptionStyle: result.suggestedCaptionStyle || 'boxed',
        suggestedDesign: result.suggestedDesign || 'glassmorphism',
        suggestedMode: result.suggestedMode || 'speaker',
        summary: result.summary || 'Audit complete.',
      };
    } catch (error: any) {
      console.error(`[Hook Auditor] API Error (attempt ${tryNum}):`, error);
      console.error(`[Hook Auditor] Error details:`, error.message, error.status, error.statusCode);

      // Retry once on transient errors (429, 500, 503)
      if (tryNum < 2 && (
        error.message?.includes("429") ||
        error.message?.includes("500") ||
        error.message?.includes("503") ||
        error.message?.includes("RESOURCE_EXHAUSTED")
      )) {
        console.log(`[Hook Auditor] Retrying in 3 seconds...`);
        await new Promise(r => setTimeout(r, 3000));
        return attempt(tryNum + 1);
      }

      // Surface the real error message
      const realMsg = error.message || "Unknown error";
      throw new Error(`AI Review failed: ${realMsg}`);
    }
  };

  return attempt(1);
}
