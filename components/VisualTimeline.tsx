
import React, { useMemo } from 'react';
import { SRTItem, LayoutConfigStep } from '../types';

interface VisualTimelineProps {
    duration: number;
    currentTime: number;
    layoutConfig: LayoutConfigStep[];
    srtData: SRTItem[];
    onSeek: (time: number) => void;
    onSubtitleClick?: (subtitle: SRTItem) => void;
}

export const VisualTimeline: React.FC<VisualTimelineProps> = React.memo(({
    duration, currentTime, layoutConfig, srtData, onSeek, onSubtitleClick
}) => {
    const sortedSteps = useMemo(() =>
        [...(layoutConfig || [])].sort((a, b) => a.startTime - b.startTime),
        [layoutConfig]
    );

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const ratio = clickX / rect.width;
        onSeek(ratio * duration);
    };

    // Time markers
    const markers = useMemo(() => {
        if (duration <= 0) return [];
        const interval = duration > 30 ? 10 : 5;
        const result = [];
        for (let t = interval; t < duration; t += interval) {
            result.push(t);
        }
        return result;
    }, [duration]);

    const playheadPosition = duration > 0 ? `${(currentTime / duration) * 100}%` : '0%';

    const stepColors = [
        { bg: 'bg-violet-500/20', border: 'border-violet-500/40', text: 'text-violet-300' },
        { bg: 'bg-fuchsia-500/20', border: 'border-fuchsia-500/40', text: 'text-fuchsia-300' },
        { bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', text: 'text-cyan-300' },
        { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-300' },
        { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-300' },
        { bg: 'bg-pink-500/20', border: 'border-pink-500/40', text: 'text-pink-300' },
        { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-300' },
    ];

    if (duration <= 0) return null;

    return (
        <div className="w-full bg-[var(--color-bg-surface-1)] border-t border-white/[0.06] select-none flex-shrink-0" style={{ height: '100px' }}>
            {/* Time markers row */}
            <div className="flex items-center h-5 relative ml-[52px]" style={{ marginRight: 0 }}>
                {markers.map(t => (
                    <div
                        key={t}
                        className="absolute text-[9px] font-mono text-gray-600 -translate-x-1/2"
                        style={{ left: `${(t / duration) * 100}%` }}
                    >
                        {Math.floor(t)}s
                    </div>
                ))}
            </div>

            {/* Tracks */}
            <div className="flex flex-col gap-0.5 relative">
                {/* Layout Track */}
                <div className="flex items-stretch" style={{ height: '36px' }}>
                    <div className="track-label">Layout</div>
                    <div
                        className="flex-1 relative cursor-pointer bg-white/[0.015]"
                        onClick={handleTimelineClick}
                    >
                        {/* Grid lines */}
                        {markers.map(t => (
                            <div key={t} className="absolute top-0 h-full w-px bg-white/[0.03]" style={{ left: `${(t / duration) * 100}%` }} />
                        ))}

                        {/* Steps */}
                        {sortedSteps.map((step: LayoutConfigStep, index: number) => {
                            const left = `${(step.startTime / duration) * 100}%`;
                            const stepDuration = (step.endTime ?? duration) - step.startTime;
                            const width = `${(stepDuration / duration) * 100}%`;
                            const color = stepColors[index % stepColors.length];

                            return (
                                <div
                                    key={index}
                                    className={`absolute top-[3px] bottom-[3px] rounded-md ${color.bg} border ${color.border} ${color.text} flex items-center px-2 text-[9px] font-bold truncate hover:brightness-125 cursor-pointer transition-all`}
                                    style={{ left, width, minWidth: '20px' }}
                                    title={`Step ${index + 1}: ${step.startTime.toFixed(1)}s - ${(step.endTime ?? duration).toFixed(1)}s (${step.layoutMode})`}
                                >
                                    <span className="truncate opacity-80">
                                        {step.layoutMode === 'full-video' ? 'Video' : step.layoutMode === 'split' ? 'Split' : step.layoutMode === 'pip-html' ? 'PiP' : step.layoutMode === 'full-html' ? 'HTML' : step.layoutMode}
                                    </span>
                                </div>
                            );
                        })}

                        {/* Playhead */}
                        <div
                            className="absolute top-0 h-full z-30 pointer-events-none transition-[left] duration-75"
                            style={{ left: playheadPosition }}
                        >
                            {/* Triangle indicator */}
                            <div className="absolute -top-[1px] -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-transparent border-t-white/80" />
                            <div className="w-[2px] h-full bg-white/80 -translate-x-1/2" />
                        </div>
                    </div>
                </div>

                {/* Captions Track */}
                <div className="flex items-stretch" style={{ height: '32px' }}>
                    <div className="track-label">Caps</div>
                    <div
                        className="flex-1 relative cursor-pointer bg-white/[0.01]"
                        onClick={handleTimelineClick}
                    >
                        {/* Grid lines */}
                        {markers.map(t => (
                            <div key={t} className="absolute top-0 h-full w-px bg-white/[0.03]" style={{ left: `${(t / duration) * 100}%` }} />
                        ))}

                        {/* Subtitles */}
                        {srtData?.map((item: SRTItem, index: number) => {
                            const left = `${(item.startTime / duration) * 100}%`;
                            const sWidth = `${((item.endTime - item.startTime) / duration) * 100}%`;
                            const isActive = currentTime >= item.startTime && currentTime <= item.endTime;

                            return (
                                <div
                                    key={index}
                                    className={`absolute top-[3px] bottom-[3px] rounded-md flex items-center px-1.5 text-[8px] truncate cursor-pointer transition-all border ${isActive
                                        ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-200 shadow-sm shadow-emerald-500/10'
                                        : 'bg-white/[0.03] border-white/5 text-gray-600 hover:bg-white/[0.06] hover:text-gray-400'
                                        }`}
                                    style={{ left, width: sWidth, minWidth: '8px' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSubtitleClick) onSubtitleClick(item);
                                        else onSeek(item.startTime);
                                    }}
                                    title={item.text}
                                >
                                    {parseFloat(sWidth) > 3 && <span className="truncate">{item.text}</span>}
                                </div>
                            );
                        })}

                        {/* Playhead */}
                        <div
                            className="absolute top-0 h-full z-30 pointer-events-none transition-[left] duration-75"
                            style={{ left: playheadPosition }}
                        >
                            <div className="w-[2px] h-full bg-white/80 -translate-x-1/2" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
