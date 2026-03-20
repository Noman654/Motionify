
export const EXAMPLE_TOPIC = "Bloom Filters and Security Architecture (Demo)";

export const EXAMPLE_SRT = `1
00:00:00,000 --> 00:00:00,880
Here's a challenge.

2
00:00:01,120 --> 00:00:02,520
You have to process billions

3
00:00:02,520 --> 00:00:04,000
of events a day with a huge

4
00:00:04,000 --> 00:00:05,200
threat database that cannot

5
00:00:05,200 --> 00:00:06,260
be loaded into your RAM.`;

// --- SIMPLE DEFAULTS FOR MANUAL MODE / FALLBACK ---

export const EXAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Simple Template</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<style>
    body { margin: 0; background: #000; color: white; font-family: sans-serif; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }
    .container { text-align: center; opacity: 0; transform: scale(0.8); }
    h1 { font-size: 8vmin; color: #00f3ff; text-transform: uppercase; margin: 0; }
    p { font-size: 4vmin; color: #888; margin-top: 2vmin; }
</style>
</head>
<body>
    <div class="container">
        <h1>Manual Mode</h1>
        <p>Start Editing...</p>
    </div>
    <script>
        const tl = gsap.timeline({ paused: true });
        
        // Simple Animation
        tl.to(".container", { opacity: 1, scale: 1, duration: 1, ease: "back.out" });
        tl.to("h1", { color: "#ff0055", duration: 0.5 }, 2);

        // Sync Logic
        window.addEventListener('message', (e) => {
            const { type, time } = e.data;
            if (type === 'timeupdate') tl.seek(time);
            if (type === 'play') tl.play();
            if (type === 'pause') tl.pause();
        });
    </script>
</body>
</html>`;

export const EXAMPLE_JSON = `[
  {
    "startTime": 0,
    "endTime": 100,
    "layoutMode": "split",
    "splitRatio": 0.5,
    "captionPosition": "top",
    "note": "Default Simple Layout"
  }
]`;


// --- STYLE-NEUTRAL REFERENCE FOR PROMPT ENGINEERING ---
// This reference teaches the AI the CODE STRUCTURE (scenes, GSAP timeline, postMessage sync)
// WITHOUT imposing any specific visual style. The system instruction's designInstructions
// is the sole source of truth for colors, fonts, and effects.

const REFERENCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Animation</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/TextPlugin.min.js"></script>
<!-- Load Google Fonts as needed for your DESIGN STYLE -->
<style>
    /* === USE CSS VARIABLES — values come from your Design System === */
    :root { /* Colors, fonts defined by your chosen Design Style */ }
    body, html { margin: 0; width: 100%; height: 100%; overflow: hidden; }
    #stage { position: relative; width: 100%; height: 100%; perspective: 1000px; display: flex; justify-content: center; align-items: center; }
    .scene { position: absolute; opacity: 0; display: flex; flex-direction: column; align-items: center; }
</style>
</head>
<body>
<div id="stage">
    <!-- Scene 1: Title/Intro -->
    <div class="scene" id="s1">
        <h1>TOPIC TITLE</h1>
    </div>
    <!-- Scene 2: Visual Content -->
    <div class="scene" id="s2">
        <div id="visual-content"></div>
    </div>
    <!-- Scene 3+: More content as needed -->
    <div class="scene" id="s3">
        <div id="detail-content"></div>
    </div>
</div>
<script>
    gsap.registerPlugin(TextPlugin);
    const tl = gsap.timeline({ paused: true });

    /* Scene transitions — map to SRT timestamps */
    tl.to("#s1", { opacity: 1, duration: 0.8 }, 0);
    tl.to("#s1", { opacity: 0, duration: 0.4 }, 3);
    tl.to("#s2", { opacity: 1, duration: 0.6 }, 3.5);
    tl.to("#s2", { opacity: 0, duration: 0.4 }, 8);
    tl.to("#s3", { opacity: 1, duration: 0.6 }, 8.5);

    /* MANDATORY: Sync with host app */
    window.addEventListener('message', (e) => {
        const { type, time } = e.data;
        if (type === 'timeupdate') tl.seek(time);
        if (type === 'play') tl.play();
        if (type === 'pause') tl.pause();
    });
</script>
</body>
</html>`;

const REFERENCE_JSON = `[
{
"startTime": 0,
"endTime": 10,
"layoutMode": "split",
"splitRatio": 0.55,
"captionPosition": "top",
"note": "Intro Title"
},
{
"startTime": 10,
"endTime": 20,
"layoutMode": "split",
"splitRatio": 0.6,
"captionPosition": "bottom",
"note": "Visual Content"
}
]`;

export const constructPrompt = (topic: string, srt: string) => {
    return `
I am creating an Instagram Reel that combines a speaker video with dynamic HTML overlays.
I need you to act as a Creative Director and Frontend Developer.

### REFERENCE EXAMPLE — CODE STRUCTURE ONLY
> **IMPORTANT:** The reference below shows the CODE STRUCTURE and GSAP patterns to follow.
> DO NOT copy its visual style. Your visual style MUST come from the DESIGN SYSTEM in the system instructions.

**Context:** ${EXAMPLE_TOPIC}

**Reference Transcript (SRT):**
${EXAMPLE_SRT}

**Reference Code Structure (HTML/GSAP):**
${REFERENCE_HTML}

**Reference Layout Config (JSON):**
${REFERENCE_JSON}

---

### NOW GENERATE FOR THE FOLLOWING TASK:

**My Video Topic:**
${topic || "General Content"}

**My Transcript (SRT):**
${srt}

---

REQUEST:
Generate two pieces of code. Follow the reference for CODE STRUCTURE, but apply the DESIGN SYSTEM from the system prompt for ALL visual styling:

### 1. HTML/CSS/JS Animation
Create a stunning, self-contained HTML file.
- **Libraries:** You MUST use GSAP (GreenSock) for animations.
- **Syncing:** The app sends 'timeupdate', 'play', 'pause' events via window.postMessage. The JS must listen to these.
- **Design:** You MUST follow the DESIGN SYSTEM instructions from the system prompt. Apply its exact color palette, typography, card styles, and animation techniques. 9:16 Portrait aspect ratio.
- **Scenes:** Create multiple scenes (#s1, #s2, #s3, etc.) with rich visual elements specific to your DESIGN STYLE.
- **Code Structure:** NO unescaped newlines in strings. Use template literals.

### 2. Layout Configuration (JSON)
Structure:
[
  {
    "startTime": 0.0,
    "endTime": 10.0,
    "layoutMode": "split",
    "splitRatio": 0.55, 
    "captionPosition": "center"
  }
]
`;
}

export const constructPromptWithAssets = (topic: string, srt: string, assets: import('../types').MediaAsset[]): string => {
    let assetContext = "";
    if (assets.length > 0) {
        assetContext = `
AVAILABLE ASSETS (Use these filenames in your HTML/CSS):
${assets.map(a => `- ${a.name} (${a.type})`).join('\n')}

IMPORTANT: 
- To use an image: <img src="filename.png" class="..." />
- To use a video: <video src="filename.mp4" autoplay muted loop class="..." />
- You can animate these assets (opacity, transform) using CSS keyframes.
- If the user asks for a specific asset, use the exact filename provided above.
`;
    }

    return `
I am creating an Instagram Reel that combines a speaker video with dynamic HTML overlays.
I need you to act as a Creative Director and Frontend Developer.

### REFERENCE EXAMPLE — CODE STRUCTURE ONLY
> **IMPORTANT:** The reference below shows the CODE STRUCTURE and GSAP patterns to follow.
> DO NOT copy its visual style. Your visual style MUST come from the DESIGN SYSTEM in the system instructions.

**Context:** ${EXAMPLE_TOPIC}

**Reference Transcript (SRT):**
${EXAMPLE_SRT}

**Reference Code Structure (HTML/GSAP):**
${REFERENCE_HTML}

**Reference Layout Config (JSON):**
${REFERENCE_JSON}

---

### NOW GENERATE FOR THE FOLLOWING TASK:

**My Video Topic:**
${topic || "General Content"}

${assetContext}

**My Transcript (SRT):**
${srt}

---

REQUEST:
Generate two pieces of code. Follow the reference for CODE STRUCTURE, but apply the DESIGN SYSTEM from the system prompt for ALL visual styling:

### 1. HTML/CSS/JS Animation
Create a stunning, self-contained HTML file.
- **Libraries:** You MUST use GSAP (GreenSock) for animations.
- **Syncing:** The app sends 'timeupdate', 'play', 'pause' events via window.postMessage. The JS must listen to these.
- **Design:** You MUST follow the DESIGN SYSTEM instructions from the system prompt. Apply its exact color palette, typography, card styles, and animation techniques. 9:16 Portrait aspect ratio.
- **Scenes:** Create multiple scenes (#s1, #s2, #s3, etc.) with rich visual elements specific to your DESIGN STYLE.
- **Code Structure:** NO unescaped newlines in strings. Use template literals.
- **Layering:** Ensure z-index is handled correctly. Video overlays should be behind text but above the background.

### 2. Layout Configuration (JSON)
Structure:
[
  {
    "startTime": 0.0,
    "endTime": 10.0,
    "layoutMode": "split",
    "splitRatio": 0.55, 
    "captionPosition": "center"
  }
]
`;
};
