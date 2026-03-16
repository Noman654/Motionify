import React, { useState, useCallback, RefObject } from 'react';
import { Zap, Loader2, X, Check, RotateCcw, Sparkles, ChevronRight, Play, Pencil, Clock, Image, Film, Clapperboard, Palette } from 'lucide-react';
import { generateHookVariants, generateHookImage, HookVariant, HOOK_STYLES, HOOK_MODES, HOOK_DESIGNS, ActiveHook, HookMode, HookDesign } from '../services/hookService';
import { HookOverlay } from './HookOverlay';

interface HookLabPanelProps {
  isOpen: boolean;
  onClose: () => void;
  srtText: string;
  topicContext: string;
  apiKey: string;
  onApplyHook: (hook: ActiveHook) => void;
  onPreviewHook: (hook: ActiveHook) => void;
  onRemoveHook?: () => void;
  hasActiveHook?: boolean;
  videoRef?: RefObject<HTMLVideoElement | null>;
  playerContainerRef?: RefObject<HTMLDivElement | null>;
}

const DURATION_OPTIONS = [
  { value: 2, label: '2s', desc: 'Quick' },
  { value: 3, label: '3s', desc: 'Standard' },
  { value: 5, label: '5s', desc: 'Extended' },
  { value: 8, label: '8s', desc: 'Extended' },
];

export const HookLabPanel: React.FC<HookLabPanelProps> = ({
  isOpen, onClose, srtText, topicContext, apiKey, onApplyHook, onPreviewHook, onRemoveHook, hasActiveHook,
}) => {
  const [variants, setVariants] = useState<HookVariant[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [hookDuration, setHookDuration] = useState(3);
  const [hookMode, setHookMode] = useState<HookMode>('speaker');
  const [hookDesign, setHookDesign] = useState<HookDesign>('glassmorphism');
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!apiKey || !srtText) return;
    setIsGenerating(true);
    setError(null);
    setSelectedId(null);
    setEditingId(null);
    setEditedTexts({});
    try {
      const results = await generateHookVariants(srtText, topicContext, apiKey);
      setVariants(results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, srtText, topicContext]);

  const getHookText = (variant: HookVariant) => editedTexts[variant.id] || variant.hookText;

  const startEditing = (variant: HookVariant) => {
    setEditingId(variant.id);
    setEditText(getHookText(variant));
  };

  const saveEdit = (variantId: string) => {
    if (editText.trim()) {
      setEditedTexts(prev => ({ ...prev, [variantId]: editText.trim() }));
    }
    setEditingId(null);
  };

  const handlePreview = (variant: HookVariant) => {
    onPreviewHook({
      text: getHookText(variant), style: variant.style, hookMode, hookDesign,
      duration: hookDuration, backgroundVideoUrl: variant.backgroundVideoUrl,
      aiImageUrl: variant.aiImageUrl,
    });
  };

  const handleApply = (variant: HookVariant) => {
    setSelectedId(variant.id);
    onApplyHook({
      text: getHookText(variant), style: variant.style, hookMode, hookDesign,
      duration: hookDuration, backgroundVideoUrl: variant.backgroundVideoUrl,
      aiImageUrl: variant.aiImageUrl,
    });
  };

  // Generate AI image for a specific hook variant
  const handleGenerateImage = useCallback(async (variant: HookVariant) => {
    if (!apiKey) return;
    setGeneratingImageFor(variant.id);
    try {
      const imageUrl = await generateHookImage(
        getHookText(variant),
        variant.visualKeyword,
        apiKey
      );
      if (imageUrl) {
        setVariants(prev => prev.map(v =>
          v.id === variant.id ? { ...v, aiImageUrl: imageUrl } : v
        ));
        // Auto-switch to visual mode when image is generated
        setHookMode('visual');
      }
    } catch (err: any) {
      setError(`Image generation failed: ${err.message}`);
    } finally {
      setGeneratingImageFor(null);
    }
  }, [apiKey, editedTexts]);

  const getConfidenceBar = (score: number) => score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-orange-500';
  const getConfidenceColor = (score: number) => score >= 8 ? 'text-green-400' : score >= 6 ? 'text-yellow-400' : 'text-orange-400';

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

      <div
        className="relative pointer-events-auto w-full max-w-lg mb-4 mx-4 bg-[#0c0c10] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-slide-up"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-gradient-to-r from-amber-500/5 to-orange-500/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20">
              <Zap size={16} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Hook Lab</h3>
              <p className="text-[10px] text-gray-500">Viral hooks • 3 visual modes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveHook && onRemoveHook && (
              <button onClick={onRemoveHook} className="text-[10px] font-bold text-red-400 hover:text-red-300 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg transition-colors">
                Remove
              </button>
            )}
            <button onClick={() => { handleGenerate(); }} disabled={isGenerating || !apiKey} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black rounded-lg font-bold text-[11px] shadow-lg shadow-amber-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {variants.length > 0 ? 'Regenerate' : 'Generate Hooks'}
            </button>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Mode Selector + Duration Bar */}
        {variants.length > 0 && (
          <div className="px-4 py-3 border-b border-white/[0.04] bg-white/[0.01]">
            {/* Compact Settings Row */}
            <div className="flex items-center gap-3">
              {/* Mode — icon-only pills */}
              <div className="flex gap-0.5 bg-black/20 p-0.5 rounded-lg border border-white/[0.04]">
                {HOOK_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setHookMode(mode.id)}
                    className={`px-2 py-1.5 rounded-md text-xs transition-all ${
                      hookMode === mode.id
                        ? 'bg-amber-500/20 text-amber-400 shadow-sm'
                        : 'text-gray-600 hover:text-gray-300'
                    }`}
                    title={`${mode.name}: ${mode.description}`}
                  >
                    {mode.icon}
                  </button>
                ))}
              </div>

              {/* Duration — compact pills */}
              <div className="flex gap-0.5 bg-black/20 p-0.5 rounded-lg border border-white/[0.04]">
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setHookDuration(opt.value)}
                    className={`px-2 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                      hookDuration === opt.value
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'text-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Design — icon-only scrollable row */}
              <div className="flex gap-0.5 bg-black/20 p-0.5 rounded-lg border border-white/[0.04]">
                {HOOK_DESIGNS.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setHookDesign(d.id)}
                    className={`px-1.5 py-1.5 rounded-md text-xs transition-all ${
                      hookDesign === d.id
                        ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                        : 'text-gray-600 hover:text-gray-300'
                    }`}
                    title={d.name}
                  >
                    {d.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(85vh - 150px)' }}>
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex gap-2 items-start">
              <X size={12} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Empty State */}
          {variants.length === 0 && !isGenerating && (
            <div className="text-center py-10 space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-white/5">
                <Zap size={28} className="text-amber-400/40" />
              </div>
              <p className="text-sm text-gray-400 font-medium">Generate viral hook variants</p>
              <p className="text-[11px] text-gray-600 mt-1 max-w-xs mx-auto">
                3 modes: Speaker (text over video), AI Visual (generated backgrounds), Cinematic (dark overlay effects).
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {HOOK_MODES.map(m => (
                  <span key={m.id} className="text-[10px] px-2.5 py-1 bg-white/5 border border-white/5 rounded-full text-gray-500">
                    {m.icon} {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {isGenerating && (
            <div className="text-center py-10 space-y-3">
              <div className="relative inline-flex items-center justify-center w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                <Zap size={20} className="text-amber-400" />
              </div>
              <p className="text-xs text-gray-400">Creating 4 viral hooks...</p>
            </div>
          )}

          {/* Variant Cards */}
          {!isGenerating && variants.map((variant) => {
            const isSelected = selectedId === variant.id;
            const isEditing = editingId === variant.id;
            const styleInfo = HOOK_STYLES.find(s => s.id === variant.style);
            const displayText = getHookText(variant);
            const wasEdited = !!editedTexts[variant.id];
            const isGenImage = generatingImageFor === variant.id;

            return (
              <div
                key={variant.id}
                className={`relative rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isSelected
                    ? 'border-amber-500/50 shadow-[0_0_25px_-5px_rgba(245,158,11,0.3)]'
                    : 'border-white/[0.06] hover:border-white/15'
                }`}
              >
                {/* Live Animation Preview */}
                <div className="relative w-full bg-black overflow-hidden" style={{ height: 180 }}>
                  <div style={{ position: 'absolute', inset: 0, transformOrigin: 'center center' }}>
                    <HookOverlay
                      hookText={displayText}
                      hookStyle={variant.style}
                      hookMode={hookMode}
                      hookDesign={hookDesign}
                      currentTime={0.5}
                      previewScale={0.4}
                      backgroundVideoUrl={variant.backgroundVideoUrl}
                      aiImageUrl={variant.aiImageUrl}
                    />
                  </div>
                  {/* Style badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
                    <span className="text-sm">{styleInfo?.icon}</span>
                    <span className="text-[10px] font-bold text-white">{variant.styleName}</span>
                    {wasEdited && (
                      <span className="text-[8px] px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded font-bold">EDITED</span>
                    )}
                  </div>

                  {/* Mode badge */}
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
                    <span className="text-[8px] font-bold text-gray-400">
                      {HOOK_MODES.find(m => m.id === hookMode)?.icon} {HOOK_MODES.find(m => m.id === hookMode)?.name}
                    </span>
                    {variant.aiImageUrl && (
                      <span className="text-[8px] px-1 py-0.5 bg-purple-500/20 text-purple-400 rounded font-bold">AI IMG</span>
                    )}
                    {variant.backgroundVideoUrl && !variant.aiImageUrl && (
                      <span className="text-[8px] px-1 py-0.5 bg-cyan-500/20 text-cyan-400 rounded font-bold">🎬 BG</span>
                    )}
                  </div>

                  {/* Confidence */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
                    <div className="flex gap-[2px]">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`w-[3px] h-3 rounded-full ${i < variant.confidence ? getConfidenceBar(variant.confidence) : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <span className={`text-[11px] font-bold ml-0.5 ${getConfidenceColor(variant.confidence)}`}>{variant.confidence}</span>
                  </div>
                </div>

                {/* Info + Edit + Actions */}
                <div className="p-3 bg-white/[0.02]">
                  {/* Editable hook text */}
                  {isEditing ? (
                    <div className="mb-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-white/5 border border-amber-500/30 rounded-lg px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-amber-500/60 resize-none"
                        rows={2}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            saveEdit(variant.id);
                          }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <div className="flex gap-2 mt-1.5">
                        <button onClick={() => saveEdit(variant.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold border border-amber-500/20 hover:bg-amber-500/30 transition-colors">
                          <Check size={10} /> Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/5 text-gray-400 rounded-lg text-[10px] font-bold border border-white/5 hover:bg-white/10 transition-colors">
                          <X size={10} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="group/edit flex items-start gap-2 mb-2 cursor-pointer rounded-lg px-2 py-1.5 -mx-2 -mt-1 hover:bg-white/5 transition-colors"
                      onClick={() => startEditing(variant)}
                    >
                      <p className="text-white text-sm font-semibold leading-snug flex-1">"{displayText}"</p>
                      <Pencil size={12} className="text-gray-600 group-hover/edit:text-amber-400 transition-colors shrink-0 mt-1" />
                    </div>
                  )}

                  <p className="text-[10px] text-gray-500 mb-2 leading-relaxed">{variant.reason}</p>

                  {/* Actions Row */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreview(variant)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5 transition-all"
                    >
                      <Play size={10} /> Preview
                    </button>

                    {/* Generate AI Image button */}
                    <button
                      onClick={() => handleGenerateImage(variant)}
                      disabled={isGenImage}
                      className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/15 transition-all disabled:opacity-50"
                      title="Generate AI background image"
                    >
                      {isGenImage ? <Loader2 size={10} className="animate-spin" /> : <Image size={10} />}
                      {isGenImage ? '...' : 'AI BG'}
                    </button>

                    <button
                      onClick={() => handleApply(variant)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-black shadow-lg shadow-amber-900/30'
                          : 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 text-amber-400 hover:from-amber-600/30 hover:to-orange-600/30 border border-amber-500/20'
                      }`}
                    >
                      {isSelected ? <Check size={10} /> : <ChevronRight size={10} />}
                      {isSelected ? 'Applied!' : 'Apply'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {variants.length > 0 && !isGenerating && (
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <p className="text-[10px] text-gray-600 leading-relaxed">
                <span className="text-amber-400 font-bold">💡 Tip:</span> Switch between <strong className="text-gray-400">Speaker</strong> (text over your video), <strong className="text-gray-400">AI Visual</strong> (generated backgrounds), and <strong className="text-gray-400">Cinematic</strong> (dark overlay) modes. Click <strong className="text-purple-400">AI BG</strong> to generate a custom background image.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
