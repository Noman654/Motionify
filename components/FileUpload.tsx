
import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileVideo, FileText, ArrowRight, Download, ExternalLink, Music, Wand2, Mic, Play, FileAudio, Disc, Video, Clapperboard, Sparkles, CheckSquare, Edit2, Save, X, Headphones, Trash2, ArrowLeft, Folder, Gem, ChevronDown } from 'lucide-react';
import { extractWavFromVideo } from '../utils/audioHelpers';
import { generateSRT, generateTTS } from '../services/geminiService';
import { useToast } from './ToastContext';

interface FileUploadProps {
    onFilesSelected: (videoFile: File, srtFile: File, isAudioOnly: boolean) => void;
    apiKey: string;
    onBack: () => void;
    onOpenProjects?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, apiKey, onBack, onOpenProjects }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');

    // --- Split State for SRT ---
    const [videoSrt, setVideoSrt] = useState<File | null>(null);
    const [audioSrt, setAudioSrt] = useState<File | null>(null);

    // Computed Current SRT
    const currentSrt = activeTab === 'video' ? videoSrt : audioSrt;
    const setCurrentSrt = (file: File | null) => {
        if (activeTab === 'video') setVideoSrt(file);
        else setAudioSrt(file);
    };

    const [srtContent, setSrtContent] = useState<string>("");
    const [isEditingSrt, setIsEditingSrt] = useState(false);

    // --- Video Mode State ---
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isAutoGeneratingSRT, setIsAutoGeneratingSRT] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // --- Audio/TTS Mode State ---
    const [audioSourceType, setAudioSourceType] = useState<'upload' | 'tts'>('upload');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [ttsScript, setTtsScript] = useState('');
    const [ttsVoice, setTtsVoice] = useState<'male' | 'female'>('male');
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [generatedAudioFile, setGeneratedAudioFile] = useState<File | null>(null);

    // --- Refs ---
    const generationActiveRef = useRef(false);

    // --- Effects ---
    useEffect(() => {
        if (currentSrt) {
            currentSrt.text().then(text => setSrtContent(text));
        } else {
            setSrtContent("");
        }
        setIsEditingSrt(false);
    }, [currentSrt, activeTab]);

    // --- Common Helpers ---
    const handleSrtSave = () => {
        const file = new File([srtContent], currentSrt?.name || "edited.srt", { type: "text/plain" });
        setCurrentSrt(file);
        setIsEditingSrt(false);
    };

    const handleDownloadSrt = () => {
        if (!currentSrt) return;
        const url = URL.createObjectURL(currentSrt);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentSrt.name;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadAudio = () => {
        const fileToDownload = generatedAudioFile || audioFile;
        if (!fileToDownload) return;
        const url = URL.createObjectURL(fileToDownload);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileToDownload.name;
        a.click();
        URL.revokeObjectURL(url);
    };

    // --- Handlers: Video Mode ---
    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setVideoFile(e.target.files[0]);
        }
    };

    const handleSrtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCurrentSrt(e.target.files[0]);
        }
    };

    const handleExtractAudio = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoFile) return;
        setIsExtracting(true);
        try {
            await extractWavFromVideo(videoFile);
        } catch (e) {
            showToast("Failed to extract audio.", "error");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleAutoGenerateSRT = async (e: React.MouseEvent) => {
        e.stopPropagation();
        let sourceFile: File | null = null;
        if (activeTab === 'video') sourceFile = videoFile;
        else sourceFile = generatedAudioFile || audioFile;

        if (!sourceFile) {
            showToast("Please upload/generate media first.", "error");
            return;
        }
        if (!apiKey) {
            showToast("Please configure your API Key in settings first.", "error");
            return;
        }

        setIsAutoGeneratingSRT(true);
        generationActiveRef.current = true;

        try {
            const srtString = await generateSRT(sourceFile, apiKey);
            if (!generationActiveRef.current) return;
            const file = new File([srtString], "auto_generated.srt", { type: "text/plain" });
            setCurrentSrt(file);
        } catch (err: any) {
            if (!generationActiveRef.current) return;
            console.error(err);
            showToast(`Auto-generation failed: ${err.message || "Unknown error occurred"}`, "error");
        } finally {
            if (generationActiveRef.current) {
                setIsAutoGeneratingSRT(false);
                generationActiveRef.current = false;
            }
        }
    };

    const handleCancelGeneration = (e: React.MouseEvent) => {
        e.stopPropagation();
        generationActiveRef.current = false;
        setIsAutoGeneratingSRT(false);
    };

    // --- Handlers: Audio/TTS Mode ---
    const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAudioFile(e.target.files[0]);
            setGeneratedAudioFile(null);
            setAudioSrt(null);
        }
    };

    const handleGenerateTTS = async () => {
        if (!ttsScript.trim() || !apiKey) return;
        setIsGeneratingAudio(true);
        try {
            const audioBlob = await generateTTS(ttsScript, ttsVoice, apiKey);
            const audioFile = new File([audioBlob], `generated_${ttsVoice}.wav`, { type: 'audio/wav' });
            setGeneratedAudioFile(audioFile);
            setAudioFile(null);
            setAudioSrt(null);
        } catch (err) {
            console.error(err);
            showToast("Failed to generate audio. See console for details.", "error");
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const handleNext = () => {
        if (activeTab === 'video') {
            if (videoFile && currentSrt) {
                onFilesSelected(videoFile, currentSrt, false);
            }
        } else {
            const finalAudio = generatedAudioFile || audioFile;
            if (finalAudio && currentSrt) {
                onFilesSelected(finalAudio, currentSrt, true);
            }
        }
    };

    const handleRemoveVideo = (e: React.MouseEvent) => {
        e.stopPropagation();
        setVideoFile(null);
    };

    const handleRemoveAudio = (e: React.MouseEvent) => {
        e.stopPropagation();
        setAudioFile(null);
        setGeneratedAudioFile(null);
    };

    const handleRemoveSrt = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentSrt(null);
    };

    // Drag and Drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent, type: 'video' | 'audio' | 'srt') => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (!file) return;
        if (type === 'video') setVideoFile(file);
        else if (type === 'audio') { setAudioFile(file); setGeneratedAudioFile(null); setAudioSrt(null); }
        else setCurrentSrt(file);
    };

    // Completion status
    const isReady = activeTab === 'video'
        ? (videoFile && currentSrt)
        : ((generatedAudioFile || audioFile) && currentSrt);

    // --- Renderers ---
    const renderSRTSection = () => {
        const isTTSMode = activeTab === 'audio' && audioSourceType === 'tts';
        const hasSource = activeTab === 'video' ? !!videoFile : (!!audioFile || !!generatedAudioFile);

        return (
            <div
                className={`border rounded-2xl transition-all h-64 relative overflow-hidden flex flex-col ${isDragging ? 'border-green-400/50 bg-green-900/10 scale-[1.01]' :
                        currentSrt ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-white/8 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.03]'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'srt')}
            >
                {!isEditingSrt ? (
                    <>
                        <input
                            type="file"
                            accept=".srt"
                            onChange={handleSrtChange}
                            className="hidden"
                            id="srt-upload"
                            disabled={isAutoGeneratingSRT || isTTSMode}
                        />

                        {currentSrt ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 relative w-full">
                                <button
                                    onClick={handleRemoveSrt}
                                    className="absolute top-3 right-3 p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-gray-500 transition-colors z-20"
                                    title="Remove Captions"
                                >
                                    <X size={13} />
                                </button>
                                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 mb-3">
                                    <CheckSquare size={22} />
                                </div>
                                <p className="font-semibold text-white text-sm max-w-[80%] truncate mb-0.5">{currentSrt.name}</p>
                                <p className="text-[11px] text-emerald-400/70 font-mono mb-4">{(currentSrt.size / 1024).toFixed(1)} KB</p>

                                <div className="flex gap-2 z-10">
                                    <button onClick={() => setIsEditingSrt(true)} className="flex items-center gap-1.5 px-3 py-1.5 glass-button rounded-lg text-xs text-white transition-colors">
                                        <Edit2 size={11} /> Edit
                                    </button>
                                    <button onClick={handleDownloadSrt} className="flex items-center gap-1.5 px-3 py-1.5 glass-button rounded-lg text-xs text-white transition-colors">
                                        <Download size={11} /> Download
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-4">
                                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Add Captions</p>
                                <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={handleAutoGenerateSRT}
                                            disabled={!hasSource || isAutoGeneratingSRT}
                                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border font-semibold text-sm transition-all ${!hasSource
                                                ? 'border-white/5 text-gray-600 cursor-not-allowed bg-white/[0.02]'
                                                : 'border-orange-500/30 bg-orange-500/8 text-orange-300 hover:bg-orange-500/15 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-900/20'
                                                }`}
                                        >
                                            {isAutoGeneratingSRT ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Wand2 size={14} />}
                                            {isAutoGeneratingSRT ? "Generating..." : "Auto-Generate"}
                                        </button>

                                        {isAutoGeneratingSRT && (
                                            <button
                                                onClick={handleCancelGeneration}
                                                className="p-3 rounded-xl border border-red-500/30 bg-red-500/8 text-red-400 hover:bg-red-500/15 transition-colors"
                                                title="Cancel Generation"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {!isTTSMode && (
                                        <label
                                            htmlFor="srt-upload"
                                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs text-gray-500 transition-colors ${isAutoGeneratingSRT
                                                ? 'opacity-40 cursor-not-allowed pointer-events-none'
                                                : 'hover:text-gray-300 cursor-pointer hover:bg-white/[0.03]'
                                                }`}
                                        >
                                            <Upload size={13} /> or upload .SRT file
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col h-full w-full bg-[var(--color-bg-surface-0)]">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                            <span className="text-xs font-semibold text-gray-400">Editing Subtitles</span>
                            <button onClick={() => setIsEditingSrt(false)} className="text-gray-500 hover:text-white"><X size={13} /></button>
                        </div>
                        <textarea
                            value={srtContent}
                            onChange={(e) => setSrtContent(e.target.value)}
                            className="flex-1 w-full bg-transparent p-3 text-xs font-mono text-emerald-400 outline-none resize-none"
                            spellCheck={false}
                        />
                        <button onClick={handleSrtSave} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors">
                            <Save size={11} /> Save Changes
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full relative state-enter">

            {/* Scrollable Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 w-full overflow-y-auto">

                <div className="w-full max-w-4xl space-y-6 my-auto">

                    {/* Compact Header with Step Progress */}
                    <div className="space-y-5">
                        {/* Step Progress */}
                        <div className="flex items-center gap-3 max-w-md mx-auto">
                            <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center justify-center border border-orange-500/30">✓</div>
                                <span className="text-xs text-gray-500">Connect</span>
                            </div>
                            <div className="flex-1 h-px bg-orange-500/20" />
                            <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-orange-500/30">2</div>
                                <span className="text-xs font-medium text-white">Upload</span>
                            </div>
                            <div className="flex-1 h-px bg-white/10" />
                            <div className="flex items-center gap-1.5 opacity-30">
                                <div className="w-6 h-6 rounded-full bg-white/10 text-gray-500 text-[10px] font-bold flex items-center justify-center">3</div>
                                <span className="text-xs text-gray-600">Create</span>
                            </div>
                        </div>

                        {/* Title + Projects */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-display font-bold tracking-tight text-white">
                                    Import Media
                                </h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {activeTab === 'video' ? 'Add your video footage and captions' : 'Create from audio or text-to-speech'}
                                </p>
                            </div>
                            {onOpenProjects && (
                                <button
                                    onClick={onOpenProjects}
                                    className="flex items-center gap-2 px-4 py-2.5 glass-button rounded-xl text-sm font-medium text-gray-400 hover:text-white"
                                    title="Browse saved projects"
                                >
                                    <Folder size={15} />
                                    <span className="hidden sm:inline">Projects</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/5 w-fit">
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'video'
                                ? 'bg-white/[0.08] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <span className="flex items-center gap-2"><Clapperboard size={14} /> Video Studio</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('audio')}
                            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'audio'
                                ? 'bg-white/[0.08] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <span className="flex items-center gap-2"><Music size={14} /> Audio Mode</span>
                        </button>
                    </div>

                    {/* Upload Cards */}
                    <div className="glass-panel rounded-2xl p-6 md:p-8 border border-white/[0.06]">
                        {activeTab === 'video' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Clapperboard size={13} /> Source Footage
                                    </h3>
                                    <div
                                        className={`border rounded-2xl p-6 flex flex-col items-center justify-center transition-all h-64 relative overflow-hidden group ${isDragging ? 'border-orange-400/50 bg-orange-900/10 scale-[1.01]' :
                                                videoFile ? 'border-orange-500/30 bg-orange-950/10' : 'border-white/8 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.03]'
                                            }`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'video')}
                                    >
                                        <input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" id="video-upload" />

                                        {videoFile ? (
                                            <div className="relative w-full h-full flex flex-col items-center justify-center z-10">
                                                <button
                                                    onClick={handleRemoveVideo}
                                                    className="absolute top-[-8px] right-[-8px] p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-gray-500 transition-colors shadow-lg z-20"
                                                    title="Remove Video"
                                                >
                                                    <X size={14} />
                                                </button>

                                                <div className="p-3.5 rounded-xl bg-orange-500/10 text-orange-400 mb-3">
                                                    <FileVideo size={28} />
                                                </div>
                                                <div className="text-center px-4">
                                                    <p className="font-semibold text-sm text-white truncate max-w-[200px]">{videoFile.name}</p>
                                                    <p className="text-[11px] text-gray-500 mt-1 font-mono">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                                                </div>

                                                <button onClick={handleExtractAudio} disabled={isExtracting} className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 glass-button text-[11px] text-gray-400 px-3 py-1.5 rounded-lg hover:text-white">
                                                    {isExtracting ? <span className="animate-pulse text-xs">Processing...</span> : <><Download size={11} /> Get WAV</>}
                                                </button>
                                            </div>
                                        ) : (
                                            <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center space-y-3 w-full h-full justify-center z-10">
                                                <div className="p-4 rounded-xl bg-white/[0.04] text-orange-400 group-hover:scale-105 transition-transform duration-300 border border-white/5">
                                                    <FileVideo size={28} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-semibold text-sm text-white">Drop video here</p>
                                                    <p className="text-[11px] text-gray-600 mt-1">or click to browse · MP4, MOV, WEBM</p>
                                                </div>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <FileText size={13} /> Captions
                                    </h3>
                                    {renderSRTSection()}
                                </div>
                            </div>
                        ) : (
                            // --- AUDIO / TTS MODE ---
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                <div className="space-y-4">
                                    <div className="flex bg-white/[0.03] p-1 rounded-lg w-fit border border-white/5">
                                        <button onClick={() => setAudioSourceType('upload')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${audioSourceType === 'upload' ? 'bg-white/[0.08] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>Upload File</button>
                                        <button onClick={() => setAudioSourceType('tts')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${audioSourceType === 'tts' ? 'bg-white/[0.08] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>Text to Speech</button>
                                    </div>

                                    {audioSourceType === 'upload' ? (
                                        <div
                                            className={`border rounded-xl p-8 flex flex-col items-center justify-center transition-all h-60 relative ${audioFile ? 'border-orange-500/30 bg-fuchsia-950/10' : 'border-white/8 hover:border-white/12 bg-white/[0.02]'
                                                }`}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, 'audio')}
                                        >
                                            <input type="file" accept="audio/*,.wav,.mp3,.m4a" onChange={handleAudioFileChange} className="hidden" id="audio-upload" />

                                            {audioFile ? (
                                                <>
                                                    <button
                                                        onClick={handleRemoveAudio}
                                                        className="absolute top-2 right-2 p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-gray-500 transition-colors shadow-lg z-20"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                    <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center space-y-3 w-full h-full justify-center z-10">
                                                        <div className="p-3.5 rounded-xl bg-fuchsia-500/10 text-orange-400">
                                                            <Music size={24} />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-semibold text-sm text-white truncate max-w-[200px]">{audioFile.name}</p>
                                                            <p className="text-[11px] text-gray-500 mt-1 font-mono">{(audioFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                                                        </div>
                                                    </label>
                                                </>
                                            ) : (
                                                <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center space-y-3 w-full h-full justify-center">
                                                    <div className="p-4 rounded-xl bg-white/[0.04] text-orange-400 border border-white/5">
                                                        <Music size={24} />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-semibold text-sm text-white">Drop Audio File</p>
                                                        <p className="text-[11px] text-gray-600 mt-1">WAV, MP3, M4A</p>
                                                    </div>
                                                </label>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-60 flex flex-col gap-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => setTtsVoice('male')} className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${ttsVoice === 'male' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10'}`}>Male</button>
                                                <button onClick={() => setTtsVoice('female')} className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${ttsVoice === 'female' ? 'bg-fuchsia-500/10 border-orange-500/30 text-fuchsia-300' : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10'}`}>Female</button>
                                            </div>
                                            <textarea
                                                value={ttsScript}
                                                onChange={(e) => setTtsScript(e.target.value)}
                                                placeholder="Type your script here..."
                                                className="flex-1 w-full input-base bg-black/30 p-3 text-white text-xs leading-relaxed resize-none rounded-xl"
                                            />
                                            <button onClick={handleGenerateTTS} disabled={isGeneratingAudio || !ttsScript || !apiKey} className="w-full py-2.5 rounded-xl font-bold text-xs btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                                                {isGeneratingAudio ? "Synthesizing..." : "Generate Audio"}
                                            </button>
                                        </div>
                                    )}

                                    {/* Generated Audio Preview */}
                                    {(generatedAudioFile || audioFile) && (
                                        <div className="glass-panel rounded-xl p-3 flex items-center gap-3 animate-fade-in relative">
                                            <div className="p-2 bg-fuchsia-500/10 rounded-lg text-orange-400">
                                                <Music size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-white truncate">{(generatedAudioFile || audioFile)?.name}</p>
                                                <audio controls src={URL.createObjectURL(generatedAudioFile || audioFile!)} className="w-full h-6 mt-1 opacity-60 hover:opacity-100 transition-opacity" />
                                            </div>
                                            <button onClick={handleDownloadAudio} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors" title="Download Audio">
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <FileText size={13} /> Captions
                                    </h3>
                                    {renderSRTSection()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex justify-center w-full">
                        <div className="flex items-center gap-3 w-full max-w-md">
                            <button
                                onClick={onBack}
                                className="w-12 h-12 rounded-xl glass-button flex items-center justify-center text-gray-400 hover:text-white"
                                title="Back to Settings"
                            >
                                <ArrowLeft size={20} />
                            </button>

                            <button
                                onClick={handleNext}
                                disabled={!isReady}
                                className={`flex-1 group relative overflow-hidden flex items-center justify-center space-x-3 h-14 rounded-xl font-bold text-base transition-all ${isReady
                                        ? 'btn-primary'
                                        : 'bg-white/[0.04] text-gray-600 cursor-not-allowed border border-white/5'
                                    }`}
                            >
                                <span className="relative z-10">{activeTab === 'video' ? 'Continue to Studio' : 'Compose Visualizer'}</span>
                                <ArrowRight size={20} className="relative z-10" />
                            </button>
                        </div>
                    </div>

                    {/* Minimal tools link */}
                    <div className="flex justify-center gap-4 text-[11px] text-gray-600 pb-4">
                        <a href="https://podcast.adobe.com/enhance" target="_blank" rel="noreferrer" className="hover:text-orange-400 transition-colors flex items-center gap-1">
                            <Music size={9} /> Adobe Enhance
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
