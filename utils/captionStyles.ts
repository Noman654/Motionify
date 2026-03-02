import React from 'react';

// ──────────────────────────────────────────────────────
// Caption Style Engine — 10 viral animated caption styles
// Used by BOTH ReelPlayer (React/JSX) and ExportModal (Canvas 2D)
// ──────────────────────────────────────────────────────

export interface CaptionStyleDef {
    id: string;
    name: string;
    icon: string;
    description: string;
    category: 'classic' | 'animated' | 'cinematic';
}

export const CAPTION_STYLES: CaptionStyleDef[] = [
    { id: 'karaoke', name: 'Karaoke', icon: '🎤', description: 'Active word highlights yellow with glow', category: 'classic' },
    { id: 'pop-in', name: 'Pop-In', icon: '💥', description: 'Words scale up as they become active', category: 'animated' },
    { id: 'boxed', name: 'Boxed Highlight', icon: '🟨', description: 'Active word gets a colored background', category: 'classic' },
    { id: 'typewriter', name: 'Typewriter', icon: '⌨️', description: 'Words appear one at a time sequentially', category: 'classic' },
    { id: 'bounce', name: 'Bounce Drop', icon: '🏀', description: 'Words drop in from above with bounce', category: 'animated' },
    { id: 'glow', name: 'Glow Pulse', icon: '✨', description: 'Active word pulses with neon glow', category: 'animated' },
    { id: 'emoji', name: 'Emoji React', icon: '🔥', description: 'Emoji pops beside active words', category: 'animated' },
    { id: 'gradient', name: 'Split Color', icon: '🌈', description: 'Active word shows a gradient color', category: 'cinematic' },
    { id: 'underline', name: 'Underline Sweep', icon: '〰️', description: 'Animated underline sweeps the word', category: 'cinematic' },
    { id: 'netflix', name: 'Netflix', icon: '🎬', description: 'Clean fade, one chunk at a time', category: 'cinematic' },
];

export const DEFAULT_STYLE_ID = 'karaoke';

// ──────────────────────────────────────────────────────
// PREVIEW RENDERER — Returns React className + style objects
// Used by ReelPlayer.tsx to render captions in the live preview
// ──────────────────────────────────────────────────────

export interface PreviewWordStyle {
    className: string;
    style: React.CSSProperties;
    prefix?: string; // e.g. emoji before word
    suffix?: string; // e.g. emoji after word
}

export interface PreviewContainerStyle {
    className: string;
    style: React.CSSProperties;
}

export function getPreviewContainerStyle(styleId: string, isFullHtml: boolean): PreviewContainerStyle {
    const base = `flex flex-wrap justify-center items-center gap-x-1.5 gap-y-1 px-4 py-2 rounded-2xl transition-all duration-300`;
    const bg = isFullHtml ? 'bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl' : '';

    if (styleId === 'netflix') {
        return {
            className: `${base} ${bg}`,
            style: { minHeight: '60px', flexDirection: 'column' as const },
        };
    }
    return {
        className: `${base} ${bg}`,
        style: { minHeight: '60px' },
    };
}

const EMOJI_MAP = ['🔥', '💡', '⚡', '🚀', '✨', '💎', '🎯', '🧠', '💪', '👀'];

export function getPreviewWordStyle(
    styleId: string,
    wordIndex: number,
    activeIndex: number,
    totalWords: number
): PreviewWordStyle {
    const isActive = wordIndex === activeIndex;
    const isPast = wordIndex < activeIndex;
    const isFuture = wordIndex > activeIndex;

    const baseClass = 'inline-block text-2xl md:text-2xl font-black tracking-wide leading-tight transition-all duration-150';

    switch (styleId) {
        // 1. KARAOKE (original)
        case 'karaoke':
            return {
                className: `${baseClass} ${isActive ? 'text-yellow-400 scale-110' : ''} ${isPast ? 'text-white' : ''} ${isFuture ? 'text-white/40' : ''}`,
                style: {
                    textShadow: isActive
                        ? '0 0 30px rgba(250, 204, 21, 0.6), 2px 2px 0px rgba(0,0,0,1)'
                        : '2px 2px 0px rgba(0,0,0,0.8)',
                },
            };

        // 2. POP-IN
        case 'pop-in':
            return {
                className: `${baseClass} ${isActive ? 'text-white scale-125' : ''} ${isPast ? 'text-white/90 scale-100' : ''} ${isFuture ? 'text-white/0 scale-75' : ''}`,
                style: {
                    textShadow: '2px 2px 0px rgba(0,0,0,0.8)',
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                },
            };

        // 3. BOXED HIGHLIGHT
        case 'boxed':
            return {
                className: `${baseClass} ${isPast ? 'text-white' : ''} ${isFuture ? 'text-white/40' : ''} ${isActive ? 'text-black' : ''}`,
                style: {
                    background: isActive ? '#facc15' : 'transparent',
                    borderRadius: isActive ? '8px' : '0',
                    padding: isActive ? '2px 10px' : '2px 4px',
                    textShadow: isActive ? 'none' : '2px 2px 0px rgba(0,0,0,0.8)',
                    transition: 'all 0.15s ease',
                },
            };

        // 4. TYPEWRITER
        case 'typewriter':
            return {
                className: `${baseClass} ${isFuture ? 'text-transparent' : 'text-white'}`,
                style: {
                    textShadow: isFuture ? 'none' : '2px 2px 0px rgba(0,0,0,0.8)',
                    transition: 'color 0.1s ease',
                    borderRight: isActive ? '3px solid #00f3ff' : 'none',
                    paddingRight: isActive ? '4px' : '0',
                },
            };

        // 5. BOUNCE DROP
        case 'bounce':
            return {
                className: `${baseClass} ${isActive ? 'text-cyan-400' : ''} ${isPast ? 'text-white' : ''} ${isFuture ? 'text-white/30' : ''}`,
                style: {
                    transform: isFuture ? 'translateY(-20px)' : isActive ? 'translateY(0) scale(1.15)' : 'translateY(0)',
                    opacity: isFuture ? 0 : 1,
                    textShadow: isActive
                        ? '0 0 20px rgba(0, 243, 255, 0.6), 2px 2px 0px rgba(0,0,0,1)'
                        : '2px 2px 0px rgba(0,0,0,0.8)',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                },
            };

        // 6. GLOW PULSE
        case 'glow':
            return {
                className: `${baseClass} ${isPast ? 'text-white' : ''} ${isFuture ? 'text-white/40' : ''}`,
                style: {
                    color: isActive ? '#00ff9d' : undefined,
                    textShadow: isActive
                        ? '0 0 10px #00ff9d, 0 0 20px #00ff9d, 0 0 40px #00ff9d, 0 0 80px #00ff9d'
                        : '2px 2px 0px rgba(0,0,0,0.8)',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                    animation: isActive ? 'glowPulse 0.6s ease-in-out infinite alternate' : 'none',
                    transition: 'all 0.15s ease',
                },
            };

        // 7. EMOJI REACTIONS
        case 'emoji':
            return {
                className: `${baseClass} ${isActive ? 'text-yellow-400 scale-110' : ''} ${isPast ? 'text-white' : ''} ${isFuture ? 'text-white/40' : ''}`,
                style: {
                    textShadow: isActive
                        ? '0 0 20px rgba(250, 204, 21, 0.5), 2px 2px 0px rgba(0,0,0,1)'
                        : '2px 2px 0px rgba(0,0,0,0.8)',
                },
                suffix: isActive ? ` ${EMOJI_MAP[wordIndex % EMOJI_MAP.length]}` : undefined,
            };

        // 8. SPLIT COLOR / GRADIENT
        case 'gradient':
            return {
                className: `${baseClass} ${isPast ? 'text-white' : ''} ${isFuture ? 'text-white/40' : ''}`,
                style: {
                    background: isActive ? 'linear-gradient(90deg, #ff0055, #ffaa00)' : 'none',
                    WebkitBackgroundClip: isActive ? 'text' : undefined,
                    WebkitTextFillColor: isActive ? 'transparent' : undefined,
                    backgroundClip: isActive ? 'text' : undefined,
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(255, 0, 85, 0.5))' : 'none',
                    transform: isActive ? 'scale(1.12)' : 'scale(1)',
                    textShadow: isActive ? 'none' : '2px 2px 0px rgba(0,0,0,0.8)',
                    transition: 'all 0.15s ease',
                } as React.CSSProperties,
            };

        // 9. UNDERLINE SWEEP
        case 'underline':
            return {
                className: `${baseClass} ${isActive ? 'text-white' : ''} ${isPast ? 'text-white' : ''} ${isFuture ? 'text-white/40' : ''}`,
                style: {
                    textShadow: '2px 2px 0px rgba(0,0,0,0.8)',
                    borderBottom: isActive ? '4px solid #a855f7' : isPast ? '4px solid rgba(168, 85, 247, 0.3)' : '4px solid transparent',
                    paddingBottom: '4px',
                    transition: 'border-color 0.2s ease',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                },
            };

        // 10. NETFLIX
        case 'netflix':
            return {
                className: `${baseClass} text-white`,
                style: {
                    textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                    opacity: isFuture ? 0.3 : 1,
                    fontSize: isActive ? '1.8rem' : '1.6rem',
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                },
            };

        default:
            return {
                className: `${baseClass} text-white`,
                style: { textShadow: '2px 2px 0px rgba(0,0,0,0.8)' },
            };
    }
}


// ──────────────────────────────────────────────────────
// EXPORT RENDERER — Canvas 2D drawing functions
// Used by ExportModal.tsx to render captions during frame-by-frame export
// ──────────────────────────────────────────────────────

interface ExportCaptionParams {
    ctx: CanvasRenderingContext2D;
    styleId: string;
    words: string[];
    activeIndex: number;
    startWordIndex: number;
    canvasWidth: number;
    canvasHeight: number;
    subY: number;
    isFullHtml: boolean;
    fontSize?: number;
}

export function renderExportCaption({
    ctx, styleId, words, activeIndex, startWordIndex,
    canvasWidth, canvasHeight, subY, isFullHtml, fontSize = 48
}: ExportCaptionParams): void {

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Measure total text width for background
    ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    // Build display text (with emoji suffixes for emoji style)
    const displayWords = words.map((w, i) => {
        const trueIdx = startWordIndex + i;
        if (styleId === 'emoji' && trueIdx === activeIndex) {
            return w + ' ' + EMOJI_MAP[trueIdx % EMOJI_MAP.length];
        }
        return w;
    });

    const totalText = displayWords.join('  ');
    const metrics = ctx.measureText(totalText);
    const bgPadX = 30, bgPadY = 20;
    const bgW = metrics.width + bgPadX * 2;
    const bgH = fontSize * 1.5 + bgPadY * 2;
    const bgX = (canvasWidth - bgW) / 2;
    const bgY = subY - bgH / 2;

    // Draw background for certain styles
    const needsBg = isFullHtml || ['boxed', 'netflix'].includes(styleId);
    if (needsBg) {
        ctx.save();
        ctx.fillStyle = styleId === 'netflix' ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(bgX, bgY, bgW, bgH, 24);
        ctx.fill();
        ctx.restore();
    }

    // Draw each word
    let drawX = canvasWidth / 2 - metrics.width / 2;

    for (let wi = 0; wi < displayWords.length; wi++) {
        const trueIdx = startWordIndex + wi;
        const isActive = trueIdx === activeIndex;
        const isPast = trueIdx < activeIndex;
        const isFuture = trueIdx > activeIndex;
        const word = displayWords[wi];

        const activeSize = styleId === 'netflix' ? fontSize : fontSize * 1.1;
        ctx.font = `900 ${isActive ? activeSize : fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

        const wordW = ctx.measureText(word).width;
        const wordCenterX = drawX + wordW / 2;

        // Draw shadow
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillText(word, wordCenterX + 3, subY + 3);
        ctx.restore();

        // Style-specific rendering
        switch (styleId) {
            case 'karaoke':
                ctx.fillStyle = isActive ? '#facc15' : (isPast ? '#ffffff' : 'rgba(255,255,255,0.4)');
                if (isActive) {
                    // Glow effect
                    ctx.save();
                    ctx.shadowColor = 'rgba(250, 204, 21, 0.6)';
                    ctx.shadowBlur = 30;
                    ctx.fillText(word, wordCenterX, subY);
                    ctx.restore();
                } else {
                    ctx.fillText(word, wordCenterX, subY);
                }
                break;

            case 'pop-in':
                if (isFuture) {
                    // Don't draw future words (they "pop in")
                    ctx.fillStyle = 'rgba(255,255,255,0.05)';
                } else {
                    ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255,255,255,0.9)';
                }
                ctx.fillText(word, wordCenterX, subY);
                break;

            case 'boxed':
                if (isActive) {
                    // Draw yellow box behind active word
                    ctx.save();
                    ctx.fillStyle = '#facc15';
                    const boxPad = 8;
                    ctx.beginPath();
                    ctx.roundRect(drawX - boxPad, subY - fontSize * 0.55, wordW + boxPad * 2, fontSize * 1.1, 8);
                    ctx.fill();
                    ctx.restore();
                    // Text in black
                    ctx.fillStyle = '#000000';
                } else {
                    ctx.fillStyle = isPast ? '#ffffff' : 'rgba(255,255,255,0.4)';
                }
                ctx.fillText(word, wordCenterX, subY);
                break;

            case 'typewriter':
                ctx.fillStyle = isFuture ? 'rgba(255,255,255,0)' : '#ffffff';
                ctx.fillText(word, wordCenterX, subY);
                if (isActive) {
                    // Cursor
                    ctx.fillStyle = '#00f3ff';
                    ctx.fillRect(drawX + wordW + 4, subY - fontSize * 0.4, 3, fontSize * 0.8);
                }
                break;

            case 'bounce':
                ctx.fillStyle = isActive ? '#00f3ff' : (isPast ? '#ffffff' : 'rgba(255,255,255,0.3)');
                if (isActive) {
                    ctx.save();
                    ctx.shadowColor = 'rgba(0, 243, 255, 0.6)';
                    ctx.shadowBlur = 20;
                    ctx.fillText(word, wordCenterX, subY);
                    ctx.restore();
                } else if (!isFuture) {
                    ctx.fillText(word, wordCenterX, subY);
                }
                break;

            case 'glow':
                ctx.fillStyle = isActive ? '#00ff9d' : (isPast ? '#ffffff' : 'rgba(255,255,255,0.4)');
                if (isActive) {
                    ctx.save();
                    ctx.shadowColor = '#00ff9d';
                    ctx.shadowBlur = 40;
                    ctx.fillText(word, wordCenterX, subY);
                    ctx.shadowBlur = 20;
                    ctx.fillText(word, wordCenterX, subY);
                    ctx.restore();
                } else {
                    ctx.fillText(word, wordCenterX, subY);
                }
                break;

            case 'emoji':
                ctx.fillStyle = isActive ? '#facc15' : (isPast ? '#ffffff' : 'rgba(255,255,255,0.4)');
                if (isActive) {
                    ctx.save();
                    ctx.shadowColor = 'rgba(250, 204, 21, 0.5)';
                    ctx.shadowBlur = 20;
                    ctx.fillText(word, wordCenterX, subY);
                    ctx.restore();
                } else {
                    ctx.fillText(word, wordCenterX, subY);
                }
                break;

            case 'gradient':
                if (isActive) {
                    // Canvas gradient text
                    const grad = ctx.createLinearGradient(drawX, subY, drawX + wordW, subY);
                    grad.addColorStop(0, '#ff0055');
                    grad.addColorStop(1, '#ffaa00');
                    ctx.fillStyle = grad;
                    ctx.save();
                    ctx.shadowColor = 'rgba(255, 0, 85, 0.5)';
                    ctx.shadowBlur = 8;
                    ctx.fillText(word, wordCenterX, subY);
                    ctx.restore();
                } else {
                    ctx.fillStyle = isPast ? '#ffffff' : 'rgba(255,255,255,0.4)';
                    ctx.fillText(word, wordCenterX, subY);
                }
                break;

            case 'underline':
                ctx.fillStyle = isActive ? '#ffffff' : (isPast ? '#ffffff' : 'rgba(255,255,255,0.4)');
                ctx.fillText(word, wordCenterX, subY);
                if (isActive) {
                    ctx.save();
                    ctx.strokeStyle = '#a855f7';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(drawX, subY + fontSize * 0.5);
                    ctx.lineTo(drawX + wordW, subY + fontSize * 0.5);
                    ctx.stroke();
                    ctx.restore();
                } else if (isPast) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(drawX, subY + fontSize * 0.5);
                    ctx.lineTo(drawX + wordW, subY + fontSize * 0.5);
                    ctx.stroke();
                    ctx.restore();
                }
                break;

            case 'netflix':
                ctx.fillStyle = isFuture ? 'rgba(255,255,255,0.3)' : '#ffffff';
                ctx.fillText(word, wordCenterX, subY);
                break;

            default:
                ctx.fillStyle = isActive ? '#facc15' : (isPast ? '#ffffff' : 'rgba(255,255,255,0.4)');
                ctx.fillText(word, wordCenterX, subY);
        }

        drawX += wordW + ctx.measureText('  ').width;
    }
}
