import React, { useMemo } from 'react';
import { HookStyle, HookMode, HookDesign } from '../services/hookService';

interface HookOverlayProps {
  hookText: string;
  hookStyle: HookStyle;
  hookMode: HookMode;
  hookDesign: HookDesign;
  currentTime: number;
  duration?: number;
  previewScale?: number;
  backgroundVideoUrl?: string;
  aiImageUrl?: string;
}

/* ── Accent colors per hook style ── */
const AC: Record<HookStyle, { c: string; rgb: string }> = {
  numbered_list: { c: '#fbbf24', rgb: '251,191,36' },
  curiosity_gap: { c: '#00f3ff', rgb: '0,243,255' },
  bold_claim:    { c: '#ff0055', rgb: '255,0,85' },
  pain_point:    { c: '#a855f7', rgb: '168,85,247' },
};

const CTA: Record<HookStyle, string> = {
  numbered_list: '▶ WATCH TO LEARN',
  curiosity_gap: '',
  bold_claim: '⚠ STOP SCROLLING',
  pain_point: "Here's the fix ↓",
};

export const HookOverlay: React.FC<HookOverlayProps> = ({
  hookText, hookStyle, hookMode, hookDesign, currentTime,
  duration = 3, previewScale, backgroundVideoUrl, aiImageUrl,
}) => {
  const fadeStart = duration - 0.5;
  const opacity = currentTime > fadeStart ? Math.max(0, 1 - (currentTime - fadeStart) / 0.5) : 1;
  const isP = previewScale !== undefined;
  const ac = AC[hookStyle];

  // Split text into stacked lines
  const lines = useMemo(() => {
    const words = hookText.split(' ');
    const result: string[] = [];
    let cur = '';
    const maxLen = isP ? 18 : 22;
    for (const w of words) {
      if (cur && (cur + ' ' + w).length > maxLen) { result.push(cur); cur = w; }
      else { cur = cur ? cur + ' ' + w : w; }
    }
    if (cur) result.push(cur);
    return result;
  }, [hookText, isP]);

  const numMatch = hookStyle === 'numbered_list' ? hookText.match(/^(\d+)\s*(.*)/) : null;
  const bigNum = numMatch?.[1];
  const textLines = bigNum ? [numMatch![2]] : lines;
  const bgSrc = aiImageUrl || undefined;

  // Design-specific styles
  const design = getDesignStyles(hookDesign, ac, isP);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 55, opacity,
      transition: 'opacity 0.3s ease-out',
      pointerEvents: 'none', overflow: 'hidden',
      ...(isP ? { borderRadius: 12 } : {}),
    }}>
      <style>{`
        @keyframes hkSlam { 0% { transform: scale(2.5) rotate(3deg); opacity: 0; } 30% { transform: scale(0.95) rotate(-0.5deg); opacity: 1; } 60% { transform: scale(1.03); } 100% { transform: scale(1) rotate(0); } }
        @keyframes hkLine { 0% { transform: translateX(-110%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes hkLineR { 0% { transform: translateX(110%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes hkFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hkPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes hkFlash { 0% { opacity: 0.9; } 100% { opacity: 0; } }
        @keyframes hkShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px) rotate(-1deg); } 40% { transform: translateX(6px) rotate(0.5deg); } 60% { transform: translateX(-4px); } 80% { transform: translateX(2px); } }
        @keyframes hkSweep { from { width: 0%; } to { width: 60%; } }
        @keyframes hkZoom { from { transform: scale(1); } to { transform: scale(1.1); } }
        @keyframes hkNumDrop { 0% { transform: translateY(-100px) scale(1.5); opacity: 0; } 40% { transform: translateY(10px) scale(0.9); opacity: 1; } 100% { transform: translateY(0) scale(1); } }
        @keyframes hkFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes hkShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {/* ══ BACKGROUND ══ */}
      {hookMode === 'speaker' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0.8) 100%)`,
        }} />
      )}
      {hookMode === 'visual' && (
        <>
          {bgSrc && <img src={bgSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.35) saturate(1.4)', animation: 'hkZoom 5s ease-out forwards' }} />}
          {backgroundVideoUrl && !bgSrc && <video src={backgroundVideoUrl} autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.3) saturate(1.3)' }} />}
          {!bgSrc && !backgroundVideoUrl && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 40% 30%, rgba(${ac.rgb},0.12) 0%, transparent 60%), linear-gradient(135deg, #0a0a12, #0d0d18)` }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.6))' }} />
        </>
      )}
      {hookMode === 'cinematic' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 30% 25%, rgba(${ac.rgb},0.1) 0%, transparent 50%), linear-gradient(180deg, #08080c, #0a0a10)`,
        }} />
      )}

      {/* ══ CONTENT CARD ══ */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: isP ? '8% 5%' : '6% 5%',
        fontFamily: design.fontFamily,
      }}>
        {/* Design wrapper — the card/container */}
        <div style={{
          ...design.card,
          width: '90%',
          maxWidth: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          padding: isP ? '12px 10px' : '24px 16px',
          animation: hookStyle === 'bold_claim'
            ? 'hkShake 0.4s 0.1s ease-out'
            : 'hkFade 0.5s 0.1s ease-out forwards',
          opacity: hookStyle === 'bold_claim' ? 1 : 0,
        }}>

          {/* Big number */}
          {bigNum && (
            <>
              <div style={{
                fontSize: isP ? 50 : 90,
                fontWeight: 900, lineHeight: 1,
                color: design.accentColor || ac.c,
                animation: 'hkNumDrop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                ...design.numberStyle,
              }}>
                {bigNum}
              </div>
              <div style={{
                height: isP ? 2 : 4, borderRadius: design.borderRadius || 4,
                width: 0, margin: isP ? '4px auto' : '8px auto',
                background: design.lineGradient || `linear-gradient(90deg, transparent, ${ac.c}, transparent)`,
                animation: 'hkSweep 0.5s 0.3s ease-out forwards',
                ...design.lineStyle,
              }} />
            </>
          )}

          {/* Pain point emoji */}
          {hookStyle === 'pain_point' && !bigNum && (
            <div style={{
              fontSize: isP ? 32 : 52,
              animation: 'hkSlam 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              marginBottom: isP ? 4 : 10,
              filter: `drop-shadow(0 0 20px rgba(${ac.rgb},0.4))`,
            }}>🎯</div>
          )}

          {/* Text lines */}
          {textLines.map((line, i) => (
            <div key={i} style={{
              fontSize: isP
                ? (textLines.length <= 2 ? 20 : 14)
                : (textLines.length <= 2 ? 38 : textLines.length <= 3 ? 30 : 24),
              fontWeight: design.fontWeight || 900,
              color: design.textColor || '#ffffff',
              textTransform: (design.textTransform || 'uppercase') as any,
              lineHeight: 1.1,
              letterSpacing: design.letterSpacing || '-0.02em',
              padding: isP ? '1px 0' : '3px 0',
              textAlign: 'center' as const,
              opacity: 0,
              animation: `${i % 2 === 0 ? 'hkLine' : 'hkLineR'} 0.4s ${0.2 + i * 0.1}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
              ...design.textStyle,
              wordBreak: 'break-word' as const,
            }}>
              {line}
            </div>
          ))}

          {/* Accent line below text */}
          <div style={{
            height: isP ? 2 : 3,
            borderRadius: design.borderRadius || 4,
            width: 0, margin: isP ? '6px auto' : '12px auto',
            background: design.lineGradient || `linear-gradient(90deg, transparent, ${ac.c}, transparent)`,
            animation: `hkSweep 0.6s ${0.4 + textLines.length * 0.1}s ease-out forwards`,
            ...design.lineStyle,
          }} />
        </div>

        {/* CTA */}
        {CTA[hookStyle] && (
          <div style={{
            position: 'absolute', bottom: isP ? '6%' : '5%',
            left: '50%', transform: 'translateX(-50%)',
            fontSize: isP ? 8 : 13,
            color: design.accentColor || ac.c,
            fontWeight: 800, letterSpacing: '0.18em',
            textTransform: 'uppercase', whiteSpace: 'nowrap',
            opacity: 0,
            animation: `hkFade 0.5s ${0.6 + textLines.length * 0.1}s forwards, hkPulse 2s ${1.2}s infinite`,
            ...design.ctaStyle,
          }}>
            {CTA[hookStyle]}
          </div>
        )}
      </div>

      {/* Bold claim flash */}
      {hookStyle === 'bold_claim' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: design.flashColor || `linear-gradient(180deg, ${ac.c}, rgba(${ac.rgb},0.8))`,
          animation: 'hkFlash 0.3s forwards', pointerEvents: 'none',
        }} />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Design Style Generators
   ═══════════════════════════════════════════════════════ */

interface DesignTokens {
  card: React.CSSProperties;
  textStyle: React.CSSProperties;
  textColor: string;
  accentColor?: string;
  numberStyle?: React.CSSProperties;
  lineStyle?: React.CSSProperties;
  lineGradient?: string;
  ctaStyle?: React.CSSProperties;
  fontFamily: string;
  fontWeight: number;
  letterSpacing: string;
  textTransform: string;
  borderRadius?: number;
  flashColor?: string;
}

function getDesignStyles(design: HookDesign, ac: { c: string; rgb: string }, isP: boolean): DesignTokens {
  switch (design) {
    case 'glassmorphism':
      return {
        card: {
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: isP ? 12 : 20,
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`,
        },
        textStyle: {
          textShadow: '0 2px 15px rgba(0,0,0,0.6)',
        },
        textColor: '#ffffff',
        numberStyle: { textShadow: `0 0 40px rgba(${ac.rgb},0.5)` },
        lineGradient: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
        fontFamily: "'Inter', 'SF Pro', system-ui, sans-serif",
        fontWeight: 800,
        letterSpacing: '-0.01em',
        textTransform: 'uppercase',
        borderRadius: 20,
      };

    case 'neo_brutalism':
      return {
        card: {
          background: ac.c,
          borderRadius: 0,
          border: `${isP ? 3 : 5}px solid #000`,
          boxShadow: `${isP ? 4 : 8}px ${isP ? 4 : 8}px 0 #000`,
          transform: 'rotate(-0.5deg)',
        },
        textStyle: {
          textShadow: 'none',
          WebkitTextStroke: isP ? '0.5px #000' : '1px #000',
        },
        textColor: '#000000',
        accentColor: '#000000',
        numberStyle: {
          color: '#000',
          textShadow: 'none',
          WebkitTextStroke: isP ? '1px rgba(0,0,0,0.3)' : '2px rgba(0,0,0,0.3)',
        },
        lineStyle: { background: '#000', height: isP ? 3 : 5, borderRadius: 0 },
        lineGradient: '#000',
        ctaStyle: { color: '#000', textShadow: 'none' },
        flashColor: `linear-gradient(180deg, ${ac.c}, ${ac.c})`,
        fontFamily: "'Arial Black', 'Impact', system-ui, sans-serif",
        fontWeight: 900,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        borderRadius: 0,
      };

    case 'clay_morphism':
      return {
        card: {
          background: `linear-gradient(145deg, rgba(${ac.rgb},0.15), rgba(${ac.rgb},0.05))`,
          borderRadius: isP ? 16 : 28,
          border: 'none',
          boxShadow: `
            12px 12px 24px rgba(0,0,0,0.4),
            -6px -6px 12px rgba(255,255,255,0.03),
            inset 2px 2px 4px rgba(255,255,255,0.08),
            inset -2px -2px 4px rgba(0,0,0,0.15)
          `,
        },
        textStyle: {
          textShadow: `0 2px 4px rgba(0,0,0,0.3), 0 0 20px rgba(${ac.rgb},0.1)`,
        },
        textColor: '#f0f0f0',
        numberStyle: {
          textShadow: `0 4px 8px rgba(0,0,0,0.4), 0 0 30px rgba(${ac.rgb},0.3)`,
          filter: `drop-shadow(0 2px 4px rgba(${ac.rgb},0.2))`,
        },
        lineGradient: `linear-gradient(90deg, transparent, rgba(${ac.rgb},0.4), transparent)`,
        fontFamily: "'Inter', 'Nunito', system-ui, sans-serif",
        fontWeight: 800,
        letterSpacing: '0em',
        textTransform: 'uppercase',
        borderRadius: 28,
      };

    case 'minimalism':
      return {
        card: {
          background: 'transparent',
          borderRadius: 0,
          border: 'none',
          boxShadow: 'none',
          padding: isP ? '8px' : '16px',
        },
        textStyle: {
          textShadow: '0 2px 20px rgba(0,0,0,0.8)',
          fontWeight: 300,
        },
        textColor: '#ffffff',
        numberStyle: {
          fontWeight: 200,
          textShadow: '0 2px 20px rgba(0,0,0,0.6)',
          opacity: 0.9,
        },
        lineGradient: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`,
        lineStyle: { height: 1 },
        ctaStyle: { fontWeight: 400, letterSpacing: '0.3em', opacity: 0.5 },
        fontFamily: "'Inter', 'Helvetica Neue', system-ui, sans-serif",
        fontWeight: 300,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      };

    case 'liquid_glass':
      return {
        card: {
          background: `linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(${ac.rgb},0.08) 50%, rgba(255,255,255,0.04) 100%)`,
          backdropFilter: 'blur(16px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
          borderRadius: isP ? 20 : 32,
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: `0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)`,
          animation: 'hkFloat 4s 1s ease-in-out infinite',
        },
        textStyle: {
          textShadow: `0 2px 15px rgba(0,0,0,0.5), 0 0 40px rgba(${ac.rgb},0.15)`,
          background: `linear-gradient(180deg, #fff 30%, rgba(${ac.rgb},0.7) 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        },
        textColor: '#ffffff',
        numberStyle: {
          background: `linear-gradient(180deg, #fff, ${ac.c})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: `drop-shadow(0 0 20px rgba(${ac.rgb},0.4))`,
        },
        lineGradient: `linear-gradient(90deg, transparent, rgba(${ac.rgb},0.3), rgba(255,255,255,0.2), rgba(${ac.rgb},0.3), transparent)`,
        fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
        fontWeight: 800,
        letterSpacing: '-0.01em',
        textTransform: 'uppercase',
        borderRadius: 32,
      };

    case 'skeuomorphism':
      return {
        card: {
          background: `linear-gradient(180deg, #2a2a30 0%, #1a1a20 100%)`,
          borderRadius: isP ? 10 : 16,
          border: '1px solid #3a3a42',
          boxShadow: `
            0 10px 30px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -1px 0 rgba(0,0,0,0.3),
            0 1px 2px rgba(0,0,0,0.4)
          `,
        },
        textStyle: {
          textShadow: `0 -1px 0 rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.05), 0 0 20px rgba(${ac.rgb},0.15)`,
        },
        textColor: '#e8e8e8',
        numberStyle: {
          textShadow: `0 -1px 0 rgba(0,0,0,0.8), 0 2px 0 rgba(255,255,255,0.05), 0 0 30px rgba(${ac.rgb},0.3)`,
          background: `linear-gradient(180deg, ${ac.c}, rgba(${ac.rgb},0.7))`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        },
        lineGradient: `linear-gradient(90deg, transparent, #3a3a42, transparent)`,
        lineStyle: {
          boxShadow: `0 1px 0 rgba(255,255,255,0.05), 0 -1px 0 rgba(0,0,0,0.3)`,
        },
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontWeight: 700,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        borderRadius: 16,
      };
  }
}
