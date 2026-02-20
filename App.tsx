


import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { ReelPlayer } from './components/ReelPlayer';
import { EditorPanel } from './components/EditorPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ProjectLibrary } from './components/ProjectLibrary';
import { VisualTimeline } from './components/VisualTimeline';
import { parseSRT } from './utils/srtParser';
import { AppState, GeneratedContent, SRTItem, MediaAsset } from './types';
import { Edit3, AlertCircle, LayoutTemplate, CheckCircle2, Globe, Github, Linkedin, Instagram, Facebook, BookOpen, X, Sparkles, Smartphone, Monitor, ArrowLeft, Key, Folder, Save } from 'lucide-react';
import { generateReelContent } from './services/geminiService';
import { APP_CONFIG } from './config';
import { constructPrompt, EXAMPLE_SRT, EXAMPLE_TOPIC, EXAMPLE_HTML, EXAMPLE_JSON } from './utils/promptTemplates';
import { saveProjectWithVideo, loadProjectWithVideo, SavedProject } from './utils/projectStorageWithVideo';

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
        setSaveProjectName(`Reel ${new Date().toLocaleDateString()}`);
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
            <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col items-center justify-center p-8 text-center md:hidden">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl border border-gray-800 flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden">
                    <Smartphone size={32} className="text-gray-500 relative z-10" />
                    <div className="absolute inset-0 bg-red-500/10 rotate-45 transform scale-150"></div>
                </div>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-3">
                    Desktop Experience Required
                </h2>
                <p className="text-gray-400 max-w-xs leading-relaxed text-sm">
                    Reel Composer is a professional studio tool designed for larger screens.
                    <br /><br />
                    Please open this application on your <strong>Laptop</strong> or <strong>Desktop</strong>.
                </p>
                <div className="mt-8 flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest">
                    <Monitor size={14} />
                    <span>Best viewed on 1024px+</span>
                </div>
            </div>

            {/* Main App Container - Only rendered on Desktop (md+) */}
            <div className="hidden md:contents">
                {appState === AppState.WELCOME ? (
                    <WelcomeScreen onComplete={handleWelcomeComplete} />
                ) : (
                    <div className="w-full h-screen flex flex-col bg-gray-950 text-white overflow-hidden relative">

                        {/* Header (Dynamic Island Style) */}
                        {!isFullScreen && appState !== AppState.UPLOAD && (
                            <header className="relative mt-6 mb-4 mx-auto w-[90%] max-w-6xl h-16 shrink-0 rounded-full border border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md z-50 shadow-2xl shadow-black/50 pointer-events-none">
                                <div className="pointer-events-auto flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-[1px] shadow-lg shadow-purple-500/30">
                                        <div className="w-full h-full rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                            <Sparkles size={18} className="text-white" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-display font-medium text-lg tracking-tight text-white leading-none">
                                            Reel Composer
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">
                                            Pro Studio
                                        </span>
                                    </div>
                                </div>

                                <div className="pointer-events-auto flex items-center gap-2">
                                    <div className="hidden lg:flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5 mr-4">
                                        <button
                                            onClick={handleResetAuth}
                                            className="px-4 py-1.5 rounded-full text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                                            title="Settings"
                                        >
                                            <Key size={12} /> API
                                        </button>
                                        <div className="w-px h-4 bg-white/10"></div>
                                        <button
                                            onClick={() => setShowLibrary(true)}
                                            className="px-4 py-1.5 rounded-full text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                                        >
                                            <Folder size={12} /> Library
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
                                        className="glass-button w-9 h-9 rounded-full flex items-center justify-center text-gray-300 hover:text-white"
                                        title="New Project"
                                    >
                                        <LayoutTemplate size={16} />
                                    </button>

                                    {generatedContent && (
                                        <button
                                            onClick={handleOpenSaveDialog}
                                            className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black hover:bg-gray-200 font-semibold text-sm shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105 ml-2"
                                        >
                                            <Save size={14} />
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
                                <div className="flex flex-col h-full overflow-y-auto">
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
                                <div className="flex flex-col h-full overflow-hidden relative">
                                    {/* Cinematic Background Elements */}
                                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse"></div>
                                        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
                                        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[100px]"></div>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative mt-16">
                                        <div className="glass-panel max-w-2xl w-full p-10 rounded-[2.5rem] shadow-2xl animate-scale-in border border-white/10 relative overflow-hidden group">
                                            {/* Spotlight Effect */}
                                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                                            <div className="absolute -top-[100px] -left-[100px] w-[200px] h-[200px] bg-purple-500/30 blur-[80px] group-hover:bg-purple-500/40 transition-all duration-700"></div>

                                            <div className="text-center space-y-4 mb-10 relative z-10">
                                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-800/50 to-black/50 mb-2 border border-white/5 shadow-2xl ring-1 ring-white/5">
                                                    <Sparkles size={32} className="text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                                                </div>
                                                <div>
                                                    <h2 className="text-5xl font-display font-medium tracking-tighter text-white mb-2">
                                                        Director's Studio
                                                    </h2>
                                                    <p className="text-gray-400 text-lg font-light max-w-md mx-auto">
                                                        {isAudioOnly
                                                            ? "Craft the visual atmosphere for your audio track."
                                                            : "Direct the AI to generate synced visuals."}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-8 relative z-10">
                                                <div className="space-y-3">
                                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                                                        <Edit3 size={12} />
                                                        Visual Direction
                                                    </label>
                                                    <div className="relative group/input">
                                                        <textarea
                                                            value={topicContext}
                                                            onChange={(e) => setTopicContext(e.target.value)}
                                                            placeholder={isAudioOnly ? "e.g. A lo-fi chill space background with floating stars..." : "e.g. Create a high-energy tech demo with neon grids and fast transitions..."}
                                                            className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-5 text-base text-gray-200 placeholder:text-gray-600 resize-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all shadow-inner"
                                                        />
                                                        <div className="absolute bottom-4 right-4 text-xs text-gray-600 font-mono">
                                                            {topicContext.length} chars
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <button
                                                        onClick={handleEnterStudio}
                                                        disabled={isGenerating}
                                                        className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-2xl border border-white/10 relative overflow-hidden group/btn ${isGenerating
                                                            ? 'bg-gray-900 text-gray-500 cursor-not-allowed'
                                                            : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98]'
                                                            }`}
                                                    >
                                                        {!isGenerating && <div className="absolute inset-0 bg-gradient-to-r from-purple-200 via-white to-purple-200 opacity-0 group-hover/btn:opacity-50 transition-opacity blur-xl"></div>}

                                                        {isGenerating ? (
                                                            <>
                                                                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                                                                <span>Designing Scene...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="relative z-10">{!apiKey ? "Enter Manual Mode" : "Generate Scene"}</span>
                                                                <Sparkles size={20} className="relative z-10 text-purple-600" />
                                                            </>
                                                        )}
                                                    </button>

                                                    {/* Manual Mode Option */}
                                                    {isGenerating && showManualButton && (
                                                        <div className="animate-fade-in text-center">
                                                            <button
                                                                onClick={handleManualModeEnter}
                                                                className="text-sm text-gray-500 hover:text-white transition-colors"
                                                            >
                                                                Taking too long? <span className="underline decoration-gray-700 underline-offset-4 hover:decoration-white">Skip to Editor</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Error Message */}
                                            {error && (
                                                <div className="mt-8 p-4 bg-red-950/30 border border-red-500/20 rounded-xl flex items-start gap-4 animate-fade-in backdrop-blur-md">
                                                    <div className="p-2 bg-red-500/10 rounded-full">
                                                        <AlertCircle size={20} className="text-red-400" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-bold text-red-200">Generation Failed</h4>
                                                        <p className="text-sm text-red-300/70 mt-1 leading-relaxed">{error}</p>
                                                        <div className="flex gap-4 mt-3">
                                                            <button onClick={handleResetAuth} className="text-xs font-semibold text-red-300 hover:text-white transition-colors">Check API Key</button>
                                                            <button onClick={handleManualModeEnter} className="text-xs font-semibold text-gray-500 hover:text-white transition-colors">Use Manual Mode</button>
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
                                <div className="flex flex-col h-full">
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
                                            />
                                        </div>

                                        {/* Right: Code/Config Editor (Hidden if fullscreen) */}
                                        {!isFullScreen && (
                                            <div className="w-[450px] flex-shrink-0 border-l border-gray-800 bg-gray-900 z-10 shadow-2xl overflow-y-auto">
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
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom: Timeline Bar (full width, below everything, never overlaps) */}
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
                        <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-2xl z-[100] transition-all duration-300 flex items-center gap-2 ${showSnackbar ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                            <CheckCircle2 size={20} className="text-green-600" />
                            Prompt Copied to Clipboard!
                        </div>

                        {/* Replace Scene Dialog (Delayed Response) */}
                        {showReplaceDialog && (
                            <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                                <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in ring-1 ring-white/5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-500/20 text-green-400 rounded-lg">
                                                <Sparkles size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">Scene Generated</h3>
                                                <p className="text-xs text-gray-400">The AI has finished generating your scene.</p>
                                            </div>
                                        </div>
                                        <button onClick={handleCancelReplace} className="text-gray-500 hover:text-white transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                                        A new scene has arrived from the background generation process. Would you like to replace your current manual setup with the AI-generated one?
                                    </p>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleCancelReplace}
                                            className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm transition-colors"
                                        >
                                            Keep Manual
                                        </button>
                                        <button
                                            onClick={handleConfirmReplace}
                                            className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-colors"
                                        >
                                            Replace Scene
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Subtitle Edit Dialog */}
                        {editingSubtitle && (
                            <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                                <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-in ring-1 ring-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Edit3 size={18} className="text-yellow-500" />
                                            Edit Subtitle
                                        </h3>
                                        <button onClick={() => setEditingSubtitle(null)} className="text-gray-500 hover:text-white transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="mb-6">
                                        <div className="flex justify-between text-xs text-gray-500 font-mono mb-2">
                                            <span>Start: {editingSubtitle.startTime.toFixed(2)}s</span>
                                            <span>End: {editingSubtitle.endTime.toFixed(2)}s</span>
                                        </div>
                                        <textarea
                                            value={editSubtitleText}
                                            onChange={(e) => setEditSubtitleText(e.target.value)}
                                            className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-lg text-white resize-none focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50"
                                            autoFocus
                                            placeholder="Enter subtitle text..."
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setEditingSubtitle(null)}
                                            className="flex-1 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveSubtitle}
                                            className="flex-1 py-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-sm transition-colors shadow-lg shadow-yellow-900/20"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Save Project Dialog */}
                        {showSaveDialog && (
                            <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                                <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in ring-1 ring-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Save size={18} className="text-blue-400" />
                                            Save Project
                                        </h3>
                                        <button onClick={() => setShowSaveDialog(false)} className="text-gray-500 hover:text-white transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="mb-6">
                                        <label className="text-xs text-gray-400 mb-2 block">Project Name</label>
                                        <input
                                            type="text"
                                            value={saveProjectName}
                                            onChange={(e) => setSaveProjectName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleConfirmSave();
                                                if (e.key === 'Escape') setShowSaveDialog(false);
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                                            autoFocus
                                            placeholder="Enter project name..."
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowSaveDialog(false)}
                                            className="flex-1 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleConfirmSave}
                                            className="flex-1 py-2.5 rounded-lg bg-white hover:bg-gray-200 text-black font-bold text-sm transition-colors shadow-lg"
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