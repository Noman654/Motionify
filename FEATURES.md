# Motionify — Complete Feature Reference

> This document is a searchable, deep-dive reference of every feature, capability, integration, and technical detail in Motionify.
> Use it to quickly find what exists, what's missing, and what can be improved.

---

## Table of Contents

- [Core Engine](#core-engine)
- [AI Integration](#ai-integration)
- [Hook Lab (Viral Hooks)](#hook-lab-viral-hooks)
- [Caption System](#caption-system)
- [B-Roll System](#b-roll-system)
- [Export Pipeline](#export-pipeline)
- [Editor Panel](#editor-panel)
- [Template System](#template-system)
- [Audio System](#audio-system)
- [Project Management](#project-management)
- [UI/UX](#uiux)
- [Roadmap](#roadmap)
- [File Map](#file-map)
- [Tech Stack (Built With)](#tech-stack-built-with)
- [API Reference](#api-reference)

---

## Core Engine

### Video Player (`ReelPlayer.tsx`)
- **9:16 aspect ratio** enforced for Reels/TikTok/Shorts format.
- **Split-screen rendering**: HTML animation overlay on top, video on bottom.
- **Dynamic layout modes**: `full-video`, `full-html`, `split` with configurable ratio.
- **Layout transitions**: Smooth CSS transitions (0.5s cubic-bezier) between modes.
- **Word-by-word captions**: 5-word chunking with page transitions.
- **B-Roll overlay**: Fullscreen media overlay with credit badges.
- **Hook Overlay**: Intelligent overlay for viral hooks with dynamic backgrounds.
- **iframe HTML rendering**: Sandboxed HTML/GSAP animations synced to video time.
- **Background music**: `<audio>` element synced to video with drift correction.
- **PostMessage API**: Sends `timeupdate`, `play`, `pause` to iframe for sync.
- **Time sync loop**: `requestAnimationFrame` for high-frequency sync (60fps).

### Layout Config (`LayoutConfigStep` in `types.ts`)
```typescript
{
  layoutMode: 'split' | 'full-video' | 'full-html' | 'pip-html';
  splitRatio: number;    // 0-1, percentage of HTML area
  captionPosition: 'top' | 'center' | 'bottom' | 'hidden';
  startTime: number;     // seconds
  endTime: number;       // seconds
}
```
- Multiple layout steps per video (AI-generated JSON array).
- Enables cinematic transitions during playback.

---

## AI Integration

### Gemini Service (`geminiService.ts`)
- **Models supported**: `gemini-2.0-flash` (default), `gemini-1.5-pro`, `gemini-1.5-flash`, etc.
- **Multimodal capabilities**:
  - `generateSRT()` — Extracts audio from video → Transcribes via Gemini with extreme timing precision.
  - `generateReelContent()` — Transcript + Topic → HTML5/GSAP + Layout JSON.
  - `generateTTS()` — Text → Spoken audio (male/female) via Gemini TTS.
- **Structured output**: Uses `responseMimeType: 'application/json'` with strict JSON schema enforcement.
- **Refinement mode**: Passes existing HTML + layout for iterative, conversation-driven edits.

### B-Roll AI (`brollService.ts`)
- **Intelligence**: Analyzes transcript → suggests 4-8 keyword suggestions.
- **Matching**: Finds visually concrete imagery with specific start/end times.
- **Logic**: Prevents overlapping clips and ensures high-relevance stock matching.

---

## Hook Lab (Viral Hooks)

The **Hook Lab** is a specialized system designed to capture attention in the first 3-5 seconds of a reel.

### Hook Generation (`hookService.ts`)
- **4 Viral Styles**:
  1. **Numbered List** (📋) — "3 ways to...", "The #1 thing..."
  2. **Curiosity Gap** (🤔) — Open questions that stop the scroll.
  3. **Bold Claim** (💥) — Contrarian takes with high energy.
  4. **Pain Point** (🎯) — Relatable problems that build empathy.
- **Intelligent Visuals**: Gemini suggests a "Visual Keyword" which is automatically used to fetch a matching cinematic background from Pexels.

### Hook Visuals (`HookOverlay.tsx`)
- **Dynamic Backgrounds**: Story-matched Pexels video background for every hook.
- **Particle System**: Style-specific animated particles (shimmering circles, diamonds, etc.).
- **Animations**:
  - `hookSlamIn`: High-impact scale animation for claims.
  - `hookNumberGlow`: Pulsating glow for numbered lists.
  - `hookBreathe`: Subtle shadow breathing for questions.
- **Deterministic Sync**: Particles and animations are synced to the video timeline.

### Interface (`HookLabPanel.tsx`)
- **Real-time Preview**: Small-scale live preview of the hook before applying.
- **Editable Text**: One-click text editing with instant UI updates.
- **Duration Control**: Choose between 3s, 5s, or 8s durations.

---

## Caption System

### 10 Caption Styles (`captionStyles.ts`)

| ID | Name | Category | Effect |
|----|------|----------|--------|
| `karaoke` | Karaoke | Classic | Yellow text + glow shadow on active word |
| `pop-in` | Pop-In | Animated | Words scale up as they appear |
| `boxed` | Boxed | Classic | Yellow background box, black text |
| `typewriter`| Typewriter | Classic | Letter-by-letter reveal with cursor |
| `bounce` | Bounce | Animated | translateY spring physics per word |
| `glow` | Glow Pulse | Animated | Neon green pulsating glow |
| `emoji` | Emoji React | Animated | Random emoji pops beside each word |
| `gradient` | Split Color | Cinematic | CSS gradient text (red→orange) |
| `underline` | Underline | Cinematic | Purple border-bottom sweep |
| `netflix` | Netflix | Cinematic | Bold, large, clean page-by-page fade |

### Architecture
- **Dual-Mode Rendering**: CSS-based for live preview, Canvas 2D-based for FFmpeg export.
- **Chunking**: Auto-splits long sentences into 5-word groups for legibility.
- **Positioning**: Supports `top`, `center`, `bottom` presets.

---

## B-Roll System

### B-Roll Panel (`BRollPanel.tsx`)
- **AI Recommendations**: Gemini analyzes your script and recommends specific clips.
- **Pexels Integration**: Search millions of free videos/photos directly in the app.
- **One-Click Insert**: Clips are added to the timeline with automatically suggest ranges.
- **Hover Preview**: Thumbnail hover triggers a live video preview.
- **Credit Attribution**: Automatic photographer credit badge added to the overlay.

---

## Export Pipeline

### Native FFmpeg Export (`ExportModal.tsx`)
- **Resolution**: 1080×1920 (9:16 portrait).
- **FPS**: 30 (constant frame rate).
- **The Pipeline**:
  1. **Overlay Capture**: Electron captures the HTML/GSAP animation frame-by-frame.
  2. **Canvas Compositing**: Video frame + HTML frame + Captions are merged on a 1080x1920 canvas.
  3. **FFmpeg Pass 1**: Piped raw JPEG buffers to FFmpeg for video-only encoding.
  4. **FFmpeg Pass 2**: Merges video with original audio + background music with volume mixing.
- **Progress UI**: Real-time percentage and frame-count display.

---

## Editor Panel

- **Design Tab**: AI prompt editor, layout controls, and component generators.
- **Code Tab**: Full-featured **Visual Code Editor** (Prism.js) for manual HTML/GSAP tweaks.
- **Media Tab**: Asset manager (upload images/videos), Subtitle editor, and B-Roll search.
- **Hook Lab**: Dedicated panel for viral hook generation.
- **Settings**: API key management, model selection, and env configuration.

---

## Template System

- **Template Gallery**: Pre-built high-quality GSAP animation templates.
- **Categories**: Tech, Business, Creative, Education, Lifestyle, Growth.
- **Composition**: Each template includes responsive HTML, CSS, and synced JS.

---

## Audio System

- **Background Music**: Upload MP3/WAV, control volume, and auto-sync to length.
- **Audio Extraction**: Intelligent wav extraction for better transcription accuracy.
- **Voice Synthesis**: Gemini-powered TTS for creating voiceovers from text.

---

## Project Management

- **IndexedDB Persistence**: Projects are saved locally in the browser/Electron storage.
- **Video Storage**: Large video blobs are stored separately to prevent performance lag.
- **Project Library**: Grid view with project metadata, tags, and deletion.

---

## UI/UX

- **OLED Dark Design**: Glassmorphism, backdrop blurs, and subtle neon highlights.
- **Responsive Layout**: Optimized for desktop creator workflows (1024px+).
- **Micro-animations**: Hover effects, shimmer loaders, and smooth transitions throughout.

---

## Roadmap

### 🔴 High Priority
- [ ] **B-Roll in Export**: Transition B-Roll overlays from preview-only to full FFmpeg compositing.
- [ ] **Caption Preview Thumbs**: Visual thumbnails in the style picker.
- [ ] **Undo/Redo**: Command history for the HTML/Layout editor.

### 🟡 Medium Priority
- [ ] **Face Tracking Auto-Zoom**: AI-driven Ken Burns effect for talking heads.
- [ ] **Multi-Aspect Support**: Support for 1:1 (Square) and 16:9 (Landscape).
- [ ] **Batch Export**: Sequence multiple reels for automated rendering.

---

## File Map

| Component | Responsibility |
|-----------|----------------|
| `App.tsx` | Root state, Layout orchestration |
| `ReelPlayer.tsx` | Timeline sync, Preview rendering |
| `EditorPanel.tsx` | Tabbed control interface |
| `HookLabPanel.tsx` | AI Hook management |
| `ExportModal.tsx` | FFmpeg pipeline UI |
| `geminiService.ts` | AI Logic (Generation, Transcription, TTS) |
| `hookService.ts`| Viral Strategy Logic |
| `pexelsService.ts`| Stock Media Integration |
| `captionStyles.ts`| Subtitle design & rendering |
| `electron/main.cjs`| Native FFmpeg system & Win/Mac handlers |

---

## Tech Stack (Built With)

Motionify is built using a modern, performant stack optimized for desktop video creation and AI integration.

### Core Languages & Frameworks
| Layer | Technology | Description |
|-------|------------|-------------|
| **Languages** | TypeScript, HTML5, CSS3 | Type-safe logic and semantic structure. |
| **Frontend** | React 19 | Component-based UI with Hooks and Context API. |
| **Desktop** | Electron 40 | Native platform integration for Windows and macOS. |
| **Build Tool** | Vite 6 | Lightning-fast development and optimized bundles. |

### Video & Audio Engine
| Layer | Technology | Description |
|-------|------------|-------------|
| **Processing** | FFmpeg | The industry standard for video encoding, merging, and filtering. |
| **Libraries** | `fluent-ffmpeg`, `ffmpeg-static` | Node.js wrapper and static binaries for the FFmpeg pipeline. |
| **Animation** | GSAP 3 | GreenSock Animation Platform for high-performance timeline-based overlays. |
| **Web API** | Web Audio / Canvas 2D | In-browser audio extraction and frame-by-frame overlay compositing. |

### Artificial Intelligence & APIs
| Layer | Technology | Description |
|-------|------------|-------------|
| **LLM Model** | Google Gemini 2.0/2.5 Flash | Powers transcript analysis, scene generation, and B-Roll suggestions. |
| **AI SDK** | `@google/genai` | Official Google generative AI client for multimodal inputs. |
| **Media API** | Pexels API | Used for searching and fetching millions of free stock videos and photos. |
| **Voice** | Gemini TTS | Generates high-quality spoken audio from text inputs. |

### Storage & State Management
| Layer | Technology | Description |
|-------|------------|-------------|
| **Database** | IndexedDB | Local browser storage for projects and large binary video assets. |
| **Storage Logic** | Custom IndexedDB Wrappers | Efficient handling of project metadata and large file blobs. |
| **Persistence** | `localStorage` | Used for persisting user preferences like API keys and model choices. |

### Styling & UI
| Layer | Technology | Description |
|-------|------------|-------------|
| **CSS Utility** | Tailwind CSS v4 | High-performance styling for glassmorphism and responsive layouts. |
| **Components** | Lucide React | Clean, scalable SVG icon set for the entire interface. |
| **Code Editor** | `react-simple-code-editor` + `Prism.js` | Syntax-highlighted editor for manual GSAP/HTML tweaks. |

---

## API Reference

### Environment Variables
| Key | Description |
|-----|-------------|
| `VITE_PEXELS_API_KEY` | Required for stock video/photo search. |

### localStorage Keys
| Key | Purpose |
|-----|---------|
| `gemini_api_key` | Persists user's Google AI key. |
| `gemini_model_pref` | "gemini-2.0-flash" |
| `pexels_api_key` | Persists Pexels API key. |
