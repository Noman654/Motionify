
import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react';
import { LayoutConfigStep, SRTItem } from '../types';
import { renderExportCaption, DEFAULT_STYLE_ID } from '../utils/captionStyles';
import { ActiveHook, HookStyle } from '../services/hookService';

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
    captionStyleId?: string;
    activeHook?: ActiveHook | null;
}


/* ── Canvas 2D Hook Renderer for Export ── */
function renderHookOnCanvas(
    ctx: CanvasRenderingContext2D,
    hook: ActiveHook,
    W: number,
    H: number,
    opacity: number,
    time: number
) {
    ctx.save();
    ctx.globalAlpha = opacity;

    /* Dark backdrop */
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fillRect(0, 0, W, H);

    /* Entrance animation factor (0→1 over first 0.5s) */
    const t = Math.min(1, time / 0.5);
    const ease = 1 - Math.pow(1 - t, 3); /* easeOutCubic */

    const centerX = W / 2;
    const centerY = H / 2;

    switch (hook.style) {
        case 'numbered_list': {
            const match = hook.text.match(/^(\d+)\s*(.*)/);
            const num = match ? match[1] : '3';
            const rest = match ? match[2] : hook.text;

            /* Big number */
            ctx.font = `900 ${Math.round(W * 0.28)}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(251,191,36,0.4)';
            ctx.shadowBlur = 60;
            const numY = centerY - H * 0.08 + (1 - ease) * -80;
            ctx.globalAlpha = opacity * ease;
            ctx.fillText(num, centerX, numY);
            ctx.shadowBlur = 0;

            /* Accent line */
            const lineW = W * 0.5 * ease;
            const lineGrad = ctx.createLinearGradient(centerX - lineW / 2, 0, centerX + lineW / 2, 0);
            lineGrad.addColorStop(0, 'transparent');
            lineGrad.addColorStop(0.5, '#fbbf24');
            lineGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = lineGrad;
            ctx.fillRect(centerX - lineW / 2, centerY + H * 0.04, lineW, 3);

            /* Text */
            const textEase = Math.min(1, Math.max(0, (time - 0.3) / 0.4));
            const textT = 1 - Math.pow(1 - textEase, 3);
            ctx.font = `700 ${Math.round(W * 0.045)}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = opacity * textT;
            ctx.textAlign = 'center';
            const textY = centerY + H * 0.1 + (1 - textT) * 30;
            wrapText(ctx, rest.toUpperCase(), centerX, textY, W * 0.8, W * 0.055);

            /* Badge */
            ctx.font = `600 ${Math.round(W * 0.02)}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = 'rgba(251,191,36,0.5)';
            ctx.globalAlpha = opacity * Math.min(1, Math.max(0, (time - 0.8) / 0.3));
            ctx.fillText('▶ WATCH TO LEARN', centerX, H * 0.9);
            break;
        }

        case 'curiosity_gap': {
            /* Background question mark */
            ctx.font = `900 ${Math.round(W * 0.4)}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = 'rgba(0,243,255,0.06)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', W * 0.75, H * 0.25);

            /* Word-by-word reveal */
            const words = hook.text.split(' ');
            ctx.font = `700 ${Math.round(W * 0.06)}px Inter, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';

            /* Layout words in wrapped lines */
            const fontSize = Math.round(W * 0.06);
            const lineHeight = fontSize * 1.4;
            const maxW = W * 0.85;
            let lines: string[] = [];
            let currentLine = '';
            for (const word of words) {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                if (ctx.measureText(testLine).width > maxW && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);

            const totalH = lines.length * lineHeight;
            const startY = centerY - totalH / 2 + lineHeight / 2;

            let wordIdx = 0;
            for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                const lineWords = lines[lineIdx].split(' ');
                for (const lw of lineWords) {
                    const wordDelay = 0.15 + wordIdx * 0.1;
                    const wordProgress = Math.min(1, Math.max(0, (time - wordDelay) / 0.3));
                    ctx.globalAlpha = opacity * wordProgress;
                    wordIdx++;
                }
                ctx.globalAlpha = opacity * Math.min(1, Math.max(0, (time - 0.15) / 0.5));
                ctx.fillText(lines[lineIdx], centerX, startY + lineIdx * lineHeight);
            }
            break;
        }

        case 'bold_claim': {
            /* Red flash (first 0.3s) */
            if (time < 0.3) {
                ctx.fillStyle = `rgba(255,0,85,${0.5 * (1 - time / 0.3)})`;
                ctx.fillRect(0, 0, W, H);
            }

            /* Text slam */
            const slamT = Math.min(1, Math.max(0, (time - 0.1) / 0.4));
            const slamEase = 1 - Math.pow(1 - slamT, 3);
            const scale = slamT < 1 ? 2.5 - 1.5 * slamEase : 1;

            ctx.save();
            ctx.translate(centerX, centerY - H * 0.05);
            ctx.scale(scale, scale);
            ctx.font = `900 ${Math.round(W * 0.065)}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(255,0,85,0.4)';
            ctx.shadowBlur = 40;
            ctx.globalAlpha = opacity * slamEase;
            wrapText(ctx, hook.text.toUpperCase(), 0, 0, W * 0.85 / scale, W * 0.075 / scale);
            ctx.restore();
            ctx.shadowBlur = 0;

            /* Danger line */
            const lineProgress = Math.min(1, Math.max(0, (time - 0.5) / 0.4));
            const dLineW = W * 0.7 * lineProgress;
            const lg = ctx.createLinearGradient(centerX - dLineW / 2, 0, centerX + dLineW / 2, 0);
            lg.addColorStop(0, 'transparent');
            lg.addColorStop(0.3, '#ff0055');
            lg.addColorStop(0.7, '#ff4400');
            lg.addColorStop(1, 'transparent');
            ctx.fillStyle = lg;
            ctx.globalAlpha = opacity * lineProgress;
            ctx.fillRect(centerX - dLineW / 2, centerY + H * 0.1, dLineW, 4);

            /* Badge */
            ctx.font = `700 ${Math.round(W * 0.02)}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = 'rgba(255,0,85,0.6)';
            ctx.textAlign = 'center';
            ctx.globalAlpha = opacity * Math.min(1, Math.max(0, (time - 0.7) / 0.3));
            ctx.fillText('⚠ STOP SCROLLING', centerX, H * 0.9);
            break;
        }

        case 'pain_point': {
            /* Emoji */
            ctx.font = `${Math.round(W * 0.18)}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = opacity * ease;
            ctx.fillText('🎯', centerX, centerY - H * 0.12);

            /* Text */
            const textT2 = Math.min(1, Math.max(0, (time - 0.3) / 0.5));
            const textEase2 = 1 - Math.pow(1 - textT2, 3);
            ctx.font = `600 ${Math.round(W * 0.05)}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.globalAlpha = opacity * textEase2;
            const tY = centerY + H * 0.05 + (1 - textEase2) * 20;
            wrapText(ctx, hook.text, centerX, tY, W * 0.8, W * 0.06);

            /* Golden line */
            const lP = Math.min(1, Math.max(0, (time - 0.6) / 0.4));
            const glW = W * 0.4 * lP;
            const glg = ctx.createLinearGradient(centerX - glW / 2, 0, centerX + glW / 2, 0);
            glg.addColorStop(0, 'transparent');
            glg.addColorStop(0.5, '#fbbf24');
            glg.addColorStop(1, 'transparent');
            ctx.fillStyle = glg;
            ctx.globalAlpha = opacity * lP;
            ctx.fillRect(centerX - glW / 2, centerY + H * 0.14, glW, 2);

            /* CTA */
            ctx.font = `600 ${Math.round(W * 0.025)}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.globalAlpha = opacity * Math.min(1, Math.max(0, (time - 0.9) / 0.3));
            ctx.fillText("Here's the fix ↓", centerX, centerY + H * 0.2);
            break;
        }
    }

    ctx.restore();
}

/* Helper: wrap text on canvas */
function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
) {
    const words = text.split(' ');
    let line = '';
    const lines: string[] = [];
    for (const word of words) {
        const testLine = line ? line + ' ' + word : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);
    const totalH = lines.length * lineHeight;
    const startY = y - totalH / 2 + lineHeight / 2;
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, startY + i * lineHeight);
    }
}

export const ExportModal: React.FC<ExportModalProps> = ({
    isOpen, onClose, videoFile, htmlContent, bgMusicFile, bgMusicVolume = 0.2, duration = 10, srtData, layoutConfig = [], captionStyleId = DEFAULT_STYLE_ID, activeHook = null
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

            // Pre-compute hook frame range to avoid per-frame checks
            const hookEndFrame = activeHook ? Math.ceil(activeHook.duration * FPS) : -1;
            const hookFadeFrame = activeHook ? Math.ceil((activeHook.duration - 0.5) * FPS) : -1;

            // === RENDER LOOP ===
            for (let i = 0; i < totalFrames; i++) {
                const time = clipStart + i / FPS;
                const isHookFrame = activeHook && i < hookEndFrame;

                // 1. Determine current layout
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

                // 2. Calculate dimensions
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

                // 3. Resize overlay window if HTML height changed (skip during hook — not needed)
                const roundedHtmlH = Math.round(htmlH);
                if (!isHookFrame && roundedHtmlH !== lastOverlayHeight && roundedHtmlH > 0) {
                    await electron.resizeOverlayWindow({ width: WIDTH, height: roundedHtmlH });
                    lastOverlayHeight = roundedHtmlH;
                }

                // 4. PARALLEL: Seek video + Capture overlay
                //    OPTIMIZATION: During hook frames, the hook is a full-screen opaque overlay,
                //    so we skip BOTH the expensive overlay capture AND video seek entirely.
                //    This saves ~50-150ms per frame for the first 90-240 frames.
                let overlayBitmap: ImageBitmap | null = null;

                if (!isHookFrame) {
                    const seekPromise = new Promise<void>(resolve => {
                        video.currentTime = time;
                        const onSeeked = () => {
                            video.removeEventListener('seeked', onSeeked);
                            resolve();
                        };
                        video.addEventListener('seeked', onSeeked);
                        queueMicrotask(() => {
                            if (!video.seeking) {
                                video.removeEventListener('seeked', onSeeked);
                                resolve();
                            }
                        });
                    });

                    const overlayPromise = (htmlH > 0)
                        ? electron.captureOverlayFrame({ time }).then(async (result) => {
                            if (result.success && result.buffer) {
                                const blob = new Blob([result.buffer], { type: 'image/jpeg' });
                                overlayBitmap = await createImageBitmap(blob);
                            }
                        }).catch((e: any) => console.error("Overlay capture error:", e))
                        : Promise.resolve();

                    await Promise.all([seekPromise, overlayPromise]);
                }

                // 5. Clear canvas
                ctx.clearRect(0, 0, WIDTH, HEIGHT);
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);

                // 6. DRAW VIDEO (skip during hook — fully covered)
                if (videoH > 0 && !isHookFrame) {
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

                // 7. DRAW HTML OVERLAY (skip during hook — fully covered)
                if (overlayBitmap) {
                    ctx.drawImage(overlayBitmap, 0, 0, WIDTH, roundedHtmlH);
                    overlayBitmap.close();
                }

                // 8. DRAW HOOK OVERLAY
                if (isHookFrame && activeHook) {
                    const hookOpacity = i > hookFadeFrame
                        ? Math.max(0, 1 - (time - (activeHook.duration - 0.5)) / 0.5)
                        : 1;
                    renderHookOnCanvas(ctx, activeHook, WIDTH, HEIGHT, hookOpacity, time);
                }

                // 9. DRAW SUBTITLES (skip during hook)
                if (srtData?.length && !isHookFrame) {
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

                        renderExportCaption({
                            ctx,
                            styleId: captionStyleId,
                            words: visibleWords,
                            activeIndex: globalActiveIdx,
                            startWordIndex: startWordIdx,
                            canvasWidth: WIDTH,
                            canvasHeight: HEIGHT,
                            subY,
                            isFullHtml,
                        });
                    }
                }

                // 10. Send frame to FFmpeg
                // Hook frames are flat graphics — use lower quality for faster encoding
                const jpegQuality = isHookFrame ? 0.6 : 0.82;
                const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', jpegQuality));
                if (blob) await electron.writeFrame(await blob.arrayBuffer());

                // Throttle UI updates to every 15 frames for max render speed
                if (i % 15 === 0 || i === totalFrames - 1) {
                    setProgress(Math.round((i / totalFrames) * 100));
                    setLogText(`Rendering: ${i + 1}/${totalFrames}`);
                }
                if (i % 60 === 0) await new Promise(r => setTimeout(r, 0));
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
