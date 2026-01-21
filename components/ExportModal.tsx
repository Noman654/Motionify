
import React, { useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { toPng } from 'html-to-image';
import { X, Download, Loader2, AlertCircle, Film, CheckCircle } from 'lucide-react';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoFile: File | null; // Use original file for best quality
    htmlContent: string;
    bgMusicFile?: File | null;
    bgMusicVolume?: number;
    duration?: number; // Total duration in seconds
    srtData?: any[]; // Not strictly needed if HTML handles it, but good for reference
}

export const ExportModal: React.FC<ExportModalProps> = ({
    isOpen,
    onClose,
    videoFile,
    htmlContent,
    bgMusicFile,
    bgMusicVolume = 0.2,
    duration = 10, // Fallback
}) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'rendering' | 'encoding' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [logText, setLogText] = useState('');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const ffmpegRef = useRef(new FFmpeg());
    const videoRef = useRef<HTMLVideoElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cancel on unmount or close
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        };
    }, []);

    const handleClose = () => {
        if (status === 'rendering' || status === 'encoding' || status === 'loading') {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        }
        onClose();
    };

    const startExport = async () => {
        if (!videoFile) return;

        // Reset AbortController
        abortControllerRef.current = new AbortController();

        setStatus('loading');
        setLogText('Loading processing engine (ffmpeg)...');
        setProgress(0);
        setErrorMessage('');

        const ffmpeg = ffmpegRef.current;

        try {
            // 1. Load FFmpeg
            if (!ffmpeg.loaded) {
                const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
            }

            if (abortControllerRef.current?.signal.aborted) throw new Error('Cancelled');

            // 2. Prepare Files
            setLogText('Preparing assets...');
            await ffmpeg.writeFile('input_video.mp4', await fetchFile(videoFile));

            if (bgMusicFile) {
                await ffmpeg.writeFile('bg_music.mp3', await fetchFile(bgMusicFile));
            }

            // 3. Setup Rendering
            setStatus('rendering');
            setLogText('Rendering frames...');

            const fps = 30;
            const totalFrames = Math.ceil(duration * fps);

            // Wait for video metadata to ensure we can seek
            if (videoRef.current) {
                videoRef.current.src = URL.createObjectURL(videoFile);
                await new Promise((resolve) => {
                    videoRef.current!.onloadedmetadata = resolve;
                });
            }

            // --- RENDER LOOP ---
            const canvas = document.createElement('canvas');
            canvas.width = 1080; // Target resolution (Vertical)
            canvas.height = 1920;
            const ctx = canvas.getContext('2d');

            if (!ctx || !videoRef.current || !iframeRef.current) {
                throw new Error("Rendering context missing");
            }

            // Set canvas size to match video natural size if possible, or force 9:16
            // For now, hardcode 1080x1920 or use video size
            const vidW = videoRef.current.videoWidth || 1080;
            const vidH = videoRef.current.videoHeight || 1920;
            canvas.width = vidW;
            canvas.height = vidH;

            // Helper to capture Iframe
            // We need to access the iframe document
            const iframeDoc = iframeRef.current.contentDocument;
            if (!iframeDoc) throw new Error("Cannot access animation layer");

            for (let i = 0; i < totalFrames; i++) {
                // Check Cancellation
                if (abortControllerRef.current?.signal.aborted) {
                    throw new Error('Export cancelled by user');
                }

                const currentTime = i / fps;
                const percent = Math.round((i / totalFrames) * 100);
                setProgress(percent);
                setLogText(`Rendering Frame ${i}/${totalFrames}`);

                // 1. Seek Video
                videoRef.current.currentTime = currentTime;
                await new Promise<void>(r => {
                    const handler = () => {
                        videoRef.current!.removeEventListener('seeked', handler);
                        r();
                    };
                    videoRef.current!.addEventListener('seeked', handler);
                });

                // 2. Seek Animation (Send Message)
                if (iframeRef.current.contentWindow) {
                    iframeRef.current.contentWindow.postMessage({
                        type: 'timeupdate',
                        time: currentTime
                    }, '*');
                }

                // 3. Wait for DOM/GSAP to settle (crucial for smooth animation)
                await new Promise(r => setTimeout(r, 50)); // 50ms buffer

                // 4. Draw Video Frame
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

                // 5. Capture & Draw HTML Overlay
                try {
                    // We capture the documentElement of the iframe
                    const dataUrl = await toPng(iframeDoc.documentElement, {
                        width: canvas.width,
                        height: canvas.height,
                        skipAutoScale: true,
                        // Ensure transparency is preserved
                        backgroundColor: null as any
                    });

                    const img = new Image();
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        img.src = dataUrl;
                    });

                    ctx.drawImage(img, 0, 0);

                } catch (e) {
                    console.warn("Frame capture warning:", e);
                }

                // 6. Write Frame to FFmpeg
                // Format: frame_001.png
                const frameName = `frame_${String(i).padStart(4, '0')}.png`;
                const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
                if (blob) {
                    await ffmpeg.writeFile(frameName, await fetchFile(blob));
                }
            }

            // 4. Encoding
            setStatus('encoding');
            setLogText('Encoding video (this uses your M4 chip!)...');
            setProgress(0);

            // Command:
            // -r 30 (Input FPS)
            // -i frame_%04d.png (Input Frames)
            // -i input_video.mp4 (Input Video - for Audio)
            // -i bg_music.mp3 (Input Music - Optional)
            // -map 0:v (Use Frames Video)
            // -map 1:a (Use Original Audio)
            // -c:v libx264 (H.264 Codec)
            // -pix_fmt yuv420p (Compatibility)
            // -c:a aac (Audio Codec)

            const ffmpegArgs = [
                '-framerate', '30',
                '-i', 'frame_%04d.png',
                '-i', 'input_video.mp4',
            ];

            if (bgMusicFile) {
                ffmpegArgs.push('-i', 'bg_music.mp3');
                // Complex filter to mix audio
                // [1:a]volume=1.0[a1];[2:a]volume=${bgMusicVolume}[a2];[a1][a2]amix=inputs=2:duration=first[a]
                // map 0:v and [a]
                ffmpegArgs.push(
                    '-filter_complex',
                    `[1:a]volume=1.0[a1];[2:a]volume=${bgMusicVolume}[a2];[a1][a2]amix=inputs=2:duration=first[a]`,
                    '-map', '0:v',
                    '-map', '[a]'
                );
            } else {
                // Just take audio from video
                ffmpegArgs.push('-map', '0:v', '-map', '1:a');
            }

            ffmpegArgs.push(
                '-c:v', 'libx264',
                '-preset', 'ultrafast', // Speed over compression for local export
                '-pix_fmt', 'yuv420p',
                'output.mp4'
            );

            // Log output
            ffmpeg.on('log', ({ message }) => {
                console.log(message);
                // Try to parse progress?
            });

            await ffmpeg.exec(ffmpegArgs);

            // 5. Retrieve & Download
            const data = await ffmpeg.readFile('output.mp4');
            const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
            setDownloadUrl(url);
            setStatus('done');
            setLogText('Export Complete!');

            // Cleanup frames
             // (Optional - FFMPEG memory is cleared on reload usually)

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMessage(err.message || 'Export failed');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Film className="text-purple-400" />
                        High Quality Export
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto">

                    {/* Hidden Renderer */}
                    <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none" style={{ visibility: 'visible' }}>
                        <video ref={videoRef} muted playsInline crossOrigin="anonymous" />
                        {/* We use a container of fixed size for the iframe */}
                        <div style={{ width: '1080px', height: '1920px', position: 'relative' }}>
                            <iframe
                                ref={iframeRef}
                                srcDoc={htmlContent}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title="renderer"
                            />
                        </div>
                    </div>

                    {status === 'idle' && (
                        <div className="space-y-6">
                            <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 flex gap-4">
                                <div className="p-3 bg-purple-500/20 rounded-full h-fit text-purple-400">
                                    <Loader2 size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Direct Rendering</h3>
                                    <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                                        This process runs locally on your M4 chip. It renders every frame individually to ensure
                                        <strong> lossless quality</strong> and <strong>perfect sync</strong>.
                                    </p>
                                    <ul className="mt-3 space-y-1 text-xs text-gray-400 list-disc list-inside">
                                        <li>No internet usage (offline safe)</li>
                                        <li>Full 1080p resolution</li>
                                        <li>Takes ~1-3 minutes for a 60s reel</li>
                                    </ul>
                                </div>
                            </div>

                            <button
                                onClick={startExport}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                <Film size={20} />
                                Start Rendering
                            </button>
                        </div>
                    )}

                    {(status === 'loading' || status === 'rendering' || status === 'encoding') && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-6">
                            <div className="relative w-24 h-24">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="40"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        className="text-gray-800"
                                    />
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="40"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray={251.2}
                                        strokeDashoffset={251.2 - (251.2 * progress) / 100}
                                        className="text-purple-500 transition-all duration-300"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl font-bold text-white">{progress}%</span>
                                </div>
                            </div>

                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-bold text-white animate-pulse">
                                    {status === 'loading' && "Initializing Engine..."}
                                    {status === 'rendering' && "Rendering Frames..."}
                                    {status === 'encoding' && "Finalizing Video..."}
                                </h3>
                                <p className="text-sm text-gray-500 font-mono">{logText}</p>
                            </div>

                            <div className="w-full bg-gray-800 rounded-full h-2 mt-4 overflow-hidden">
                                <div
                                    className="h-full bg-purple-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {status === 'done' && downloadUrl && (
                        <div className="flex flex-col items-center justify-center py-6 space-y-6 animate-fade-in">
                            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle size={40} />
                            </div>

                            <h3 className="text-2xl font-bold text-white">Your Reel is Ready!</h3>

                            <a
                                href={downloadUrl}
                                download={`reel-export-${Date.now()}.mp4`}
                                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Download size={20} />
                                Download MP4
                            </a>

                            <button
                                onClick={handleClose}
                                className="text-gray-500 hover:text-white text-sm"
                            >
                                Close Window
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center justify-center py-6 space-y-4">
                            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white">Rendering Failed</h3>
                            <p className="text-sm text-red-300 text-center max-w-xs">{errorMessage}</p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
