
import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { GeneratedContent } from "../types";
import { constructPrompt } from "../utils/promptTemplates";
import { fileToBase64, pcmToWav, extractAudioBlob } from "../utils/audioHelpers";

export const validateGeminiConnection = async (apiKey: string, modelName: string): Promise<boolean | string> => {
  if (!apiKey) return false;
  const ai = new GoogleGenAI({ apiKey });
  try {
    // Simple verification call
    await ai.models.generateContent({
      model: modelName,
      contents: "Test connection.",
    });
    return true;
  } catch (e: any) {
    console.error("API Key Validation Failed:", e);
    // Return specific error messages based on the caught error
    if (e.message?.includes("404")) return "Model not found. Please check API availability.";
    if (e.message?.includes("400")) return "Bad Request. Invalid API Key or model.";
    if (e.message?.includes("429")) return "Rate limited. Please wait and try again.";
    if (e.message?.includes("API key")) return "Invalid API Key.";
    return `Connection failed: ${e.message || "Unknown error"}`;
  }
};

// Helper to convert seconds to SRT timestamp format (00:00:00,000)
const formatSRTTimestamp = (seconds: number): string => {
  const date = new Date(0);
  date.setMilliseconds(seconds * 1000);
  const iso = date.toISOString();
  // ISO is YYYY-MM-DDTHH:mm:ss.sssZ
  // We need HH:mm:ss,sss
  const timePart = iso.substr(11, 12).replace('.', ',');
  return timePart;
};

export const generateSRT = async (
  mediaFile: File | Blob,
  apiKey: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });

  // OPTIMIZATION: If input is a video, extract the audio track first.
  // Sending pure Audio (WAV) to Gemini significantly improves timestamp accuracy compared to processing video frames.
  let fileToProcess = mediaFile;
  let mimeType = mediaFile.type;

  if (mediaFile.type.startsWith('video/')) {
    try {
      console.log("Extracting audio from video for better transcription accuracy...");
      const audioBlob = await extractAudioBlob(mediaFile as File);
      fileToProcess = audioBlob;
      mimeType = 'audio/wav';
    } catch (e) {
      console.warn("Audio extraction failed, falling back to video processing.", e);
    }
  }

  const base64Data = await fileToBase64(fileToProcess);

  // Use Flash for speed and multimodal capability
  const model = 'gemini-2.5-flash';

  // Define a strict schema for subtitles to prevent formatting hallucinations
  const subtitleSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        start: { type: Type.NUMBER, description: "Start time in seconds (e.g. 1.5). Must be precise." },
        end: { type: Type.NUMBER, description: "End time in seconds (e.g. 3.0). Must be precise." },
        text: { type: Type.STRING, description: "The spoken text" }
      },
      required: ["start", "end", "text"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/mp3',
              data: base64Data
            }
          },
          {
            text: `You are a professional captioning assistant. 
            Extract the transcript from this audio with EXTREME TIMING PRECISION.
            
            CRITICAL RULES:
            1. Timestamps must align perfectly with the audio waveform. 
            2. Break text into naturally spoken short chunks (max 3-5 words per chunk).
            3. Do NOT hallucinate. Only transcribe what is clearly spoken.
            4. If there is silence, do not create segments.
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: subtitleSchema
      }
    });

    const segments = JSON.parse(response.text || "[]");

    // Convert JSON segments to SRT String
    let srtOutput = "";
    segments.forEach((seg: any, index: number) => {
      const id = index + 1;
      const startTime = formatSRTTimestamp(seg.start);
      const endTime = formatSRTTimestamp(seg.end);
      const text = seg.text.trim();

      srtOutput += `${id}\n${startTime} --> ${endTime}\n${text}\n\n`;
    });

    return srtOutput.trim();
  } catch (error: any) {
    console.error("SRT Generation Error:", error);
    // Propagate the actual error message from the API so the UI can display "Payload too large" etc.
    throw new Error(error.message || "Failed to auto-generate subtitles.");
  }
};

export const generateTTS = async (
  text: string,
  voice: 'male' | 'female',
  apiKey: string
): Promise<Blob> => {
  const ai = new GoogleGenAI({ apiKey });
  // Correct model for TTS
  const model = 'gemini-2.5-flash-preview-tts';

  // Map to Gemini Voices
  // Female: Kore, Male: Charon
  const voiceName = voice === 'female' ? 'Kore' : 'Charon';

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    // Convert Base64 to Uint8Array (PCM Data)
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Wrap raw PCM in WAV header so browsers can play/download it
    return pcmToWav(bytes, 24000);
  } catch (error: any) {
    console.error("TTS Generation Error:", error);
    throw new Error(`Failed to generate speech: ${error.message || "Unknown error"}`);
  }
};

export const generateReelContent = async (
  srtText: string,
  topicContext: string,
  apiKey: string,
  modelName: string,
  existingHtml?: string,
  existingLayout?: any,
  isAudioOnly: boolean = false,
  designStyle?: string
): Promise<GeneratedContent> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please enter it in the settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  /* Design-style-specific aesthetic instructions */
  const designInstructions = getDesignStyleInstructions(designStyle);

  const systemInstruction = `
    You are a world-class Motion Graphics Designer and Creative Technologist for high-retention social media video (Reels/TikTok).
    Your goal is to generate or refine a visual composition that transforms a raw transcript into an immersive, "edutainment" style video experience.

    ### DESIGN SYSTEM & AESTHETIC
    You must output high-fidelity, polished UI/UX animation.
    ${designInstructions}

    ### VISUAL CONTENT RULES (CRITICAL — READ CAREFULLY)
    The app already displays subtitles/captions over the video. Your HTML animation is the VISUAL LAYER — it must ILLUSTRATE concepts, NOT describe them in text.

    **DO NOT** create text cards that repeat what the speaker is saying. The subtitles handle that.
    
    **INSTEAD**, create VISUAL METAPHORS and INTERACTIVE ELEMENTS that represent the topic:
    - For **code/programming** topics → Show actual code being typed out (typewriter effect), syntax-highlighted snippets, terminal outputs
    - For **databases/SQL** → Show SQL queries typing out, data tables/grids filling with values, database schema diagrams
    - For **networking** → Show network node graphs, data packets flowing between nodes, routing diagrams
    - For **data structures** → Show the actual structure (linked list nodes, tree diagrams, hash tables, arrays with cells)
    - For **architecture** → Show system diagrams, boxes with arrows, layered stacks, microservice meshes
    - For **math/science** → Show formulas animating in, graphs plotting, equations transforming
    - For **timelines/history** → Show timeline bars, era markers progressing, before/after comparisons
    - For **comparisons** → Show side-by-side panels, progress bars, meter gauges, vs. splits
    - For **general concepts** → Show icons, abstract shapes, infographic-style visuals, animated diagrams

    **KEY PRINCIPLE**: If the speaker says "SQL let us talk to data", the animation should show a SQL query like \`SELECT * FROM users\` typing out with a blinking cursor — NOT a card that says "SQL: A language for databases".

    Think like a YouTube tech explainer's B-roll: code editors, terminal windows, architecture diagrams, flowing data visualizations.

    ### JAVASCRIPT ROBUSTNESS RULES (CRITICAL)
    To prevent "Uncaught TypeError" and "SyntaxError" loops, you MUST strictly follow these patterns:

    1. **NEVER use \`element.children\` or \`document.getElementsBy...\` for looping.**
       These return HTMLCollections which crash on \`.forEach\`.
       
    2. **ALWAYS use \`gsap.utils.toArray(selector)\` for selection.**
       - ❌ WRONG: \`document.querySelectorAll('.box').forEach(...)\`
       - ✅ CORRECT: \`gsap.utils.toArray('.box').forEach(...)\`
       
    3. **NEVER use unquoted values in GSAP objects.**
       - ❌ WRONG: \`{ width: 100% }\` (Crash)
       - ❌ WRONG: \`{ duration: 0.5s }\` (Crash)
       - ✅ CORRECT: \`{ width: '100%', duration: 0.5 }\`

    4. **Use the injected \`ReelHelper\` if needed:**
       - The environment has a helper: \`ReelHelper.createGrid(container, items)\`.

    ### OUTPUT DELIVERABLES
    1. **HTML5 Animation**: A single, self-contained string (HTML/CSS/JS).
    2. **Layout Timeline**: A JSON array defining how the screen is split.

    ### HTML/ANIMATION REQUIREMENTS
    - **Library**: YOU MUST USE **GSAP (GreenSock)**. Include: <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>.
    - **Structure**: Create multiple "Scenes" (#s1, #s2, #s3).
    - **Synchronization**: The JS **MUST** control the timeline via 'message' event.
      - \`window.addEventListener('message', (e) => { if(e.data.type==='timeupdate') tl.seek(e.data.time); ... });\`
    
    ### CODING RULES
    - **NO SINGLE-LINE COMMENTS**: Use \`/* */\` block comments only.
    - **USE TEMPLATE LITERALS**: Backticks (\`) for all strings.
    - try not to clip out or overlap elements, design elements and animation utilising the split ratio's html part screen realestate 
    ### LAYOUT CONFIG REQUIREMENTS
    - 'layoutMode': 'split', 'full-video', 'full-html'.
    - 'splitRatio': e.g., 0.60 (HTML takes top 60%).
    
    ${isAudioOnly ? `
    ### AUDIO ONLY MODE
    - FORCE 'layoutMode': 'full-html' FOR ALL SCENES.
    - The visuals must be continuously active.
    ` : ''}
  `;

  let prompt = constructPrompt(topicContext, srtText);

  if (existingHtml && existingLayout) {
    /* Refinement mode — include design rules inline since the existing HTML
       can be very large and we need Gemini to understand the full context */
    const truncatedHtml = existingHtml.length > 6000
      ? existingHtml.substring(0, 6000) + '\n<!-- ... truncated for brevity ... -->'
      : existingHtml;

    prompt = `
I have an existing HTML animation and Layout Config that I want to REFINE.

### DESIGN RULES (MUST FOLLOW)
- Library: GSAP (GreenSock) — include CDN script tag
- Dark mode (#050505 background), Neon accents (#00f3ff, #ff0055, #ffd700)
- Typography: Oswald (headers) + JetBrains Mono (data)
- Sync: listen to window.postMessage for timeupdate/play/pause → tl.seek(time)
- Use gsap.utils.toArray() for DOM selection (NEVER .children.forEach)
- Quote all CSS values in GSAP: { width: '100%', duration: 0.5 }
- NO single-line comments — use /* */ only
- Multiple scenes (#s1, #s2, #s3) with opacity transitions

### CURRENT HTML (to refine)
${truncatedHtml}

### CURRENT LAYOUT JSON
${JSON.stringify(existingLayout)}

### REFINEMENT INSTRUCTIONS
${topicContext || "Fix any syntax errors and improve the animation quality."}

### TRANSCRIPT
${srtText}

TASK: Return the FULLY UPDATED and COMPLETE HTML and Layout JSON. The HTML must be a complete document starting with <!DOCTYPE html>.
`;
  }

  const layoutStepSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      startTime: { type: Type.NUMBER },
      endTime: { type: Type.NUMBER },
      layoutMode: { type: Type.STRING, enum: ['split', 'full-video', 'full-html', 'pip-html'] },
      splitRatio: { type: Type.NUMBER },
      captionPosition: { type: Type.STRING, enum: ['top', 'bottom', 'center', 'hidden'] },
      note: { type: Type.STRING }
    },
    required: ["startTime", "endTime", "layoutMode", "splitRatio", "captionPosition"]
  };

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      html: { type: Type.STRING },
      layoutConfig: { type: Type.ARRAY, items: layoutStepSchema },
      reasoning: { type: Type.STRING }
    },
    required: ["html", "layoutConfig"]
  };

  const reelHelperScript = `<script>
        /* MOTIONIFY STANDARD LIBRARY */
        (function() {
            if (typeof HTMLCollection !== 'undefined' && !HTMLCollection.prototype.forEach) {
                HTMLCollection.prototype.forEach = Array.prototype.forEach;
            }
            if (typeof NodeList !== 'undefined' && !NodeList.prototype.forEach) {
                NodeList.prototype.forEach = Array.prototype.forEach;
            }
            window.ReelHelper = {
                select: function(selector, context) {
                    if (!window.gsap) return [];
                    return gsap.utils.toArray(selector, context);
                },
                clear: function(element) {
                    if(element) element.innerHTML = '';
                }
            };
            console.log("Motionify: Standard Library Loaded");
        })();
    </script>`;

  /* Attempt generation with one automatic retry if HTML comes back empty */
  const attemptGenerate = async (attempt: number = 1): Promise<GeneratedContent> => {
    try {
      console.log(`[Reel Gen] Attempt ${attempt} — model: ${modelName}, prompt length: ${prompt.length} chars`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          maxOutputTokens: 65536,
        },
      });

      const rawText = response.text || "{}";
      console.log(`[Reel Gen] Response received — ${rawText.length} chars`);
      let result: any;
      try {
        result = JSON.parse(rawText);
      } catch (parseErr) {
        console.error("[Reel Gen] JSON parse failed, raw response:", rawText.substring(0, 500));
        throw new Error("AI returned invalid JSON. The response may have been truncated. Try again or use a shorter transcript.");
      }

      console.log(`[Reel Gen] Parsed — html: ${result.html?.length || 0} chars, layoutConfig: ${result.layoutConfig?.length || 0} steps`);

      if (!result.html || result.html.trim().length < 100) {
        console.warn(`[Reel Gen] Attempt ${attempt}: Empty/short HTML (${result.html?.length || 0} chars). ${attempt < 3 ? 'Retrying...' : 'Giving up.'}`);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1500));
          return attemptGenerate(attempt + 1);
        }
        throw new Error("AI returned empty HTML after 3 attempts. Try simplifying your topic or use a different model.");
      }

      /* Validate: layoutConfig must exist */
      if (!result.layoutConfig || !Array.isArray(result.layoutConfig) || result.layoutConfig.length === 0) {
        result.layoutConfig = [{
          startTime: 0,
          endTime: 100,
          layoutMode: 'split',
          splitRatio: 0.55,
          captionPosition: 'bottom',
          note: 'Default fallback layout'
        }];
      }

      /* Inject helper script */
      if (result.html.includes('<head>')) {
        result.html = result.html.replace('<head>', '<head>' + reelHelperScript);
      } else {
        result.html = reelHelperScript + result.html;
      }

      /* Attach the exact prompts used for debugging/copying */
      result.rawPrompt = prompt;
      result.systemPrompt = systemInstruction;

      return result as GeneratedContent;
    } catch (error: any) {
      console.error(`Gemini Generation Error (attempt ${attempt}):`, error);

      /* On first/second attempt, retry for transient errors */
      if (attempt < 3 && (error.message?.includes("500") || error.message?.includes("503") || error.message?.includes("INTERNAL"))) {
        console.warn(`[Reel Gen] Server error, retrying in ${attempt}s...`);
        await new Promise(r => setTimeout(r, attempt * 1500));
        return attemptGenerate(attempt + 1);
      }

      let message = "Failed to generate content.";
      if (error.message?.includes("404")) message = "Model not found. Please check API availability.";
      else if (error.message?.includes("400")) message = "Bad Request. The prompt may be too long — try a shorter transcript.";
      else if (error.message?.includes("429")) message = "Rate limited. Please wait 30 seconds and try again.";
      else if (error.message?.includes("API key")) message = "Invalid API Key.";
      else if (error.message?.includes("truncated") || error.message?.includes("empty")) message = error.message;
      else message = `Generation failed: ${error.message}`;
      throw new Error(message);
    }
  };

  return attemptGenerate();
};

/* ═══════════════════════════════════════════════════════
   Design Style Instructions for HTML Animation Generation
   Each style provides Gemini with specific CSS/design rules.
   IMPORTANT: Each style must be self-contained and comprehensive
   so the AI doesn't fall back to Default aesthetics.
   ═══════════════════════════════════════════════════════ */
export function getDesignStyleInstructions(style?: string): string {
  switch (style) {
    case 'glassmorphism':
      return `**DESIGN STYLE: GLASSMORPHISM** — You MUST fully commit to this style. Do NOT mix in dark-neon or cyberpunk aesthetics.
    1. **Color Palette**: Dark frosted backgrounds. 
       - \`:root { --bg-deep: #0a0a1a; --glass-bg: rgba(255,255,255,0.08); --glass-border: rgba(255,255,255,0.15); --primary: #60a5fa; --accent: #a78bfa; --white: #f0f0ff; }\`
    2. **Google Fonts**: Include \`<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">\`
    3. **Card Style**: All content containers MUST use frosted glass effect:
       - \`background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);\`
    4. **Typography**: Use 'Inter'. Clean, modern, light weight (300-400 body, 600-700 headings).
    5. **Animation**: Smooth, elegant. Fade + scale. Glass shimmer effects. Subtle blur transitions. Use \`power2.inOut\` easing.
    6. **Background**: \`background: radial-gradient(ellipse at top, #1a1a3e 0%, #0a0a1a 70%);\` — NOT pure black.
    7. **NO** harsh neon glows, NO JetBrains Mono, NO Oswald. Keep it refined, frosted, translucent.`;

    case 'neo_brutalism':
      return `**DESIGN STYLE: NEO-BRUTALISM** — You MUST fully commit to this style. Do NOT use dark backgrounds or neon colors.
    1. **Color Palette**: Bright, bold, raw. LIGHT backgrounds.
       - \`:root { --bg-deep: #fffbe6; --primary: #ff6b35; --secondary: #004e89; --accent: #f7c948; --black: #1a1a2e; --white: #fffbe6; }\`
    2. **Google Fonts**: Include \`<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">\`
    3. **Card Style**: All containers MUST have:
       - \`background: var(--accent); border: 4px solid var(--black); box-shadow: 6px 6px 0 var(--black); border-radius: 0;\`
       - SHARP corners (border-radius: 0). THICK borders. OFFSET shadows.
    4. **Typography**: Use 'Space Grotesk' or 'Arial Black'. BOLD, uppercase, large. Dark text on light/colored backgrounds.
    5. **Animation**: Aggressive — SLAM in with \`back.out(2)\`, shake, bounce. Use \`expo.out\` for reveals. No subtle fades.
    6. **Background**: body background MUST be \`var(--bg-deep)\` (#fffbe6) — a warm cream. NOT dark.
    7. **Text color**: ALWAYS dark (#1a1a2e) on bright backgrounds. High contrast. Raw energy.`;

    case 'clay_morphism':
      return `**DESIGN STYLE: CLAYMORPHISM** — You MUST fully commit to this style. Do NOT use dark backgrounds or neon colors.
    1. **Color Palette**: Soft pastels, friendly. LIGHT backgrounds.
       - \`:root { --bg-deep: #f0e6ff; --card-bg: #e8dff5; --primary: #7c3aed; --accent: #ec4899; --success: #10b981; --white: #faf5ff; }\`
    2. **Google Fonts**: Include \`<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;800&display=swap" rel="stylesheet">\`
    3. **Card Style**: Soft, puffy, clay-like 3D:
       - \`background: linear-gradient(145deg, #e8dff5, #d4c5e8); border-radius: 20px; box-shadow: 8px 8px 16px rgba(0,0,0,0.15), -4px -4px 8px rgba(255,255,255,0.7), inset 2px 2px 4px rgba(255,255,255,0.5); border: none;\`
    4. **Typography**: Use 'Nunito'. Friendly, soft, rounded. Dark text on pastel backgrounds.
    5. **Animation**: Bouncy, jelly-like. Use GSAP \`elastic.out(1, 0.3)\` ease. Squash and stretch effects.
    6. **Background**: body background MUST be \`var(--bg-deep)\` (#f0e6ff) — soft lavender. NOT dark.
    7. **Icons/Elements**: Rounded, soft, 3D-feeling. Pastel accents. NO sharp edges.`;

    case 'minimalism':
      return `**DESIGN STYLE: MINIMALISM** — You MUST fully commit to this style. Do NOT use dark backgrounds or neon colors or glows.
    1. **Color Palette**: Monochrome with ONE accent.
       - \`:root { --bg-deep: #fafafa; --card-bg: #ffffff; --primary: #18181b; --accent: #3b82f6; --gray: #a1a1aa; --white: #ffffff; }\`
    2. **Google Fonts**: Include \`<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">\`
    3. **Card Style**: Clean, borderless or 1px hairline:
       - \`background: #fff; border: 1px solid #e4e4e7; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);\`
    4. **Typography**: Use 'Inter' weight 300-400. Lots of whitespace. Small, elegant text. Dark text on white/light backgrounds.
    5. **Animation**: Subtle — gentle opacity fades (duration 0.8-1.2s), small translateY (10-20px) movements. \`power1.out\` easing. NO glows, NO bouncing, NO neon.
    6. **Background**: body background MUST be \`var(--bg-deep)\` (#fafafa) — near-white. NOT dark.
    7. **Layout**: Use generous padding (6-8vmin) and spacing. Less is more. Clean grid lines.`;

    case 'liquid_glass':
      return `**DESIGN STYLE: LIQUID GLASS** — You MUST fully commit to this style. Chromatic, fluid, organic.
    1. **Color Palette**: Deep dark with chromatic accents.
       - \`:root { --bg-deep: #050510; --glass-bg: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(100,200,255,0.08)); --primary: #00d4ff; --accent: #ff00aa; --white: #e0f0ff; }\`
    2. **Google Fonts**: Include \`<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap" rel="stylesheet">\`
    3. **Card Style**: Fluid glass with gradient borders:
       - \`background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,200,255,0.08)); backdrop-filter: blur(16px) saturate(1.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.4);\`
    4. **Typography**: Use 'Outfit'. Apply gradient text fills (\`background-clip: text; -webkit-text-fill-color: transparent;\`). Futuristic, clean.
    5. **Animation**: Floating, fluid. Organic motion paths. Subtle rotation. Chromatic aberration effects. Use \`sine.inOut\` easing.
    6. **Background**: \`background: radial-gradient(ellipse at 30% 50%, #0a0a2e 0%, #050510 80%);\`
    7. **Effects**: Use CSS filters for blur/glow. Make elements feel like they're underwater or floating in liquid.`;

    case 'skeuomorphism':
      return `**DESIGN STYLE: SKEUOMORPHISM** — You MUST fully commit to this style. Realistic textures, depth.
    1. **Color Palette**: Rich, realistic.
       - \`:root { --bg-deep: #2c2c2e; --card-bg: linear-gradient(180deg, #3a3a3c, #2c2c2e); --primary: #ff9f0a; --accent: #30d158; --white: #e5e5ea; }\`
    2. **Google Fonts**: Include \`<link href="https://fonts.googleapis.com/css2?family=Georgia&display=swap" rel="stylesheet">\` (or use system serif)
    3. **Card Style**: Realistic depth, metal/leather feel:
       - \`background: linear-gradient(180deg, #3a3a3c 0%, #2c2c2e 100%); border: 1px solid #48484a; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.3);\`
    4. **Typography**: Use 'Georgia', serif, or system serif. Embossed text effect:
       - \`text-shadow: 0 -1px 0 rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05);\`
    5. **Animation**: Mechanical, precise. Dial turns, meter fills, switch toggles. Use \`power2.inOut\` easing.
    6. **Elements**: Rounded rectangles with realistic lighting. Inner glows. Beveled edges.`;

    default:
      return `**DESIGN STYLE: CYBERPUNK NEON (DEFAULT)** — Commit fully to dark-mode cyberpunk with neon accents.
    1. **Color Palette**: Use CSS variables. Pure dark background with vibrant neon accents.
       - \`:root { --bg-deep: #050505; --primary: #00f3ff; --success: #00ff9d; --warning: #ffd700; --danger: #ff0055; --white: #ffffff; }\`
    2. **Google Fonts**: Include \`<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">\`
    3. **Card Style**: Dark glassmorphism with neon borders:
       - \`background: rgba(255,255,255,0.04); border: 1px solid rgba(0,243,255,0.2); border-radius: 12px; box-shadow: 0 0 20px rgba(0,243,255,0.1);\`
    4. **Typography**: Mix 'Oswald' (Headers, uppercase, bold) and 'JetBrains Mono' (Data/Code, monospaced).
    5. **Animation Style (GSAP)**: No static slides. Elements must pulse, float, or glow. Use \`back.out(1.7)\` for spawns, \`expo.out\` for reveals. Neon glow pulses via box-shadow animations.
    6. **Background**: \`background: radial-gradient(circle at center, #111827 0%, #000000 90%);\`
    7. **Effects**: Neon glows (\`box-shadow: 0 0 30px rgba(0,243,255,0.3)\`), text shadows, scanning lines.`;
  }
}