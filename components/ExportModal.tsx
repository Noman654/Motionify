
import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react';
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


// SubtitleRenderer removed (using Canvas 2D now)


export const ExportModal: React.FC<ExportModalProps> = ({
    isOpen, onClose, videoFile, htmlContent, bgMusicFile, bgMusicVolume = 0.2, duration = 10, srtData, layoutConfig = []
}) => {

    const [status, setStatus] = useState<'idle' | 'rendering' | 'merging' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [logText, setLogText] = useState('');
    const [outputPath, setOutputPath] = useState('');
    const [isNative, setIsNative] = useState(false);
    const [renderStartTime, setRenderStartTime] = useState(0);
    const [renderEndTime, setRenderEndTime] = useState(duration);


    // Keep end time synced with duration
    useEffect(() => { setRenderEndTime(duration); }, [duration]);

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
    const isRenderingRef = useRef(false);

    const startNativeRender = async () => {
        if (isRenderingRef.current) {
            console.warn('Render already in progress, ignoring duplicate call.');
            return;
        }
        if (!videoFile) {
            setLogText("Error: No video file found.");
            setStatus('error');
            return;
        }
        if (!isNative) return;

        isRenderingRef.current = true;

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

            const clipStart = Math.max(0, renderStartTime);
            const clipEnd = Math.min(duration, renderEndTime);
            const clipDuration = clipEnd - clipStart;
            const totalFrames = Math.ceil(clipDuration * FPS);
            let lastOverlayHeight = -1; // Track to avoid unnecessary resizes

            // === RENDER LOOP ===
            for (let i = 0; i < totalFrames; i++) {
                const time = clipStart + i / FPS;

                // 1. Sync subtitle state - REMOVED (No longer needed for React render)

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
                const isFullHtml = layoutMode === 'full-html';

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

                // 5. Seek video (optimized: no fixed delay; wait for seeked event)
                video.currentTime = time;
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

                    // Strict 9:16 Cover (crop to fill)
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

                // 9. DRAW SUBTITLES (direct Canvas 2D text rendering — no DOM capture)
                if (srtData?.length) {
                    const currentSub = srtData.find(item => time >= item.startTime && time <= item.endTime);
                    if (currentSub) {
                        const WORDS_PER_VIEW = 5;
                        const allWords = currentSub.text.split(' ');
                        const subDuration = currentSub.endTime - currentSub.startTime;
                        const subElapsed = time - currentSub.startTime;
                        const subProgress = Math.max(0, Math.min(1, subElapsed / subDuration));
                        const globalActiveIdx = Math.floor(subProgress * allWords.length);
                        const chunkIdx = Math.floor(globalActiveIdx / WORDS_PER_VIEW);
                        const startWordIdx = chunkIdx * WORDS_PER_VIEW;
                        const visibleWords = allWords.slice(startWordIdx, startWordIdx + WORDS_PER_VIEW);

                        let subY = HEIGHT * 0.82;
                        if (layoutMode === 'split') {
                            subY = HEIGHT * splitRatio - 30;
                        } else if (layoutMode === 'full-video' || layoutMode === 'full-html') {
                            subY = HEIGHT * 0.8;
                        }

                        // Draw subtitle background
                        const fontSize = 48;
                        ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        // Measure total width for background
                        const totalText = visibleWords.join('  ');
                        const metrics = ctx.measureText(totalText);
                        const bgPadX = 30, bgPadY = 20;
                        const bgW = metrics.width + bgPadX * 2;
                        const bgH = fontSize * 1.5 + bgPadY * 2;
                        const bgX = (WIDTH - bgW) / 2;
                        const bgY = subY - bgH / 2;

                        if (isFullHtml) {
                            ctx.save();
                            ctx.fillStyle = 'rgba(0,0,0,0.7)';
                            ctx.beginPath();
                            ctx.roundRect(bgX, bgY, bgW, bgH, 24);
                            ctx.fill();
                            ctx.restore();
                        }

                        // Draw each word
                        let drawX = WIDTH / 2 - metrics.width / 2;
                        for (let wi = 0; wi < visibleWords.length; wi++) {
                            const trueIdx = startWordIdx + wi;
                            const isActive = trueIdx === globalActiveIdx;
                            const isPast = trueIdx < globalActiveIdx;

                            ctx.font = `900 ${isActive ? fontSize * 1.1 : fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

                            // Shadow
                            ctx.save();
                            ctx.fillStyle = 'rgba(0,0,0,0.8)';
                            ctx.fillText(visibleWords[wi], drawX + 3 + ctx.measureText(visibleWords[wi]).width / 2, subY + 3);
                            ctx.restore();

                            // Main text
                            ctx.fillStyle = isActive ? '#facc15' : (isPast ? '#ffffff' : 'rgba(255,255,255,0.4)');
                            ctx.fillText(visibleWords[wi], drawX + ctx.measureText(visibleWords[wi]).width / 2, subY);

                            drawX += ctx.measureText(visibleWords[wi]).width + ctx.measureText('  ').width;
                        }
                    }
                }

                // 10. Send frame to FFmpeg
                const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.90));
                if (blob) await electron.writeFrame(await blob.arrayBuffer());

                setProgress(Math.round((i / totalFrames) * 100));
                setLogText(`Rendering: ${i + 1}/${totalFrames}`);
                if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
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
            isRenderingRef.current = false;
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        }
    };



    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-2xl w-full max-w-md shadow-2xl shadow-black/50 p-6 animate-scale-in ring-1 ring-white/5">

                {/* Hidden Render Elements */}
                <div className="fixed -left-[9999px] top-0" style={{ opacity: 1 }}>
                    <canvas ref={canvasRef} />
                    <video ref={videoRef} muted playsInline />
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

                        {/* Time Range Selection */}
                        <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50 space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Time Range</h4>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-[10px] text-gray-500 mb-1 block">Start (sec)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={renderEndTime}
                                        step={0.1}
                                        value={renderStartTime}
                                        onChange={(e) => setRenderStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                                <span className="text-gray-600 mt-4">→</span>
                                <div className="flex-1">
                                    <label className="text-[10px] text-gray-500 mb-1 block">End (sec)</label>
                                    <input
                                        type="number"
                                        min={renderStartTime}
                                        max={duration}
                                        step={0.1}
                                        value={renderEndTime}
                                        onChange={(e) => setRenderEndTime(Math.min(duration, parseFloat(e.target.value) || duration))}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-500">Duration: {Math.max(0, renderEndTime - renderStartTime).toFixed(1)}s ({Math.ceil(Math.max(0, renderEndTime - renderStartTime) * 30)} frames)</p>
                        </div>

                        <button onClick={startNativeRender} disabled={!isNative} className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white font-bold rounded-lg transition-all">
                            {isNative ? 'Start Render' : 'Requires Desktop App'}
                        </button>
                    </div>
                )}

                {(status === 'rendering' || status === 'merging') && (
                    <div className="text-center space-y-4 py-2">
                        <Loader2 className="animate-spin text-purple-500 mx-auto" size={40} />
                        <div className="text-2xl font-bold text-white">{progress}%</div>
                        <p className="text-sm text-gray-400">{logText}</p>
                        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                {status === 'done' && (
                    <div className="text-center space-y-4 p-4 rounded-xl bg-green-500/5 border border-green-500/20">
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
                    <div className="text-center space-y-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                        <AlertCircle className="text-red-500 mx-auto" size={40} />
                        <h3 className="text-xl font-bold text-white">Error</h3>
                        <p className="text-sm text-red-300">{logText}</p>
                        <button onClick={() => setStatus('idle')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Retry</button>
                    </div>
                )}
            </div>
        </div>
    );
};
