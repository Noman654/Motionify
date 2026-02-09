
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { toCanvas } from 'html-to-image'; // Still used for subtitle capture only
import { X, CheckCircle, AlertCircle, Loader2, Zap, FileCode } from 'lucide-react';
import { LayoutConfigStep, SRTItem } from '../types';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoFile: File | null;
    htmlContent: string;
    bgMusicFile?: File | null;
    bgMusicVolume?: number;
    duration?: number;
    srtData?: SRTItem[];
    layoutConfig?: LayoutConfigStep[];
}

// --- HIDDEN SUBTITLE RENDERER (Exact Clone of ReelPlayer Logic) ---
const SubtitleRenderer = ({ currentTime, srtData, layoutConfig }: { currentTime: number, srtData: SRTItem[], layoutConfig?: LayoutConfigStep[] }) => {
    const currentCaption = useMemo(() => {
        return srtData.find(item => currentTime >= item.startTime && currentTime <= item.endTime);
    }, [currentTime, srtData]);

    const isFullHtml = useMemo(() => {
        if (!layoutConfig) return false;
        const currentStep = layoutConfig.find(step => currentTime >= step.startTime && currentTime < step.endTime);
        return currentStep?.layoutMode === 'full-html';
    }, [currentTime, layoutConfig]);

    if (!currentCaption) return null;

    const WORDS_PER_VIEW = 5;
    const allWords = currentCaption.text.split(' ');
    const duration = currentCaption.endTime - currentCaption.startTime;
    const elapsed = currentTime - currentCaption.startTime;
    const progress = Math.max(0, Math.min(1, elapsed / duration));
    const globalActiveIndex = Math.floor(progress * allWords.length);
    const currentChunkIndex = Math.floor(globalActiveIndex / WORDS_PER_VIEW);
    const startWordIndex = currentChunkIndex * WORDS_PER_VIEW;
    const endWordIndex = startWordIndex + WORDS_PER_VIEW;
    const visibleWords = allWords.slice(startWordIndex, endWordIndex);

    // Scaling Styles for 1080p (approx 2.5x base values)
    const containerClasses = isFullHtml
        ? 'bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl rounded-[3rem]'
        : ''; // Scaled rounded-2xl to rounded-[3rem]

    return (
        <div id="hidden-subtitle-render-target"
            // ADDED font-sans to ensure system font usage
            className={`font-sans flex flex-wrap justify-center items-center gap-x-4 gap-y-2 px-6 py-4 ${containerClasses}`}
            style={{ width: '900px', textAlign: 'center' }}>
            {visibleWords.map((word, index) => {
                const trueIndex = startWordIndex + index;
                const isActive = trueIndex === globalActiveIndex;
                const isPast = trueIndex < globalActiveIndex;

                return (
                    <span key={trueIndex}
                        style={{
                            // Adjusted to 48px for balanced scaling (approx 3x or 24px base)
                            fontSize: '48px',
                            fontWeight: 900,
                            // Added tracking-wide equivalent (0.025em)
                            letterSpacing: '0.025em',
                            lineHeight: 1.25, // leading-tight
                            transform: isActive ? 'scale(1.1)' : 'scale(1)',
                            textShadow: isActive
                                ? '0 0 30px rgba(250, 204, 21, 0.6), 3px 3px 0px rgba(0,0,0,1)' // Matched 0.6 opacity
                                : '3px 3px 0px rgba(0,0,0,0.8)',
                            color: isActive ? '#facc15' : (isPast ? '#ffffff' : 'rgba(255,255,255,0.4)'),
                            display: 'inline-block',
                            transition: 'none'
                        }}
                    >
                        {word}&nbsp;
                    </span>
                );
            })}
        </div>
    );
};

export const ExportModal: React.FC<ExportModalProps> = ({
    isOpen, onClose, videoFile, htmlContent, bgMusicFile, bgMusicVolume = 0.2, duration = 10, srtData, layoutConfig = []
}) => {

    const [status, setStatus] = useState<'idle' | 'rendering' | 'merging' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [logText, setLogText] = useState('');
    const [outputPath, setOutputPath] = useState('');
    const [isNative, setIsNative] = useState(false);

    // Export Time State to drive Subtitles
    const [exportTime, setExportTime] = useState(0);

    useEffect(() => {
        setIsNative(!!window.electron);
        const electron = window.electron;
        let unsubscribe: (() => void) | undefined;

        if (electron?.onProgress) {
            unsubscribe = electron.onProgress((data) => {
                if (data.phase === 'merging') {
                    setProgress(Math.round(data.percent || 0));
                    setLogText(`Merging Audio: ${Math.round(data.percent || 0)}%`);
                }
            });
        }

        return () => {
            // Clean up the IPC listener on unmount to prevent leaks
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const startNativeRender = async () => {
        if (!videoFile) {
            setLogText("Error: No video file found.");
            setStatus('error');
            return;
        }
        if (!isNative) return;

        const electron = window.electron!;

        setStatus('rendering');
        setProgress(0);
        setLogText('Initializing...');

        let videoUrl: string | null = null;

        try {
            const savePath = await electron.saveDialog('MyReel.mp4');
            if (!savePath) { setStatus('idle'); return; }

            // Save assets to temp files
            const videoBuffer = await videoFile.arrayBuffer();
            const tempVideoPath = await electron.saveTempFile({ buffer: videoBuffer, extension: 'mp4' });

            let tempBgMusicPath = null;
            if (bgMusicFile) {
                const bgBuffer = await bgMusicFile.arrayBuffer();
                tempBgMusicPath = await electron.saveTempFile({ buffer: bgBuffer, extension: 'mp3' });
            }

            const WIDTH = 1080;
            const HEIGHT = 1920;
            const FPS = 30;

            // --- Initialize offscreen overlay window for HTML capture ---
            setLogText('Loading HTML overlay...');
            const initResult = await electron.initOverlayWindow({
                htmlContent: htmlContent,
                width: WIDTH,
                height: HEIGHT
            });
            if (!initResult.success) {
                throw new Error('Failed to init overlay window: ' + (initResult.error || 'unknown'));
            }

            // Start FFmpeg frame stream
            await electron.startRender({ width: WIDTH, height: HEIGHT, fps: FPS });

            // Prepare video element for frame extraction
            videoUrl = URL.createObjectURL(videoFile);
            const video = videoRef.current!;
            video.src = videoUrl;
            video.load();
            await new Promise<void>(r => { video.onloadeddata = () => r(); });
            video.currentTime = 0;
            await new Promise(r => setTimeout(r, 100));

            const canvas = canvasRef.current!;
            canvas.width = WIDTH;
            canvas.height = HEIGHT;
            const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

            const totalFrames = Math.ceil(duration * FPS);
            let lastOverlayHeight = -1; // Track to avoid unnecessary resizes

            // === RENDER LOOP ===
            for (let i = 0; i < totalFrames; i++) {
                const time = i / FPS;

                // 1. Sync subtitle state (flushSync ensures render before capture)
                flushSync(() => setExportTime(time));

                // 2. Determine current layout
                let currentLayout = layoutConfig.find(step => time >= step.startTime && time < step.endTime);
                if (!currentLayout && layoutConfig.length > 0) {
                    if (time >= layoutConfig[layoutConfig.length - 1].endTime) {
                        currentLayout = layoutConfig[layoutConfig.length - 1];
                    }
                }
                if (!currentLayout) {
                    currentLayout = { layoutMode: 'split', splitRatio: 0.5, startTime: 0, endTime: 9999 };
                }

                const { layoutMode, splitRatio = 0.5 } = currentLayout;

                // 3. Calculate dimensions
                let htmlH = HEIGHT * 0.5;
                let videoH = HEIGHT * 0.5;
                let videoY = HEIGHT * 0.5;

                if (layoutMode === 'full-video') {
                    htmlH = 0; videoH = HEIGHT; videoY = 0;
                } else if (layoutMode === 'full-html') {
                    htmlH = HEIGHT; videoH = 0; videoY = HEIGHT;
                } else if (layoutMode === 'split') {
                    htmlH = HEIGHT * splitRatio;
                    videoH = HEIGHT * (1 - splitRatio);
                    videoY = htmlH;
                }

                // 4. Resize overlay window if HTML height changed
                const roundedHtmlH = Math.round(htmlH);
                if (roundedHtmlH !== lastOverlayHeight && roundedHtmlH > 0) {
                    await electron.resizeOverlayWindow({ width: WIDTH, height: roundedHtmlH });
                    lastOverlayHeight = roundedHtmlH;
                }

                // 5. Seek video
                video.currentTime = time;
                await new Promise(r => setTimeout(r, 30));
                if (video.seeking) {
                    await new Promise<void>(r => {
                        const h = () => { video.removeEventListener('seeked', h); r(); };
                        video.addEventListener('seeked', h);
                    });
                }

                // 6. Clear canvas
                ctx.clearRect(0, 0, WIDTH, HEIGHT);
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);

                // 7. DRAW VIDEO (if visible)
                if (videoH > 0) {
                    const vidRatio = video.videoWidth / video.videoHeight;
                    const targetRatio = WIDTH / videoH;
                    let drawW = WIDTH, drawH = videoH, dx = 0, dy = videoY;

                    if (vidRatio > targetRatio) {
                        drawH = videoH;
                        drawW = videoH * vidRatio;
                        dx = (WIDTH - drawW) / 2;
                    } else {
                        drawW = WIDTH;
                        drawH = WIDTH / vidRatio;
                        dy = videoY + (videoH - drawH) / 2;
                    }

                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0, videoY, WIDTH, videoH);
                    ctx.clip();
                    ctx.drawImage(video, dx, dy, drawW, drawH);
                    ctx.restore();
                }

                // 8. DRAW HTML OVERLAY (via offscreen BrowserWindow capturePage)
                if (htmlH > 0) {
                    try {
                        const captureResult = await electron.captureOverlayFrame({ time });
                        if (captureResult.success && captureResult.buffer) {
                            // Convert the PNG buffer to an ImageBitmap for canvas drawing
                            const blob = new Blob([captureResult.buffer], { type: 'image/png' });
                            const bitmap = await createImageBitmap(blob);
                            ctx.drawImage(bitmap, 0, 0, WIDTH, roundedHtmlH);
                            bitmap.close();
                        }
                    } catch (e) {
                        console.error("Overlay capture error:", e);
                    }
                }

                // 9. DRAW SUBTITLES (still uses html-to-image for simple text elements)
                const subTarget = document.getElementById('hidden-subtitle-render-target');
                if (subTarget && srtData?.length) {
                    try {
                        const SUB_SCALE = 2;
                        const subImg = await toCanvas(subTarget, {
                            backgroundColor: null as any,
                            skipAutoScale: true,
                            pixelRatio: SUB_SCALE
                        });

                        let subY = HEIGHT * 0.82;
                        if (layoutMode === 'split') {
                            subY = (HEIGHT * splitRatio) - (subImg.height / SUB_SCALE / 2);
                        } else if (layoutMode === 'full-video' || layoutMode === 'full-html') {
                            subY = HEIGHT * 0.8;
                        }

                        const desiredWidth = 900;
                        const desiredHeight = subImg.height / SUB_SCALE;
                        const subX = (WIDTH - desiredWidth) / 2;
                        ctx.drawImage(subImg, subX, subY, desiredWidth, desiredHeight);
                    } catch (e) { /* subtitle capture failed, skip frame */ }
                }

                // 10. Send frame to FFmpeg
                const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.90));
                if (blob) await electron.writeFrame(await blob.arrayBuffer());

                setProgress(Math.round((i / totalFrames) * 100));
                setLogText(`Rendering: ${i + 1}/${totalFrames}`);
                if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
            }

            // === FINALIZE ===
            await electron.closeOverlayWindow();

            setStatus('merging');
            await electron.endRender({
                originalVideoPath: tempVideoPath,
                bgMusicPath: tempBgMusicPath,
                bgMusicVolume: bgMusicVolume,
                outputPath: savePath
            });

            setStatus('done');
            setOutputPath(savePath);

        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setLogText('Error: ' + e.message);
            // Ensure overlay window is cleaned up on error
            try { await window.electron?.closeOverlayWindow(); } catch (_) { }
        } finally {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        }
    };

    const startHtmlExport = async () => {
        if (!isNative) return;

        setStatus('rendering');
        setLogText('Inlining external resources...');
        setProgress(100); // Indeterminate or just full for HTML

        try {
            const electron = window.electron!;
            const res = await electron.saveInlineHtml(htmlContent);

            if (res.success) {
                setStatus('done');
                setOutputPath(res.filePath);
                setLogText('');
            } else {
                if (res.error) throw new Error(res.error);
                setStatus('idle'); // Cancelled
            }
        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setLogText('Error: ' + e.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-2xl w-full max-w-md shadow-2xl shadow-black/50 p-6 animate-scale-in ring-1 ring-white/5">

                {/* Hidden Render Elements — iframe removed; overlay capture is
                    now handled by an offscreen BrowserWindow in the main process. */}
                <div className="fixed -left-[9999px] top-0" style={{ opacity: 1 }}>
                    <canvas ref={canvasRef} />
                    <video ref={videoRef} muted playsInline />
                    {/* Synchronous React Subtitle Renderer */}
                    <SubtitleRenderer currentTime={exportTime} srtData={srtData || []} layoutConfig={layoutConfig} />
                </div>

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap className="text-purple-400" /> Native Export
                    </h2>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button>
                </div>

                {status === 'idle' && (
                    <div className="space-y-4">
                        <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-500/30">
                            <h3 className="text-purple-300 font-bold mb-1">Exact Replica Export</h3>
                            <p className="text-purple-200/60 text-sm">
                                Pixel-perfect render including all subtitle animations, colors, and effects.
                            </p>
                        </div>
                        <button onClick={startNativeRender} disabled={!isNative} className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white font-bold rounded-lg transition-all">
                            {isNative ? 'Start Render' : 'Requires Desktop App'}
                        </button>

                        <div className="h-px bg-gray-800 my-4" />

                        <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/30">
                            <h3 className="text-blue-300 font-bold mb-1 flex items-center gap-2">
                                <FileCode size={16} /> Offline HTML
                            </h3>
                            <p className="text-blue-200/60 text-sm">
                                Save as a single, self-contained HTML file with all fonts, images, and styles inlined.
                            </p>
                        </div>
                        <button onClick={startHtmlExport} disabled={!isNative} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-bold rounded-lg transition-all">
                            Download HTML File
                        </button>
                    </div>
                )}

                {(status === 'rendering' || status === 'merging') && (
                    <div className="text-center space-y-4">
                        <Loader2 className="animate-spin text-purple-500 mx-auto" size={40} />
                        <div className="text-2xl font-bold text-white">{progress}%</div>
                        <p className="text-sm text-gray-400">{logText}</p>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                {status === 'done' && (
                    <div className="text-center space-y-4">
                        <CheckCircle size={32} className="text-green-500 mx-auto" />
                        <h3 className="text-xl font-bold text-white">Export Completed</h3>
                        <p className="text-sm text-gray-400 break-all">Saved to: <span className="text-purple-300">{outputPath}</span></p>

                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                onClick={() => setStatus('idle')}
                                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all"
                            >
                                Re-export Video
                            </button>
                            <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">Close</button>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center space-y-4">
                        <AlertCircle className="text-red-500 mx-auto" size={40} />
                        <h3 className="text-xl font-bold text-white">Error</h3>
                        <p className="text-sm text-red-300">{logText}</p>
                        <button onClick={() => setStatus('idle')} className="px-4 py-2 bg-gray-700 text-white rounded-lg">Retry</button>
                    </div>
                )}
            </div>
        </div>
    );
};
