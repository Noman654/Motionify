
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { toCanvas } from 'html-to-image';
import { X, CheckCircle, AlertCircle, Loader2, Zap, FileCode } from 'lucide-react';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoFile: File | null;
    htmlContent: string;
    bgMusicFile?: File | null;
    bgMusicVolume?: number;
    duration?: number;
    srtData?: any[];
    layoutConfig?: any[];
}

// --- HIDDEN SUBTITLE RENDERER (Exact Clone of ReelPlayer Logic) ---
// --- HIDDEN SUBTITLE RENDERER (Exact Clone of ReelPlayer Logic) ---
const SubtitleRenderer = ({ currentTime, srtData, layoutConfig }: { currentTime: number, srtData: any[], layoutConfig?: any[] }) => {
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
        setIsNative(!!(window as any).electron);
        const electron = (window as any).electron;
        if (electron && electron.onProgress) {
            electron.onProgress((data: any) => {
                if (data.phase === 'merging') {
                    setProgress(Math.round(data.percent || 0));
                    setLogText(`Merging Audio: ${Math.round(data.percent || 0)}%`);
                }
            });
        }
    }, []);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const startNativeRender = async () => {
        console.log("Start Native Render Clicked"); // DEBUG LOG

        if (!videoFile) {
            console.error("No video file provided");
            setLogText("Error: No video file found.");
            setStatus('error');
            return;
        }
        if (!isNative) {
            console.error("Not in Electron environment");
            return;
        }

        const electron = (window as any).electron;

        setStatus('rendering');
        setProgress(0);
        setLogText('Initializing...');

        try {
            const savePath = await electron.saveDialog('MyReel.mp4');
            console.log("Selected save path:", savePath); // DEBUG LOG
            if (!savePath) { setStatus('idle'); return; }

            // Save Assets
            const videoBuffer = await videoFile.arrayBuffer();
            const tempVideoPath = await electron.saveTempFile({ buffer: videoBuffer, extension: 'mp4' });

            let tempBgMusicPath = null;
            if (bgMusicFile) {
                const bgBuffer = await bgMusicFile.arrayBuffer();
                tempBgMusicPath = await electron.saveTempFile({ buffer: bgBuffer, extension: 'mp3' });
            }

            // Start FFmpeg
            const WIDTH = 1080;
            const HEIGHT = 1920;
            const FPS = 30;
            await electron.startRender({ width: WIDTH, height: HEIGHT, fps: FPS });

            // Prepare Video
            const videoUrl = URL.createObjectURL(videoFile);
            const video = videoRef.current!;
            video.src = videoUrl;
            video.load();
            await new Promise<void>(r => { video.onloadeddata = () => r(); });
            video.currentTime = 0;
            await new Promise(r => setTimeout(r, 100));

            // Prepare Iframe for capture
            const iframe = iframeRef.current!;
            // Wait for iframe content to fully load including external resources
            await new Promise(r => setTimeout(r, 1500));

            const canvas = canvasRef.current!;
            canvas.width = WIDTH;
            canvas.height = HEIGHT;
            const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

            // RENDER LOOP
            // DEBUG: Cap at 10 seconds for faster testing & to avoid OOM
            const DEBUG_DURATION = 10;
            const effectiveDuration = Math.min(duration, DEBUG_DURATION);
            const totalFrames = Math.ceil(effectiveDuration * FPS);

            for (let i = 0; i < totalFrames; i++) {
                const time = i / FPS;

                // 1. Sync React State (Subtitles)
                setExportTime(time);

                // --- Determine Current Layout ---
                // Helper to find layout (mirrors ReelPlayer logic)
                let currentLayout = layoutConfig.find(step => time >= step.startTime && time < step.endTime);
                if (!currentLayout && layoutConfig.length > 0) {
                    // Check if past last step
                    if (time >= layoutConfig[layoutConfig.length - 1].endTime) {
                        currentLayout = layoutConfig[layoutConfig.length - 1];
                    }
                }
                // Default fallback
                if (!currentLayout) {
                    currentLayout = { layoutMode: 'split', splitRatio: 0.5, startTime: 0, endTime: 9999 };
                }

                const { layoutMode, splitRatio = 0.5 } = currentLayout;

                // Calculate Dimensions
                let htmlH = HEIGHT * 0.5; // Default 50%
                let videoH = HEIGHT * 0.5;
                let videoY = HEIGHT * 0.5;
                let htmlY = 0; // html always top? verify ReelPlayer logic.
                // ReelPlayer: htmlContainer top:0. videoContainer bottom:0.

                if (layoutMode === 'full-video') {
                    htmlH = 0; videoH = HEIGHT; videoY = 0;
                } else if (layoutMode === 'full-html') {
                    htmlH = HEIGHT; videoH = 0; videoY = HEIGHT; // Video hidden offscreen/zero
                } else if (layoutMode === 'split') {
                    htmlH = HEIGHT * splitRatio;
                    videoH = HEIGHT * (1 - splitRatio);
                    videoY = htmlH; // Video starts where HTML ends
                }

                // Resize Hidden Iframe Container
                const iframeContainer = document.getElementById('hidden-iframe-container');
                if (iframeContainer) {
                    iframeContainer.style.height = `${htmlH}px`;
                }

                // 2. Sync Video
                video.currentTime = time;
                // 3. Sync Iframe
                iframe.contentWindow?.postMessage({ type: 'timeupdate', time }, '*');

                // Wait for all updates
                await new Promise(r => setTimeout(r, 50));

                // STRICT SEEK WAIT
                if (video.seeking) {
                    await new Promise<void>(r => {
                        const h = () => { video.removeEventListener('seeked', h); r(); };
                        video.addEventListener('seeked', h);
                    });
                }

                // CLEAR CANVAS
                ctx.clearRect(0, 0, WIDTH, HEIGHT);
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);

                // DRAW 1: Video (if visible)
                if (videoH > 0) {
                    const vidRatio = video.videoWidth / video.videoHeight;
                    // Target area is WIDTH x videoH
                    const targetRatio = WIDTH / videoH;

                    let drawW = WIDTH, drawH = videoH, dx = 0, dy = videoY; // dy starts at videoY

                    if (vidRatio > targetRatio) {
                        // Video is wider than target area -> Crop sides, fit height
                        drawH = videoH;
                        drawW = videoH * vidRatio;
                        dx = (WIDTH - drawW) / 2;
                    } else {
                        // Video is taller -> Crop top/bottom, fit width
                        drawW = WIDTH;
                        drawH = WIDTH / vidRatio;
                        dy = videoY + (videoH - drawH) / 2;
                    }

                    // Clip to video region to prevent overflow drawing
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0, videoY, WIDTH, videoH);
                    ctx.clip();
                    ctx.drawImage(video, dx, dy, drawW, drawH);
                    ctx.restore();
                }

                // DRAW 2: Iframe Overlay (using html-to-image)
                if (htmlH > 0) {
                    try {
                        if (iframe.contentDocument) {
                            // Force Transparency on body
                            iframe.contentDocument.body.style.backgroundColor = 'transparent';
                            iframe.contentDocument.documentElement.style.backgroundColor = 'transparent';

                            // Wait a tiny bit for any dynamic content
                            await new Promise(r => setTimeout(r, 50));

                            const HTML_SCALE = 2; // High quality for icons/SVGs
                            const overlay = await toCanvas(iframe.contentDocument.documentElement, {
                                width: WIDTH,
                                height: htmlH,
                                skipAutoScale: true,
                                pixelRatio: HTML_SCALE,
                                backgroundColor: null,
                                cacheBust: true
                            } as any);

                            // Draw scaled back down to fit 1080p canvas
                            ctx.drawImage(overlay, 0, 0, WIDTH, htmlH);
                        }
                    } catch (e) {
                        console.error("Overlay capture error:", e);
                    }
                }

                // DRAW 3: Subtitles
                const subTarget = document.getElementById('hidden-subtitle-render-target');
                if (subTarget && srtData?.length) {
                    try {
                        const SUB_SCALE = 2; // High quality text capture
                        const subImg = await toCanvas(subTarget, {
                            backgroundColor: null as any,
                            skipAutoScale: true,
                            pixelRatio: SUB_SCALE
                        });

                        // Calculate Subtitle Y based on Layout
                        // Default fallback
                        let subY = HEIGHT * 0.82;

                        if (layoutMode === 'split') {
                            // On the split line
                            subY = (HEIGHT * splitRatio) - (subImg.height / SUB_SCALE / 2);
                        } else if (layoutMode === 'full-video') {
                            subY = HEIGHT * 0.8;
                        } else if (layoutMode === 'full-html') {
                            subY = HEIGHT * 0.8;
                        }

                        // Original CSS Width was 900px
                        const desiredWidth = 900;
                        const desiredHeight = subImg.height / SUB_SCALE;

                        const subX = (WIDTH - desiredWidth) / 2;

                        // Draw scaled back down to fit 1080p canvas
                        ctx.drawImage(subImg, subX, subY, desiredWidth, desiredHeight);
                    } catch (e) { }
                }

                // Send Frame
                const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.90));
                if (blob) await electron.writeFrame(await blob.arrayBuffer());

                setProgress(Math.round((i / totalFrames) * 100));
                setLogText(`Rendering: ${i + 1}/${totalFrames}`);
                if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
            }

            // Finish
            setStatus('merging');
            await electron.endRender({
                originalVideoPath: tempVideoPath,
                bgMusicPath: tempBgMusicPath,
                bgMusicVolume: bgMusicVolume,
                outputPath: savePath
            });

            setStatus('done');
            setOutputPath(savePath);
            URL.revokeObjectURL(videoUrl);

        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setLogText('Error: ' + e.message);
        }
    };

    const startHtmlExport = async () => {
        if (!isNative) return;

        setStatus('rendering');
        setLogText('Inlining external resources...');
        setProgress(100); // Indeterminate or just full for HTML

        try {
            const electron = (window as any).electron;
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
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl p-6">

                {/* Hidden Render Elements */}
                <div className="fixed -left-[9999px] top-0" style={{ opacity: 1 }}>
                    <canvas ref={canvasRef} />
                    <video ref={videoRef} muted playsInline />
                    <div id="hidden-iframe-container" style={{ width: '1080px', height: '1920px' }}>
                        <iframe ref={iframeRef} srcDoc={htmlContent} style={{ width: '100%', height: '100%', border: 'none' }} />
                    </div>
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
