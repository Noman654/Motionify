


import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { ReelPlayer } from './components/ReelPlayer';
import { EditorPanel } from './components/EditorPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ProjectLibrary } from './components/ProjectLibrary';
import { VisualTimeline } from './components/VisualTimeline';
import { TemplateGallery } from './components/TemplateGallery';
import { parseSRT } from './utils/srtParser';
import { AppState, GeneratedContent, SRTItem, MediaAsset } from './types';
import { Edit3, AlertCircle, LayoutTemplate, CheckCircle2, Globe, Github, Linkedin, Instagram, Facebook, BookOpen, X, Sparkles, Smartphone, Monitor, ArrowLeft, Key, Folder, Save } from 'lucide-react';
import { generateReelContent } from './services/geminiService';
import { APP_CONFIG } from './config';
import { constructPrompt, EXAMPLE_SRT, EXAMPLE_TOPIC, EXAMPLE_HTML, EXAMPLE_JSON } from './utils/promptTemplates';
import { saveProjectWithVideo, loadProjectWithVideo, SavedProject } from './utils/projectStorageWithVideo';
import { AnimationTemplate } from './utils/templates';
import { DEFAULT_STYLE_ID } from './utils/captionStyles';
import { BRollClip } from './services/brollService';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(() => {
        // Check for manual mode opt-out first
        const manualModePref = localStorage.getItem('manual_mode_opt_out');
        if (manualModePref === 'true') {
            return AppState.UPLOAD;
        }

        // Check local storage on initial load
        const stored = localStorage.getItem('gemini_api_key');
        // If key exists, go to UPLOAD, else WELCOME
        return stored ? AppState.UPLOAD : AppState.WELCOME;
    });

    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [isAudioOnly, setIsAudioOnly] = useState(false); // Track if using dummy video/audio only
    const [srtData, setSrtData] = useState<SRTItem[]>([]);
    const [srtTextRaw, setSrtTextRaw] = useState<string>('');
    const [topicContext, setTopicContext] = useState('');
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSnackbar, setShowSnackbar] = useState(false);

    // Manual Mode & Latency Handling
    const [showManualButton, setShowManualButton] = useState(false);
    const [showReplaceDialog, setShowReplaceDialog] = useState(false);
    const [pendingContent, setPendingContent] = useState<GeneratedContent | null>(null);
    const isManualModeRef = useRef(false);
    const manualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Settings State
    const [apiKey, setApiKey] = useState(() => {
        return localStorage.getItem('gemini_api_key') || "";
    });
    const [modelName, setModelName] = useState(() => {
        return localStorage.getItem('gemini_model_pref') || APP_CONFIG.DEFAULT_MODEL;
    });

    // Timeline state — lifted from ReelPlayer so EditorPanel's VisualTimeline can read/control it
    const [videoDuration, setVideoDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [externalSeekTime, setExternalSeekTime] = useState<number | null>(null);

    // Audio State
    const [bgMusicFile, setBgMusicFile] = useState<File | null>(null);
    const [bgMusicUrl, setBgMusicUrl] = useState<string | undefined>(undefined);
    const [bgMusicVolume, setBgMusicVolume] = useState(0.2);

    // Asset State
    const [assets, setAssets] = useState<MediaAsset[]>([]);

    // Subtitle Editing State
    const [editingSubtitle, setEditingSubtitle] = useState<SRTItem | null>(null);
    const [editSubtitleText, setEditSubtitleText] = useState('');

    // Save Project Dialog State
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveProjectName, setSaveProjectName] = useState('');
    const [captionStyleId, setCaptionStyleId] = useState(DEFAULT_STYLE_ID);
    const [brollClips, setBRollClips] = useState<BRollClip[]>([]);

    const handleSubtitleClick = (item: SRTItem) => {
        setEditingSubtitle(item);
        setEditSubtitleText(item.text);
    };

    const handleSaveSubtitle = () => {
        if (!editingSubtitle) return;
        setSrtData(prev => prev.map(item =>
            item.id === editingSubtitle.id ? { ...item, text: editSubtitleText } : item
        ));
        setEditingSubtitle(null);
        setEditSubtitleText('');
    };

    const handleOpenSaveDialog = () => {
        setSaveProjectName(`Project ${new Date().toLocaleDateString()}`);
        setShowSaveDialog(true);
    };

    const handleConfirmSave = async () => {
        if (!saveProjectName.trim() || !generatedContent) return;
        try {
            await saveProjectWithVideo({
                name: saveProjectName,
                html: generatedContent.html,
                layoutConfig: generatedContent.layoutConfig,
                srtText: srtTextRaw,
                topicContext: topicContext,
                bgMusicVolume: bgMusicVolume,
                bgMusicName: bgMusicFile?.name,
                videoFileName: videoFile?.name
            }, videoFile);
            setShowSaveDialog(false);
        } catch (e: any) {
            console.error(e);
            setShowSaveDialog(false);
        }
    };

    const handleAssetUpload = (files: File[]) => {
        const newAssets = files.map(file => ({
            id: crypto.randomUUID(),
            file,
            name: file.name,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            url: URL.createObjectURL(file)
        } as MediaAsset));

        setAssets(prev => [...prev, ...newAssets]);
    };

    const handleRemoveAsset = (id: string) => {
        setAssets(prev => {
            const target = prev.find(a => a.id === id);
            if (target) URL.revokeObjectURL(target.url);
            return prev.filter(a => a.id !== id);
        });
    };

    // Project Library State
    const [showLibrary, setShowLibrary] = useState(false);

    // Manage Video Object URL
    const [previewOverride, setPreviewOverride] = useState<string | null>(null);

    useEffect(() => {
        if (!videoFile) return;
        const newUrl = URL.createObjectURL(videoFile);
        setVideoUrl(newUrl);
        return () => URL.revokeObjectURL(newUrl);
    }, [videoFile]);

    // Manage Audio Object URL
    useEffect(() => {
        if (!bgMusicFile) {
            setBgMusicUrl(undefined);
            return;
        }
        const newUrl = URL.createObjectURL(bgMusicFile);
        setBgMusicUrl(newUrl);
        return () => URL.revokeObjectURL(newUrl);
    }, [bgMusicFile]);

    const saveApiKeyToStorage = () => {
        if (apiKey) {
            localStorage.setItem('gemini_api_key', apiKey);
        } else {
            localStorage.removeItem('gemini_api_key');
        }

        // Save model pref
        if (modelName) {
            localStorage.setItem('gemini_model_pref', modelName);
        }
    };

    const handleWelcomeComplete = (key: string | null, model?: string, saveManualMode?: boolean) => {
        if (key) {
            setApiKey(key);
            localStorage.setItem('gemini_api_key', key);

            // Save Model
            if (model) {
                setModelName(model);
                localStorage.setItem('gemini_model_pref', model);
            }
        } else {
            // User skipped
            setApiKey("");
            localStorage.removeItem('gemini_api_key');

            if (saveManualMode) {
                localStorage.setItem('manual_mode_opt_out', 'true');
            }
        }
        setAppState(AppState.UPLOAD);
    };

    const handleResetAuth = () => {
        // Return to welcome screen.
        // NOTE: We do NOT clear the API Key from localStorage or state here.
        // This allows the Welcome Screen to pre-populate the existing key for editing.
        setAppState(AppState.WELCOME);

        // Reset file states
        setGeneratedContent(null);
        setVideoFile(null);
        setSrtData([]);
    };

    const handleFilesSelected = async (video: File, srt: File, isAudioMode: boolean) => {
        try {
            setVideoFile(video);
            setIsAudioOnly(isAudioMode);
            const srtText = await srt.text();
            setSrtTextRaw(srtText);
            const parsedSrt = parseSRT(srtText);
            setSrtData(parsedSrt);
            setAppState(AppState.GENERATING);
        } catch (e) {
            setError("Failed to parse files.");
        }
    };

    const handleGenerate = async () => {
        if (!videoFile || srtData.length === 0) return;
        if (!apiKey.trim()) {
            setError("API Key is missing. Auto-generate is disabled. Please add a key in settings or use Manual Mode.");
            return;
        }

        saveApiKeyToStorage();

        setIsGenerating(true);
        setError(null);
        try {
            // Check if we are REFINING existing content
            const existingHtml = generatedContent?.html;
            const existingLayout = generatedContent?.layoutConfig;

            const content = await generateReelContent(
                srtTextRaw,
                topicContext,
                apiKey,
                modelName,
                existingHtml,
                existingLayout,
                isAudioOnly
            );
            setGeneratedContent(content);
            // Clear refinement text after success? Optional. Keeping it allows user to iterate.
        } catch (err: any) {
            setError(err.message || "Failed to generate content.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEnterStudio = async () => {
        let currentSrtRaw = srtTextRaw;
        let currentTopic = topicContext;

        if (srtData.length === 0) {
            currentSrtRaw = EXAMPLE_SRT;
            currentTopic = EXAMPLE_TOPIC;
            setSrtTextRaw(currentSrtRaw);
            setSrtData(parseSRT(currentSrtRaw));
            setTopicContext(currentTopic);
        }

        const prompt = constructPrompt(currentTopic, currentSrtRaw);


        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(prompt);
                setShowSnackbar(true);
                setTimeout(() => setShowSnackbar(false), 3000);
            } else {
                console.warn("Clipboard API not available - skipping copy.");
            }
        } catch (err) {
            console.warn("Failed to copy to clipboard:", err);
        }

        // If NO API KEY -> Force Manual Mode
        if (!apiKey.trim()) {
            handleManualModeEnter();
            return;
        }

        // Setup Generation State
        setIsGenerating(true);
        setError(null);
        setShowManualButton(false);
        isManualModeRef.current = false;

        // Start 10s Timer for Manual Mode Option
        if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
        manualTimerRef.current = setTimeout(() => {
            setShowManualButton(true);
        }, 10000); // 10 seconds

        try {
            // Initial Generation - No existing content yet
            const content = await generateReelContent(currentSrtRaw, currentTopic, apiKey, modelName, undefined, undefined, isAudioOnly);

            if (isManualModeRef.current) {
                // User already entered manual mode, ask to replace
                setPendingContent(content);
                setShowReplaceDialog(true);
            } else {
                // Normal flow
                setGeneratedContent(content);
                setAppState(AppState.EDITOR);
            }
        } catch (err: any) {
            console.warn("API Generation failed.", err);

            // If user is already in manual mode, ignore errors (they are editing demo content)
            if (!isManualModeRef.current) {
                // FALLBACK TO PREDEFINED SAMPLE
                // However, if it's a specific API error (like 429), we want to show it.
                if (err.message && (err.message.includes("429") || err.message.includes("API Key") || err.message.includes("Quota"))) {
                    setError(err.message);
                } else {
                    // Only fallback on generic/unknown errors, or if user prefers fallback flow
                    try {
                        const fallbackContent: GeneratedContent = {
                            html: EXAMPLE_HTML,
                            layoutConfig: JSON.parse(EXAMPLE_JSON),
                            reasoning: "Fallback to Demo Content (API Error or Quota Exceeded)"
                        };
                        setGeneratedContent(fallbackContent);
                        setAppState(AppState.EDITOR);
                    } catch (fallbackErr) {
                        console.error("Fallback failed", fallbackErr);
                        setError(err.message || "Failed to generate initial content.");
                    }
                }
            }
        } finally {
            if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
            setIsGenerating(false);
        }
    };

    const handleManualModeEnter = () => {
        isManualModeRef.current = true;
        // Load demo content immediately so the editor isn't empty
        setGeneratedContent({
            html: EXAMPLE_HTML,
            layoutConfig: JSON.parse(EXAMPLE_JSON),
            reasoning: "Manual Mode Entry"
        });
        setAppState(AppState.EDITOR);
    };

    const handleTemplateSelect = (template: AnimationTemplate) => {
        setGeneratedContent({
            html: template.html,
            layoutConfig: template.layoutConfig,
            reasoning: `Template: ${template.name}`
        });
        setAppState(AppState.EDITOR);
    };

    const handleConfirmReplace = () => {
        if (pendingContent) {
            setGeneratedContent(pendingContent);
        }
        setShowReplaceDialog(false);
        setPendingContent(null);
    };

    const handleCancelReplace = () => {
        setShowReplaceDialog(false);
        setPendingContent(null);
    };

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    return (
        <>
            {/* Mobile/Tablet Blocking Overlay */}
            <div className="fixed inset-0 z-[9999] bg-[var(--color-bg-deep)] flex flex-col items-center justify-center p-8 text-center md:hidden">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center mb-6 shadow-xl shadow-purple-900/40 animate-glow">
                    <Sparkles size={28} className="text-white" />
                </div>
                <h2 className="text-xl font-display font-bold text-white mb-2">
                    Desktop Required
                </h2>
                <p className="text-gray-500 max-w-xs leading-relaxed text-sm">
                    Lumina Studio is designed for larger screens.
                    <br /><br />
                    Open on your <strong className="text-gray-300">laptop</strong> or <strong className="text-gray-300">desktop</strong>.
                </p>
                <div className="mt-6 flex items-center gap-2 text-[10px] text-gray-600 uppercase tracking-[0.15em]">
                    <Monitor size={12} />
                    <span>1024px minimum</span>
                </div>
            </div>

            {/* Main App Container - Only rendered on Desktop (md+) */}
            <div className="hidden md:contents">
                {appState === AppState.WELCOME ? (
                    <WelcomeScreen onComplete={handleWelcomeComplete} />
                ) : (
                    <div className="w-full h-screen flex flex-col bg-[var(--color-bg-deep)] text-white overflow-hidden relative">

                        {/* Header — Floating Island */}
                        {!isFullScreen && appState !== AppState.UPLOAD && (
                            <header className="relative mt-4 mb-3 mx-auto w-[92%] max-w-6xl h-14 shrink-0 rounded-2xl border border-white/[0.06] flex items-center justify-between px-5 bg-[var(--color-bg-surface-1)]/80 backdrop-blur-xl z-50 shadow-xl shadow-black/40 pointer-events-none">
                                <div className="pointer-events-auto flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/20 animate-glow">
                                        <Sparkles size={15} className="text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-display font-semibold text-sm tracking-tight text-white leading-none">
                                            Lumina Studio
                                        </span>
                                        <span className="text-[9px] text-gray-500 font-mono tracking-[0.15em] uppercase">
                                            Creative Suite
                                        </span>
                                    </div>
                                </div>

                                <div className="pointer-events-auto flex items-center gap-1.5">
                                    <div className="hidden lg:flex items-center gap-0.5 bg-white/[0.03] rounded-xl p-0.5 border border-white/[0.04] mr-2">
                                        <button
                                            onClick={handleResetAuth}
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all flex items-center gap-1.5"
                                            title="Settings"
                                        >
                                            <Key size={11} /> Settings
                                        </button>
                                        <div className="w-px h-3.5 bg-white/[0.06]"></div>
                                        <button
                                            onClick={() => setShowLibrary(true)}
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all flex items-center gap-1.5"
                                        >
                                            <Folder size={11} /> Library
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (generatedContent) {
                                                const confirmed = confirm('Start new project? Unsaved changes will be lost.');
                                                if (!confirmed) return;
                                            }
                                            setAppState(AppState.UPLOAD);
                                            setGeneratedContent(null);
                                            setBgMusicFile(null);
                                            setPendingContent(null);
                                            setShowReplaceDialog(false);
                                            setIsAudioOnly(false);
                                        }}
                                        className="glass-button w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white"
                                        title="New Project"
                                    >
                                        <LayoutTemplate size={14} />
                                    </button>

                                    {generatedContent && (
                                        <button
                                            onClick={handleOpenSaveDialog}
                                            className="flex items-center gap-2 px-4 py-1.5 rounded-xl btn-primary text-sm ml-1"
                                        >
                                            <Save size={13} />
                                            <span>Save</span>
                                        </button>
                                    )}
                                </div>
                            </header>
                        )}

                        {/* Main Content Area */}
                        <main className="flex-1 overflow-hidden relative flex flex-col">

                            {/* State: Upload */}
                            {appState === AppState.UPLOAD && (
                                <div className="flex flex-col h-full overflow-y-auto state-enter">
                                    <div className="flex-1">
                                        <FileUpload
                                            onFilesSelected={handleFilesSelected}
                                            apiKey={apiKey}
                                            onBack={handleResetAuth}
                                            onOpenProjects={() => setShowLibrary(true)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* State: Setup (Cinematic Studio) */}
                            {appState === AppState.GENERATING && (
                                <div className="flex flex-col h-full overflow-hidden relative state-enter">
                                    {/* Ambient Light */}
                                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/8 rounded-full blur-[120px] animate-breathe"></div>
                                        <div className="absolute top-[-10%] right-[10%] w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[100px]"></div>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative">
                                        <div className="glass-panel-elevated max-w-2xl w-full rounded-[2rem] shadow-2xl animate-scale-in relative overflow-hidden group flex flex-col" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                                            {/* Top edge gradient */}
                                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/20 to-transparent"></div>
                                            <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/15 blur-[80px] group-hover:bg-purple-500/20 transition-all duration-700"></div>

                                            {/* Scrollable content */}
                                            <div className="flex-1 overflow-y-auto p-10 pb-4">
                                                <div className="text-center space-y-4 mb-8 relative z-10">
                                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 mb-2 border border-white/5 shadow-xl animate-glow">
                                                        <Sparkles size={28} className="text-purple-400" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-4xl font-display font-bold tracking-tight text-white mb-2">
                                                            Scene Director
                                                        </h2>
                                                        <p className="text-gray-500 text-base font-light max-w-md mx-auto">
                                                            {isAudioOnly
                                                                ? "Craft the visual atmosphere for your audio track."
                                                                : "Describe the visual style for your scenes."}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-5 relative z-10">
                                                    <div className="space-y-2">
                                                        <label className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em] ml-1">
                                                            <Edit3 size={11} />
                                                            Visual Direction
                                                        </label>
                                                        <div className="relative">
                                                            <textarea
                                                                value={topicContext}
                                                                onChange={(e) => setTopicContext(e.target.value)}
                                                                placeholder={isAudioOnly ? "e.g. A lo-fi chill space background with floating stars..." : "e.g. High-energy tech demo with neon grids and fast transitions..."}
                                                                className="w-full h-28 input-base bg-black/30 rounded-xl p-4 text-sm text-gray-200 placeholder:text-gray-600 resize-none"
                                                            />
                                                            <div className="absolute bottom-3 right-3 text-[10px] text-gray-600 font-mono">
                                                                {topicContext.length}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Template Gallery — compact */}
                                                    {!isGenerating && (
                                                        <TemplateGallery onSelectTemplate={handleTemplateSelect} />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Pinned Generate button — always visible */}
                                            <div className="p-6 pt-3 border-t border-white/[0.04] bg-[var(--color-bg-surface-2)] relative z-10 shrink-0">
                                                <button
                                                    onClick={handleEnterStudio}
                                                    disabled={isGenerating}
                                                    className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all relative overflow-hidden ${isGenerating
                                                        ? 'bg-white/[0.04] text-gray-500 cursor-not-allowed border border-white/5'
                                                        : 'btn-primary'
                                                        }`}
                                                >
                                                    {isGenerating ? (
                                                        <>
                                                            <div className="w-5 h-5 border-2 border-purple-400/30 border-t-white rounded-full animate-spin"></div>
                                                            <span>Generating scene...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="relative z-10">{!apiKey ? "Enter Manual Mode" : "Generate Scene"}</span>
                                                            <Sparkles size={18} className="relative z-10" />
                                                        </>
                                                    )}
                                                </button>

                                                {isGenerating && showManualButton && (
                                                    <div className="animate-fade-in text-center mt-3">
                                                        <button
                                                            onClick={handleManualModeEnter}
                                                            className="text-xs text-gray-600 hover:text-gray-300 transition-colors"
                                                        >
                                                            Taking too long? <span className="underline decoration-gray-700 underline-offset-4 hover:decoration-gray-400">Skip to editor</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Error */}
                                            {error && (
                                                <div className="mt-6 p-4 bg-red-500/8 border border-red-500/15 rounded-xl flex items-start gap-3 animate-fade-in">
                                                    <div className="p-1.5 bg-red-500/10 rounded-lg">
                                                        <AlertCircle size={16} className="text-red-400" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-xs font-bold text-red-300">Generation Failed</h4>
                                                        <p className="text-xs text-red-400/60 mt-1 leading-relaxed">{error}</p>
                                                        <div className="flex gap-3 mt-2">
                                                            <button onClick={handleResetAuth} className="text-[11px] font-semibold text-red-300 hover:text-white transition-colors">Check API Key</button>
                                                            <button onClick={handleManualModeEnter} className="text-[11px] font-semibold text-gray-500 hover:text-white transition-colors">Manual Mode</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* State: Editor (Split View) */}
                            {appState === AppState.EDITOR && generatedContent && (
                                <div className="flex flex-col h-full state-enter">
                                    {/* Top: Player + Editor Row */}
                                    <div className="flex flex-1 min-h-0 overflow-hidden">
                                        {/* Left: Player */}
                                        <div className={`flex-1 flex flex-col items-center justify-center bg-black/20 relative transition-all duration-300 overflow-hidden ${isFullScreen ? 'w-full fixed inset-0 z-50 bg-black' : ''}`}>
                                            <ReelPlayer
                                                videoUrl={videoUrl}
                                                videoFile={videoFile}
                                                srtData={srtData}
                                                htmlContent={previewOverride || generatedContent.html}
                                                layoutConfig={generatedContent.layoutConfig}
                                                fullScreenMode={isFullScreen}
                                                toggleFullScreen={toggleFullScreen}
                                                bgMusicUrl={bgMusicUrl}
                                                bgMusicFile={bgMusicFile}
                                                bgMusicVolume={bgMusicVolume}
                                                assets={assets}
                                                onTimeUpdate={setCurrentTime}
                                                onDurationLoad={setVideoDuration}
                                                externalSeekTime={externalSeekTime}
                                                captionStyleId={captionStyleId}
                                                brollClips={brollClips}
                                            />
                                        </div>

                                        {/* Right: Editor Sidebar */}
                                        {!isFullScreen && (
                                            <div className="w-[420px] flex-shrink-0 border-l border-white/[0.06] bg-[var(--color-bg-surface-0)] z-10 shadow-2xl shadow-black/30 overflow-y-auto">
                                                <EditorPanel
                                                    content={generatedContent}
                                                    isGenerating={isGenerating}
                                                    onGenerate={handleGenerate}
                                                    onUpdate={setGeneratedContent}
                                                    videoFile={videoFile}
                                                    topicContext={topicContext}
                                                    onTopicContextChange={setTopicContext}
                                                    srtText={srtTextRaw}
                                                    bgMusicName={bgMusicFile?.name}
                                                    onBgMusicChange={setBgMusicFile}
                                                    bgMusicVolume={bgMusicVolume}
                                                    onBgVolumeChange={setBgMusicVolume}
                                                    apiKey={apiKey}
                                                    setApiKey={setApiKey}
                                                    modelName={modelName}
                                                    setModelName={setModelName}
                                                    onSaveApiKey={saveApiKeyToStorage}
                                                    onPreviewOverride={setPreviewOverride}
                                                    assets={assets}
                                                    onAssetUpload={handleAssetUpload}
                                                    onRemoveAsset={handleRemoveAsset}
                                                    srtData={srtData}
                                                    onSrtDataUpdate={setSrtData}
                                                    duration={videoDuration}
                                                    currentTime={currentTime}
                                                    onSeek={(t) => setExternalSeekTime(t)}
                                                    captionStyleId={captionStyleId}
                                                    onCaptionStyleChange={setCaptionStyleId}
                                                    brollClips={brollClips}
                                                    onBRollClipsChange={setBRollClips}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom: Timeline */}
                                    {!isFullScreen && (
                                        <div className="flex-shrink-0">
                                            <VisualTimeline
                                                duration={videoDuration}
                                                currentTime={currentTime}
                                                layoutConfig={generatedContent.layoutConfig}
                                                srtData={srtData}
                                                onSeek={(t) => setExternalSeekTime(t)}
                                                onSubtitleClick={handleSubtitleClick}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </main>

                        {/* Snackbar */}
                        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 glass-panel-elevated px-5 py-3 rounded-xl font-semibold text-sm z-[100] transition-all duration-300 flex items-center gap-2 border-l-2 border-emerald-500 ${showSnackbar ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                            <CheckCircle2 size={16} className="text-emerald-400" />
                            Prompt copied to clipboard
                        </div>

                        {/* Replace Scene Dialog (Delayed Response) */}
                        {showReplaceDialog && (
                            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                                <div className="glass-panel-elevated max-w-md w-full p-6 rounded-2xl animate-scale-in">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                                                <Sparkles size={18} />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-white">Scene Ready</h3>
                                                <p className="text-[11px] text-gray-500">AI generation complete</p>
                                            </div>
                                        </div>
                                        <button onClick={handleCancelReplace} className="text-gray-600 hover:text-white transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                                        Replace your current setup with the AI-generated scene?
                                    </p>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCancelReplace}
                                            className="flex-1 py-2.5 rounded-xl glass-button text-gray-300 font-medium text-sm"
                                        >
                                            Keep Current
                                        </button>
                                        <button
                                            onClick={handleConfirmReplace}
                                            className="flex-1 py-2.5 rounded-xl btn-primary text-sm"
                                        >
                                            Replace
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Subtitle Edit Dialog */}
                        {editingSubtitle && (
                            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                                <div className="glass-panel-elevated max-w-lg w-full p-6 rounded-2xl animate-scale-in">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            <Edit3 size={16} className="text-amber-400" />
                                            Edit Subtitle
                                        </h3>
                                        <button onClick={() => setEditingSubtitle(null)} className="text-gray-600 hover:text-white transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="mb-5">
                                        <div className="flex justify-between text-[10px] text-gray-500 font-mono mb-2">
                                            <span>{editingSubtitle.startTime.toFixed(2)}s</span>
                                            <span>{editingSubtitle.endTime.toFixed(2)}s</span>
                                        </div>
                                        <textarea
                                            value={editSubtitleText}
                                            onChange={(e) => setEditSubtitleText(e.target.value)}
                                            className="w-full h-28 input-base bg-black/30 rounded-xl p-4 text-base text-white resize-none"
                                            autoFocus
                                            placeholder="Enter subtitle text..."
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingSubtitle(null)}
                                            className="flex-1 py-2.5 rounded-xl glass-button text-gray-300 font-medium text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveSubtitle}
                                            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors shadow-lg shadow-amber-900/15"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Save Project Dialog */}
                        {showSaveDialog && (
                            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                                <div className="glass-panel-elevated max-w-md w-full p-6 rounded-2xl animate-scale-in">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            <Save size={16} className="text-purple-400" />
                                            Save Project
                                        </h3>
                                        <button onClick={() => setShowSaveDialog(false)} className="text-gray-600 hover:text-white transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="mb-5">
                                        <label className="text-[11px] text-gray-500 mb-1.5 block font-medium uppercase tracking-wider">Project Name</label>
                                        <input
                                            type="text"
                                            value={saveProjectName}
                                            onChange={(e) => setSaveProjectName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleConfirmSave();
                                                if (e.key === 'Escape') setShowSaveDialog(false);
                                            }}
                                            className="w-full input-base bg-black/30 rounded-xl px-4 py-3 text-white"
                                            autoFocus
                                            placeholder="Enter project name..."
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowSaveDialog(false)}
                                            className="flex-1 py-2.5 rounded-xl glass-button text-gray-300 font-medium text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleConfirmSave}
                                            className="flex-1 py-2.5 rounded-xl btn-primary text-sm"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Project Library Modal */}
            {showLibrary && (
                <ProjectLibrary
                    onLoadProject={async (project: SavedProject) => {
                        // Load project AND video from IndexedDB
                        const { videoFile: loadedVideo } = await loadProjectWithVideo(project.id);

                        setGeneratedContent({
                            html: project.html,
                            layoutConfig: project.layoutConfig,
                            reasoning: ''
                        });
                        setTopicContext(project.topicContext);
                        setSrtTextRaw(project.srtText);
                        setBgMusicVolume(project.bgMusicVolume);

                        // Parse SRT data
                        try {
                            const parsed = parseSRT(project.srtText);
                            setSrtData(parsed);
                        } catch (e) {
                            console.error('Failed to parse saved SRT:', e);
                            setSrtData([]);
                        }

                        // Load video if it exists!
                        // Only call setVideoFile — the useEffect on videoFile
                        // will handle URL.createObjectURL and cleanup automatically.
                        if (loadedVideo) {
                            setVideoFile(loadedVideo);
                        } else {
                            setVideoFile(null);
                            setVideoUrl('');
                        }

                        setAppState(AppState.EDITOR);
                        setShowLibrary(false);

                        // Show result
                        setTimeout(() => {
                            if (loadedVideo) {
                                alert('✅ Project loaded with video!\n\nEverything works exactly as before!');
                            } else {
                                alert('⚠️ Project loaded but no video was saved');
                            }
                        }, 300);
                    }}
                    onClose={() => setShowLibrary(false)}
                />
            )}
        </>
    );
};

export default App;