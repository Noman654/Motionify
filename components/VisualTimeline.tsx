import React, { useMemo, useRef, useState, useEffect } from 'react';
import { LayoutConfigStep, SRTItem } from '../types';
import { Clock, ZoomIn, ZoomOut, Play, Pause } from 'lucide-react';

interface VisualTimelineProps {
    duration: number;
    currentTime: number;
    layoutConfig: LayoutConfigStep[];
    srtData?: SRTItem[];
    onSeek: (time: number) => void;
    onUpdateStep?: (index: number, newStep: LayoutConfigStep) => void;
    onSubtitleClick?: (item: SRTItem) => void;
}

export const VisualTimeline: React.FC<VisualTimelineProps> = ({
    duration,
    currentTime,
    layoutConfig,
    srtData,
    onSeek,
    onUpdateStep,
    onSubtitleClick
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1); // 1 = fit, >1 = zoomed in

    // Sort steps by start time just in case
    const sortedSteps = useMemo(() => {
        return [...layoutConfig].sort((a, b) => a.startTime - b.startTime);
    }, [layoutConfig]);

    const getStepStyle = (step: LayoutConfigStep) => {
        const totalSeconds = duration || 10; // Avoid div by zero
        const startPercent = (step.startTime / totalSeconds) * 100;
        const endPercent = (Math.min(step.endTime, totalSeconds) / totalSeconds) * 100;
        const widthPercent = Math.max(endPercent - startPercent, 0.5); // Min width

        let color = 'bg-gray-700';
        if (step.layoutMode === 'split') color = 'bg-blue-600';
        if (step.layoutMode === 'full-video') color = 'bg-purple-600';
        if (step.layoutMode === 'full-html') color = 'bg-green-600';

        return {
            left: `${startPercent}%`,
            width: `${widthPercent}%`,
            className: `${color} absolute top-1 bottom-1 rounded-md opacity-80 hover:opacity-100 transition-all cursor-pointer border border-white/10 group overflow-hidden`
        };
    };

    const handleTimelineClick = (e: React.MouseEvent) => {
        if (!containerRef.current || !duration) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        const time = percent * duration;
        onSeek(Math.max(0, Math.min(time, duration)));
    };

    return (
        <div className="w-full bg-gray-950 border-t border-white/10 p-2 select-none h-32 flex flex-col">
            <div className="flex items-center justify-between mb-1 px-2">
                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                    <Clock size={12} />
                    <span>{currentTime.toFixed(1)}s / {duration.toFixed(1)}s</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Timeline</span>
                </div>
            </div>

            <div
                className="relative flex-1 bg-gray-900 rounded-lg overflow-hidden cursor-crosshair border border-white/5"
                ref={containerRef}
                onClick={handleTimelineClick}
            >
                {/* Grid Lines (Every 5 seconds) */}
                <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
                    {Array.from({ length: Math.ceil(duration / 5) }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute top-0 bottom-0 border-l border-white/50 text-[8px] text-white pl-1 pt-1"
                            style={{ left: `${(i * 5 / duration) * 100}%` }}
                        >
                            {i * 5}s
                        </div>
                    ))}
                </div>

                {/* Track 1: Layout Mode */}
                <div className="absolute top-1 left-0 right-0 h-8 z-10">
                    {sortedSteps.map((step, index) => {
                        const style = getStepStyle(step);
                        const isActive = currentTime >= step.startTime && currentTime < step.endTime;
                        return (
                            <div
                                key={`layout-${index}`}
                                className={`${style.className} ${isActive ? 'ring-1 ring-white brightness-110' : ''}`}
                                style={{ left: style.left, width: style.width }}
                                title={`${step.layoutMode}`}
                            >
                                <div className="px-2 py-1 text-[9px] font-bold text-white truncate drop-shadow-md">
                                    {step.layoutMode}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Track 2: Subtitles */}
                <div className="absolute top-10 left-0 right-0 h-8 z-10">
                    {srtData?.map((item, index) => {
                        const startPercent = (item.startTime / (duration || 10)) * 100;
                        const endPercent = (item.endTime / (duration || 10)) * 100;
                        const widthPercent = Math.max(endPercent - startPercent, 0.5);
                        const isActive = currentTime >= item.startTime && currentTime < item.endTime;

                        return (
                            <div
                                key={`sub-${item.id}`}
                                className={`absolute top-0 bottom-0 rounded-md bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500/40 transition-colors cursor-pointer overflow-hidden ${isActive ? 'ring-1 ring-yellow-400 bg-yellow-500/30' : ''}`}
                                style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent seek
                                    onSubtitleClick && onSubtitleClick(item);
                                }}
                                title={item.text}
                            >
                                <div className="px-1 py-0.5 text-[8px] text-yellow-100 truncate w-full h-full leading-tight">
                                    {item.text}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Playhead */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                >
                    <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
            </div>
        </div>
    );
};
