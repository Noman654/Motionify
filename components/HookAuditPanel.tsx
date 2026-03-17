import React from 'react';
import { X, Eye, AlertTriangle, CheckCircle, Info, XCircle, Sparkles, ArrowRight } from 'lucide-react';
import { HookAuditResult, AuditIssue, AuditSeverity, AuditCategory } from '../services/hookAuditorService';

interface HookAuditPanelProps {
  result: HookAuditResult;
  frames: string[];
  onClose: () => void;
  onApplySuggestedStyle?: (style: string) => void;
  onApplySuggestion?: (suggestion: { design?: string; mode?: string; captionStyle?: string }) => void;
}

const SEVERITY_CONFIG: Record<AuditSeverity, { icon: typeof AlertTriangle; color: string; bg: string; border: string; label: string }> = {
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Critical' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Warning' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Info' },
  pass: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Pass' },
};

const CATEGORY_LABELS: Record<AuditCategory, { emoji: string; name: string }> = {
  readability: { emoji: '👁️', name: 'Text Readability' },
  occlusion: { emoji: '🙈', name: 'Face/Subject Occlusion' },
  hierarchy: { emoji: '📐', name: 'Visual Hierarchy' },
  timing: { emoji: '⏱️', name: 'Read Timing' },
  color: { emoji: '🎨', name: 'Color Harmony' },
  scroll_stop: { emoji: '🛑', name: 'Scroll-Stop Power' },
};

const getScoreColor = (score: number) => {
  if (score >= 8) return { ring: 'ring-green-500/40', text: 'text-green-400', glow: 'shadow-green-500/20', gradient: 'from-green-500 to-emerald-500' };
  if (score >= 6) return { ring: 'ring-amber-500/40', text: 'text-amber-400', glow: 'shadow-amber-500/20', gradient: 'from-amber-500 to-yellow-500' };
  if (score >= 4) return { ring: 'ring-orange-500/40', text: 'text-orange-400', glow: 'shadow-orange-500/20', gradient: 'from-orange-500 to-red-500' };
  return { ring: 'ring-red-500/40', text: 'text-red-400', glow: 'shadow-red-500/20', gradient: 'from-red-500 to-rose-600' };
};

const getVerdictConfig = (verdict: string) => {
  switch (verdict) {
    case 'pass': return { label: 'Hook Approved', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
    case 'warning': return { label: 'Needs Polish', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    case 'fail': return { label: 'Needs Rework', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
    default: return { label: 'Reviewed', icon: Eye, color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' };
  }
};

export const HookAuditPanel: React.FC<HookAuditPanelProps> = ({
  result, frames, onClose, onApplySuggestedStyle, onApplySuggestion,
}) => {
  const scoreColors = getScoreColor(result.overallScore);
  const verdictConfig = getVerdictConfig(result.verdict);
  const VerdictIcon = verdictConfig.icon;

  const severityOrder: AuditSeverity[] = ['critical', 'warning', 'info', 'pass'];
  const sortedIssues = [...result.issues].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto" onClick={onClose} />

      <div
        className="relative pointer-events-auto w-full max-w-lg mx-4 bg-[#0a0a0e] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden animate-scale-in"
        style={{ maxHeight: '88vh' }}
      >
        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${scoreColors.gradient} opacity-60`} />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${verdictConfig.bg} border ${verdictConfig.border} flex items-center justify-center`}>
                <Eye size={16} className={verdictConfig.color} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  AI Hook Review
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${verdictConfig.bg} ${verdictConfig.color} border ${verdictConfig.border}`}>
                    {verdictConfig.label}
                  </span>
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Gemini Vision Analysis</p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className={`relative w-16 h-16 shrink-0 rounded-2xl ring-2 ${scoreColors.ring} flex items-center justify-center ${scoreColors.glow} shadow-lg`}>
              <div className="text-center">
                <span className={`text-2xl font-black ${scoreColors.text}`}>{result.overallScore}</span>
                <span className="text-[8px] text-gray-500 block -mt-0.5">/10</span>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed flex-1">{result.summary}</p>
          </div>
        </div>

        {/* Frame Previews */}
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">📸 Captured Frames</p>
          <div className="flex gap-2">
            {frames.map((frame, i) => (
              <div key={i} className="flex-1 relative group">
                <img src={`data:image/jpeg;base64,${frame}`} alt={`Frame at ${i}s`}
                  className="w-full aspect-[9/16] object-cover rounded-lg border border-white/[0.06]" />
                <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-sm text-[8px] text-white px-1.5 py-0.5 rounded font-bold">{i}s</div>
              </div>
            ))}
          </div>
        </div>

        {/* Issues List */}
        <div className="overflow-y-auto px-5 py-3 space-y-2" style={{ maxHeight: 'calc(88vh - 400px)' }}>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">🔍 Detailed Findings</p>

          {sortedIssues.map((issue, i) => {
            const sevConfig = SEVERITY_CONFIG[issue.severity];
            const catConfig = CATEGORY_LABELS[issue.category] || { emoji: '📋', name: issue.category };
            const Icon = sevConfig.icon;

            return (
              <div key={i} className={`rounded-xl border ${sevConfig.border} ${sevConfig.bg} p-3`}>
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 shrink-0 ${sevConfig.color}`}><Icon size={14} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-gray-400">{catConfig.emoji} {catConfig.name}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${sevConfig.bg} ${sevConfig.color} border ${sevConfig.border}`}>{sevConfig.label}</span>
                      <span className="text-[8px] text-gray-600 ml-auto">Frame {issue.frameIndex}</span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed mb-1.5">{issue.description}</p>
                    <div className="flex items-start gap-1.5 bg-black/20 rounded-lg px-2.5 py-1.5 border border-white/[0.03]">
                      <ArrowRight size={9} className="text-cyan-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-cyan-300/80 leading-relaxed">
                        <span className="font-bold text-cyan-400">Fix: </span>{issue.fix}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ ACTIONABLE SUGGESTIONS FOOTER ═══ */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.02] space-y-2">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">💡 AI Suggestions — Click to Apply</p>

          <div className="flex flex-wrap gap-2">
            {/* Suggested Design */}
            {result.suggestedDesign && (
              <button
                onClick={() => onApplySuggestion?.({ design: result.suggestedDesign })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg text-[10px] font-bold text-orange-400 transition-all"
              >
                🎨 Design: <strong>{result.suggestedDesign.replace('_', ' ')}</strong>
                <ArrowRight size={9} />
              </button>
            )}

            {/* Suggested Mode */}
            {result.suggestedMode && (
              <button
                onClick={() => onApplySuggestion?.({ mode: result.suggestedMode })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-[10px] font-bold text-cyan-400 transition-all"
              >
                🎬 Mode: <strong>{result.suggestedMode}</strong>
                <ArrowRight size={9} />
              </button>
            )}

            {/* Suggested Caption Style */}
            {result.suggestedCaptionStyle && (
              <button
                onClick={() => {
                  onApplySuggestion?.({ captionStyle: result.suggestedCaptionStyle });
                  onApplySuggestedStyle?.(result.suggestedCaptionStyle);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-[10px] font-bold text-amber-400 transition-all"
              >
                ✨ Captions: <strong>{result.suggestedCaptionStyle}</strong>
                <ArrowRight size={9} />
              </button>
            )}

            {/* Apply ALL suggestions at once */}
            {onApplySuggestion && (
              <button
                onClick={() => onApplySuggestion({
                  design: result.suggestedDesign,
                  mode: result.suggestedMode,
                  captionStyle: result.suggestedCaptionStyle,
                })}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-orange-500/20 to-cyan-500/20 hover:from-orange-500/30 hover:to-cyan-500/30 border border-white/10 rounded-lg text-[10px] font-bold text-white transition-all"
              >
                ⚡ Apply All Suggestions
                <ArrowRight size={9} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
