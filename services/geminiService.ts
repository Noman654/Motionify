
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GeneratedContent } from "../types";
import { constructPrompt } from "../utils/promptTemplates";

export const validateGeminiConnection = async (apiKey: string, modelName: string): Promise<boolean> => {
  if (!apiKey) return false;
  const ai = new GoogleGenAI({ apiKey });
  try {
    // Simple verification call
    await ai.models.generateContent({
        model: modelName,
        contents: "Test connection.",
    });
    return true;
  } catch (e) {
    console.error("API Key Validation Failed:", e);
    return false;
  }
};

export const generateReelContent = async (
  srtText: string,
  topicContext: string,
  apiKey: string,
  modelName: string,
  existingHtml?: string,
  existingLayout?: any
): Promise<GeneratedContent> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please enter it in the settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are a world-class Motion Graphics Designer and Creative Technologist for high-retention social media video (Reels/TikTok).
    Your goal is to generate or refine a visual composition that transforms a raw transcript into an immersive, "edutainment" style video experience.

    ### DESIGN SYSTEM & AESTHETIC (STRICTLY FOLLOW THIS ESSENCE)
    You must output high-fidelity, polished UI/UX animation.
    1. **Color Palette**: Use CSS variables. Dark background (#050505), Neon accents.
       - \`:root { --bg-deep: #050505; --primary: #00f3ff; --success: #00ff9d; --warning: #ffd700; --danger: #ff0055; --white: #ffffff; }\`
    2. **Typography**: Mix 'Oswald' (Headers) and 'JetBrains Mono' (Data/Code).
       - \`.h1-mega { font-size: 10vmin; line-height: 0.9; text-transform: uppercase; text-shadow: 0 0 30px rgba(0, 243, 255, 0.4); }\`
    3. **Layout Structure**:
       - Container: \`#stage { perspective: 1000px; background: radial-gradient(...) }\`
       - Scenes: \`.scene { position: absolute; inset: 0; opacity: 0; display: flex; flex-direction: column; ... }\`
       - **Glassmorphism**: Use \`backdrop-filter: blur(10px); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);\` for cards.
    4. **Animation Style (GSAP)**:
       - Use \`tl.to(..., { ... }, "label")\` for precise sequencing.
       - No static slides. Things must pulse, float, or glow.
       - Use \`TextPlugin\` for typing effects.

    ### OUTPUT DELIVERABLES
    1. **HTML5 Animation**: A single, self-contained string (HTML/CSS/JS).
    2. **Layout Timeline**: A JSON array defining how the screen is split between the speaker and the animation.

    ### HTML/ANIMATION REQUIREMENTS
    - **Library**: YOU MUST USE **GSAP (GreenSock)** for all animations. Include: <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>.
    - **Structure**:
      - Create multiple "Scenes" (#s1, #s2, #s3) that correspond to timestamps.
      - **Synchronization**: The JS **MUST** control the timeline via 'message' event.
      - **Init**: \`const tl = gsap.timeline({ paused: true });\`
      - **Sync**: \`window.addEventListener('message', (e) => { if(e.data.type==='timeupdate') tl.seek(e.data.time); ... });\`
    
    ### CRITICAL CODING RULES (Prevent Syntax Errors)
    - **NO SINGLE-LINE COMMENTS**: Do NOT use \`//\` comments in JavaScript. They break the code when minified or returned as a single line. Use \`/* */\` block comments if necessary, or no comments at all.
    - **NO UNESCAPED NEWLINES IN STRINGS**: Do NOT use single (') or double (") quotes for multi-line strings in JavaScript.
    - **USE TEMPLATE LITERALS**: ALWAYS use backticks (\`) for any string that might span multiple lines or contains HTML markup.

    ### LAYOUT CONFIG REQUIREMENTS
    - 'layoutMode': 'split' (standard), 'full-video' (focus on speaker), 'full-html' (focus on graphics/charts).
    - 'splitRatio': e.g., 0.60 (HTML takes top 60%).
    - 'captionPosition': 'top', 'center', 'bottom' (dynamically move based on where the graphics are).
  `;

  let prompt = constructPrompt(topicContext, srtText);

  // If refinement is requested, modify the prompt to include previous state
  if (existingHtml && existingLayout) {
      prompt = `
      I have an existing HTML animation and Layout Config that I want to REFINE based on new instructions.
      
      *** CURRENT HTML ***
      ${existingHtml}

      *** CURRENT LAYOUT JSON ***
      ${JSON.stringify(existingLayout)}

      *** REFINEMENT INSTRUCTIONS (User Feedback) ***
      ${topicContext || "Improve the animations and make them smoother."}

      *** TRANSCRIPT CONTEXT ***
      ${srtText}

      TASK:
      1. Analyze the Current HTML and Layout.
      2. Apply the Refinement Instructions.
      3. Return the FULLY UPDATED HTML and Layout JSON. Do not return diffs, return the complete working code.
      `;
  }

  // Define the schema for structured output
  const layoutStepSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      startTime: { type: Type.NUMBER, description: "Start time in seconds" },
      endTime: { type: Type.NUMBER, description: "End time in seconds" },
      layoutMode: { type: Type.STRING, enum: ['split', 'full-video', 'full-html', 'pip-html'] },
      splitRatio: { type: Type.NUMBER, description: "Height ratio of the HTML layer (0.0 - 1.0). e.g. 0.6 means HTML takes top 60%." },
      captionPosition: { type: Type.STRING, enum: ['top', 'bottom', 'center', 'hidden'] },
      note: { type: Type.STRING, description: "Short description of this scene" }
    },
    required: ["startTime", "endTime", "layoutMode", "splitRatio", "captionPosition"]
  };

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      html: { type: Type.STRING, description: "The full HTML string for the animation iframe." },
      layoutConfig: { 
        type: Type.ARRAY, 
        items: layoutStepSchema,
        description: "Timeline of layout changes."
      },
      reasoning: { type: Type.STRING, description: "Brief explanation of the design choices." }
    },
    required: ["html", "layoutConfig"]
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName, 
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result as GeneratedContent;
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    // Enhance error message for the UI
    let message = "Failed to generate content.";
    if (error.message?.includes("404")) {
      message = "Model not found. Please check API availability.";
    } else if (error.message?.includes("400")) {
      message = "Bad Request. The prompt might be too long.";
    } else if (error.message?.includes("429")) {
      message = "Too many requests. Please wait a moment.";
    } else if (error.message?.includes("API key")) {
      message = "Invalid API Key.";
    }
    throw new Error(message);
  }
};
