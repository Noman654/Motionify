import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LayoutConfigStep, SRTItem, MediaAsset } from '../types';
import { Play, Pause, RefreshCw, Maximize, Minimize, Video, StopCircle, X, AlertTriangle, Monitor, Download } from 'lucide-react';
import { ExportModal } from './ExportModal';

interface ReelPlayerProps {
  videoUrl: string;
  videoFile?: File | null;
  srtData: SRTItem[];
  htmlContent: string;
  layoutConfig: LayoutConfigStep[];
  fullScreenMode: boolean;
  toggleFullScreen: () => void;
  bgMusicUrl?: string;
  bgMusicFile?: File | null;
  bgMusicVolume?: number;
  assets?: MediaAsset[];
  onTimeUpdate?: (time: number) => void;
  onDurationLoad?: (duration: number) => void;
  externalSeekTime?: number | null;
}

export const ReelPlayer: React.FC<ReelPlayerProps> = ({
  videoUrl,
  videoFile,
  srtData,
  htmlContent,
  layoutConfig,
  fullScreenMode,
  toggleFullScreen,
  bgMusicUrl,
  bgMusicFile,
  bgMusicVolume = 0.2,
  assets = [],
  onTimeUpdate,
  onDurationLoad,
  externalSeekTime
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showExportInfo, setShowExportInfo] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Key to force re-render iframe on restart
  const [iframeKey, setIframeKey] = useState(0);

  // --- Computed State based on Time ---
  const currentLayout = useMemo(() => {
    // 1. Try to find the specific layout step for the current time
    const match = layoutConfig.find(step => currentTime >= step.startTime && currentTime < step.endTime);
    if (match) return match;

    // 2. If no match, check if we are past the last step (keep the final state)
    if (layoutConfig.length > 0) {
      const lastStep = layoutConfig[layoutConfig.length - 1];
      if (currentTime >= lastStep.endTime) {
        return lastStep;
      }
    }

    // 3. Fallback default
    return layoutConfig[0] || {
      layoutMode: 'split',
      splitRatio: 0.5,
      captionPosition: 'center',
      startTime: 0,
      endTime: 9999
    };
  }, [currentTime, layoutConfig]);

  const currentCaption = useMemo(() => {
    return srtData.find(item => currentTime >= item.startTime && currentTime <= item.endTime);
  }, [currentTime, srtData]);

  // --- Styles calculation ---
  const getLayoutStyles = () => {
    const { layoutMode, splitRatio = 0.5 } = currentLayout;

    let htmlHeight = '50%';
    let videoHeight = '50%';
    let htmlZIndex = 10;
    let videoZIndex = 10;

    if (layoutMode === 'full-video') {
      htmlHeight = '0%';
      videoHeight = '100%';
      htmlZIndex = 0;
    } else if (layoutMode === 'full-html') {
      htmlHeight = '100%';
      videoHeight = '0%';
      videoZIndex = 0;
    } else if (layoutMode === 'split') {
      htmlHeight = `${splitRatio * 100}%`;
      videoHeight = `${(1 - splitRatio) * 100}%`;
    }

    // Smooth transition style
    const transition = 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)';

    return {
      htmlContainer: { height: htmlHeight, transition, zIndex: htmlZIndex },
      videoContainer: { height: videoHeight, transition, zIndex: videoZIndex },
    };
  };

  const getCaptionStyle = () => {
    const { layoutMode, splitRatio = 0.5, captionPosition } = currentLayout;

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      display: 'flex',
      justifyContent: 'center',
      textAlign: 'center',
      pointerEvents: 'none',
      zIndex: 50, // Ensure high Z-index
      transition: 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    if (captionPosition === 'hidden') {
      return { ...baseStyle, display: 'none' };
    }

    if (layoutMode === 'split') {
      // In split mode, position the caption exactly on the dividing line
      return { ...baseStyle, top: `${splitRatio * 100}%` };
    }

    // Full screen modes fallback
    switch (captionPosition) {
      case 'top': return { ...baseStyle, top: '15%' };
      case 'center': return { ...baseStyle, top: '50%' };
      case 'bottom':
      default: return { ...baseStyle, top: '80%' };
    }
  };

  const layoutStyles = getLayoutStyles();
  const captionStyle = getCaptionStyle();
  const isFullHtml = currentLayout.layoutMode === 'full-html';

  // --- Word-by-Word Animation Logic (With Chunking) ---
  const renderAnimatedCaption = () => {
    if (!currentCaption) return null;

    const WORDS_PER_VIEW = 5; // Max words to show at once

    // Split full text into words
    const allWords = currentCaption.text.split(' ');

    // Calculate progress through the current segment (0 to 1)
    const duration = currentCaption.endTime - currentCaption.startTime;
    const elapsed = currentTime - currentCaption.startTime;
    const progress = Math.max(0, Math.min(1, elapsed / duration));

    // Determine which word is currently being spoken (Global Index)
    const globalActiveIndex = Math.floor(progress * allWords.length);

    // Determine which "Page" (Chunk) of words we are on
    const currentChunkIndex = Math.floor(globalActiveIndex / WORDS_PER_VIEW);

    // Slice the array to get only the current chunk
    const startWordIndex = currentChunkIndex * WORDS_PER_VIEW;
    const endWordIndex = startWordIndex + WORDS_PER_VIEW;
    const visibleWords = allWords.slice(startWordIndex, endWordIndex);

    return (
      <div
        className={`flex flex-wrap justify-center items-center gap-x-1.5 gap-y-1 px-4 py-2 rounded-2xl transition-all duration-300 ${isFullHtml ? 'bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl' : ''}`}
        style={{ minHeight: '60px' }} // STABILITY: Prevent layout shifts
      >
        {visibleWords.map((word, index) => {
          // Calculate the true index of this word in the original full sentence
          const trueIndex = startWordIndex + index;

          const isActive = trueIndex === globalActiveIndex;
          const isPast = trueIndex < globalActiveIndex;

          return (
            <span
              key={`${currentCaption.id}-${trueIndex}`}
              className={`
                transition-all duration-150 inline-block text-2xl md:text-2xl font-black tracking-wide leading-tight
                ${isActive ? 'text-yellow-400 scale-110' : ''}
                ${isPast ? 'text-white' : 'text-white/40'}
              `}
              style={{
                textShadow: isActive
                  ? '0 0 30px rgba(250, 204, 21, 0.6), 2px 2px 0px rgba(0,0,0,1)'
                  : '2px 2px 0px rgba(0,0,0,0.8)'
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  };

  // --- Messaging Helper ---
  const postMessageToIframe = (message: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  };

  // --- Iframe Load Handler ---
  const handleIframeLoad = () => {
    if (videoRef.current) {
      postMessageToIframe({
        type: 'timeupdate',
        time: videoRef.current.currentTime
      });

      if (!videoRef.current.paused) {
        postMessageToIframe({ type: 'play' });
      }
    }
  };

  // --- Background Music Management ---

  // 1. Handle Volume Changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = bgMusicVolume;
    }
  }, [bgMusicVolume]);

  // 2. Handle Source Changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      if (bgMusicUrl) {
        // Load new source
        audio.src = bgMusicUrl;
        audio.load();
        audio.volume = bgMusicVolume; // Ensure volume is set immediately

        // Sync to video immediately
        if (videoRef.current) {
          audio.currentTime = videoRef.current.currentTime;
          if (!videoRef.current.paused) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.warn("Auto-play prevented (Audio):", error);
              });
            }
          }
        }
      } else {
        // Clear source if removed
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
    }
  }, [bgMusicUrl]);


  // --- Sync Logic (High Frequency Loop) ---
  useEffect(() => {
    let animationFrameId: number;

    const syncLoop = () => {
      const video = videoRef.current;
      if (video && !video.paused) {
        const time = video.currentTime;
        setCurrentTime(time);

        postMessageToIframe({ type: 'timeupdate', time });

        // Sync Audio logic
        if (audioRef.current && bgMusicUrl && !audioRef.current.paused) {
          const drift = Math.abs(audioRef.current.currentTime - time);
          // Tighten drift tolerance and sync
          if (drift > 0.2) {
            audioRef.current.currentTime = time;
          }
        }
        // Force play if video is playing but audio isn't (and audio exists)
        else if (audioRef.current && bgMusicUrl && audioRef.current.paused && video.readyState >= 3) {
          audioRef.current.currentTime = time;
          audioRef.current.play().catch(() => { });
        }

        if (onTimeUpdate) {
          onTimeUpdate(time);
        }
      }
      animationFrameId = requestAnimationFrame(syncLoop);
    };

    animationFrameId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [onTimeUpdate, bgMusicUrl]);

  // --- Event Listeners for State ---
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      postMessageToIframe({ type: 'play' });
      if (audio && audio.src) audio.play().catch(() => { });
    };

    const handlePause = () => {
      setIsPlaying(false);
      postMessageToIframe({ type: 'pause' });
      if (audio) audio.pause();
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (onDurationLoad) onDurationLoad(video.duration);
      postMessageToIframe({ type: 'timeupdate', time: video.currentTime });
    };

    const handleEnded = () => {
      setIsPlaying(false);
      postMessageToIframe({ type: 'pause' });
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    };

    const handleTimeUpdate = () => {
      if (video.paused) {
        setCurrentTime(video.currentTime);
        postMessageToIframe({ type: 'timeupdate', time: video.currentTime });
        if (audio) audio.currentTime = video.currentTime;
      }
    };

    const handleSeeked = () => {
      handleTimeUpdate();
      if (audio) audio.currentTime = video.currentTime;
    }

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, []);

  // --- Handle external seek (from Timeline click) ---
  useEffect(() => {
    if (externalSeekTime !== null && externalSeekTime !== undefined && videoRef.current) {
      if (Math.abs(videoRef.current.currentTime - externalSeekTime) > 0.1) {
        videoRef.current.currentTime = externalSeekTime;
        setCurrentTime(externalSeekTime);
        postMessageToIframe({ type: 'timeupdate', time: externalSeekTime });
        if (audioRef.current && audioRef.current.src) {
          audioRef.current.currentTime = externalSeekTime;
        }
      }
    }
  }, [externalSeekTime]);

  // --- ESC key to exit fullscreen ---
  useEffect(() => {
    if (!fullScreenMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleFullScreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullScreenMode, toggleFullScreen]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const restart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();

      // Force Iframe Reload
      setIframeKey(prev => prev + 1);

      // Reset Audio
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
      }
    }
  };

  // --- Recording Logic ---
  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
  };

  const startRecording = async () => {
    try {
      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        alert("Your browser does not support valid video recording formats.");
        return;
      }

      if (!fullScreenMode) {
        toggleFullScreen();
        await new Promise(r => setTimeout(r, 500));
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
        preferCurrentTab: true,
      } as any);

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `reel-export-${Date.now()}.${ext}`;
        a.click();

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(e => console.warn("Auto-play blocked", e));
        setIframeKey(prev => prev + 1); // Also reset iframe on recording start
      }

    } catch (err) {
      console.error("Recording failed", err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (videoRef.current) videoRef.current.pause();
    }
  };


  // --- Runtime Asset Injection ---
  const injectedHtml = useMemo(() => {
    if (!assets || assets.length === 0) return htmlContent;

    let processedHtml = htmlContent;
    assets.forEach(asset => {
      // Replace simple filenames with Blob URLs
      // We use a global regex to catch all instances
      // Escaping the name for regex safety is good practice but simple replacement works for now
      const regex = new RegExp(asset.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processedHtml = processedHtml.replace(regex, asset.url);
    });
    return processedHtml;
  }, [htmlContent, assets]);

  return (
    <div className={`flex flex-col items-center justify-center ${fullScreenMode ? 'fixed inset-0 z-50 bg-black' : 'h-full w-full p-4'}`}>

      <div
        className={`relative bg-black overflow-hidden shadow-2xl shadow-black/90 border-[6px] border-gray-800 ${fullScreenMode ? '' : 'rounded-[2.5rem] ring-8 ring-gray-900 ring-opacity-50'}`}
        style={{
          width: fullScreenMode ? '100vh' : 'auto',
          height: fullScreenMode ? '100vh' : 'calc(100% - 80px)',
          maxHeight: fullScreenMode ? '100vh' : '85vh',
          aspectRatio: '9/16',
          maxWidth: fullScreenMode ? '100vw' : '100%',
          cursor: isRecording ? 'none' : 'default',
          transform: fullScreenMode ? 'none' : 'translateZ(0)',
          boxShadow: fullScreenMode ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
        }}
      >
        {/* Reflection Glare (Non-fullscreen only) */}
        {!fullScreenMode && (
          <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none z-20 mix-blend-overlay"></div>
        )}
        <div
          className="absolute top-0 left-0 w-full overflow-hidden bg-gray-900"
          style={layoutStyles.htmlContainer}
        >
          <iframe
            key={iframeKey} // Force Re-render on key change
            ref={iframeRef}
            srcDoc={injectedHtml}
            onLoad={handleIframeLoad}
            title="Generated Animation"
            className="w-full h-full border-0 pointer-events-none select-none"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        <div
          className="absolute bottom-0 left-0 w-full overflow-hidden bg-black"
          style={layoutStyles.videoContainer}
        >
          {/* Main Video */}
          <video
            key={videoUrl}
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            playsInline
            muted={false}
          />
          {/* Background Music - Hidden */}
          <audio
            ref={audioRef}
            loop
          />
        </div>

        {currentCaption && (
          <div style={captionStyle}>
            <div className="relative group max-w-[95%]">
              {!isFullHtml && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md rounded-xl -z-10 shadow-lg border border-white/5" />
              )}
              {renderAnimatedCaption()}
            </div>
          </div>
        )}

        {!fullScreenMode && !isRecording && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[85%] bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-1.5 flex items-center justify-between z-50 shadow-2xl transition-all duration-300 hover:scale-[1.02] group">
            <button
              onClick={togglePlay}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition-colors shadow-lg shadow-white/10"
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-white/90 tracking-wider">
                {currentTime.toFixed(1)} <span className="text-gray-500">/</span> {duration.toFixed(1)}
              </span>
            </div>

            <button
              onClick={restart}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
              title="Restart"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        )}
      </div>

      {
        !isRecording && (
          <div className="mt-8 flex gap-3">
            <button
              onClick={togglePlay}
              className="glass-button flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/10"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={toggleFullScreen}
              className="glass-button flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/10"
            >
              {fullScreenMode ? <Minimize size={16} /> : <Maximize size={16} />}
              {fullScreenMode ? 'Exit' : 'Fullscreen'}
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 hover:-translate-y-0.5"
            >
              <Video size={16} />
              Export Video
            </button>
          </div>
        )
      }

      {/* High Quality Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        videoFile={videoFile || null}
        htmlContent={htmlContent}
        bgMusicFile={bgMusicFile}
        bgMusicVolume={bgMusicVolume}
        duration={duration}
        srtData={srtData}
        layoutConfig={layoutConfig}
      />

      {
        isRecording && (
          <div className="fixed top-4 right-4 z-[100]">
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold shadow-2xl animate-pulse"
            >
              <StopCircle size={20} />
              Stop Recording
            </button>
          </div>
        )
      }

      <div className="mt-2 text-gray-500 text-sm">
        {!isRecording && fullScreenMode && "Press ESC to exit fullscreen"}
        {isRecording && "Recording in progress... content will auto-download on finish."}
      </div>
    </div >
  );
};