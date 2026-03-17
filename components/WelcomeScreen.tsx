
import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, AlertTriangle, ExternalLink, Gem, Zap, Layers, Sparkles } from 'lucide-react';
import { validateGeminiConnection } from '../services/geminiService';
import { APP_CONFIG } from '../config';

interface WelcomeScreenProps {
  onComplete: (apiKey: string | null, model?: string, saveManualMode?: boolean) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = APP_CONFIG.DEFAULT_MODEL;

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey && storedKey !== APP_CONFIG.DEFAULT_API_KEY) {
      setApiKey(storedKey);
    }
  }, []);

  const handleValidation = async () => {
    if (!apiKey.trim()) {
      setError("Please enter a valid API Key.");
      return;
    }

    setIsValidating(true);
    setError(null);

    const result = await validateGeminiConnection(apiKey, selectedModel);

    setIsValidating(false);

    if (result === true) {
      onComplete(apiKey, selectedModel);
    } else {
      setError(typeof result === 'string' ? result : "Connection failed. Please check your key.");
    }
  };

  const handleManualSkip = () => {
    onComplete(null);
  };

  const features = [
    { icon: Sparkles, label: 'AI Scene Generation', desc: 'Gemini-powered visuals from your script' },
    { icon: Layers, label: 'Multi-track Timeline', desc: 'Sync layouts, captions & animations' },
    { icon: Zap, label: 'One-Click Export', desc: 'FFmpeg rendering with background music' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-deep)] p-6 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-[-20%] left-[20%] w-[700px] h-[700px] bg-orange-900/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[15%] w-[500px] h-[500px] bg-red-900/6 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl w-full glass-panel-elevated rounded-[2rem] shadow-2xl shadow-black/20 relative z-10 animate-scale-in overflow-hidden">
        {/* Top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400/20 to-transparent" />

        <div className="flex flex-col lg:flex-row min-h-[520px]">
          {/* Left: Brand Section */}
          <div className="lg:w-[45%] p-10 lg:p-12 flex flex-col justify-center relative overflow-hidden">
            {/* Subtle animated glow */}
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-orange-500/8 rounded-full blur-[80px] animate-breathe" />

            <div className="relative z-10 space-y-8">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-primary)] flex items-center justify-center shadow-xl shadow-orange-900/30 animate-glow">
                  <Gem size={28} className="text-white drop-shadow-lg" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold tracking-tight text-white leading-none">
                    Motionify
                  </h1>
                  <span className="text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase">Creative Suite</span>
                </div>
              </div>

              {/* Tagline */}
              <p className="text-gray-400 text-lg font-light leading-relaxed max-w-sm">
                Transform scripts into cinematic short-form video with AI-powered scene design.
              </p>

              {/* Feature List */}
              <div className="space-y-4 pt-2">
                {features.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 animate-slide-up"
                    style={{ animationDelay: `${i * 100 + 200}ms`, animationFillMode: 'backwards' }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0 mt-0.5">
                      <f.icon size={14} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{f.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-white/8 to-transparent" />

          {/* Right: Auth Section */}
          <div className="lg:flex-1 p-10 lg:p-12 flex flex-col justify-center">
            <div className="space-y-8">
              {/* Step Indicator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-[var(--color-accent-primary)] text-white text-[10px] font-bold flex items-center justify-center">1</div>
                  <span className="text-xs font-medium text-white">Connect</span>
                </div>
                <div className="flex-1 h-px bg-white/10" />
                <div className="flex items-center gap-1.5 opacity-30">
                  <div className="w-6 h-6 rounded-full bg-white/10 text-gray-500 text-[10px] font-bold flex items-center justify-center">2</div>
                  <span className="text-xs text-gray-600">Upload</span>
                </div>
                <div className="flex-1 h-px bg-white/10" />
                <div className="flex items-center gap-1.5 opacity-30">
                  <div className="w-6 h-6 rounded-full bg-white/10 text-gray-500 text-[10px] font-bold flex items-center justify-center">3</div>
                  <span className="text-xs text-gray-600">Create</span>
                </div>
              </div>

              {/* API Key Input */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-semibold text-gray-300">Gemini API Key</label>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 font-medium transition-colors">
                    <ExternalLink size={11} /> Get Free Key
                  </a>
                </div>
                <div className="relative group">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleValidation()}
                    placeholder="Paste your API Key here (AIzaSy...)"
                    className="w-full input-base bg-black/50 px-5 py-4 text-white rounded-xl font-mono text-sm placeholder-gray-600 shadow-inner"
                  />
                  <div className="absolute inset-0 rounded-xl border border-orange-500/0 group-focus-within:border-orange-500/30 pointer-events-none transition-colors" />
                </div>

                <div className="flex items-start gap-2 px-1">
                  <ShieldCheck className="text-emerald-500/60 shrink-0 mt-0.5" size={13} />
                  <p className="text-[11px] text-gray-600 leading-tight">
                    Stored locally in your browser. Never sent to any external server.
                  </p>
                </div>

                {/* Step-by-step guide for new users */}
                <div className="mt-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">How to get your free key</p>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 w-4 h-4 rounded flex items-center justify-center shrink-0">1</span>
                      <p className="text-[10px] text-gray-500">Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-orange-400 underline">Google AI Studio</a></p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 w-4 h-4 rounded flex items-center justify-center shrink-0">2</span>
                      <p className="text-[10px] text-gray-500">Click <strong className="text-gray-400">"Create API Key"</strong> (sign in with Google)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 w-4 h-4 rounded flex items-center justify-center shrink-0">3</span>
                      <p className="text-[10px] text-gray-500">Copy and paste the key above — it's <strong className="text-gray-400">100% free</strong></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleValidation}
                disabled={isValidating}
                className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 active:scale-[0.99] ${isValidating
                    ? 'bg-gray-800 cursor-not-allowed text-gray-500'
                    : 'btn-primary'
                  }`}
              >
                {isValidating ? (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-orange-300/40 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <>Enter Studio <ArrowRight size={18} /></>
                )}
              </button>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center justify-center gap-2 animate-fade-in text-center">
                  <AlertTriangle size={14} className="shrink-0" /> {error}
                </div>
              )}

              {/* Manual Mode */}
              <div className="pt-4 border-t border-white/5 text-center">
                <button
                  onClick={handleManualSkip}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors group"
                >
                  Skip setup — <span className="underline decoration-gray-700 underline-offset-4 group-hover:decoration-gray-400">use manual mode</span>
                </button>
                <p className="text-[10px] text-gray-700 mt-1.5">Paste AI output manually. No API required.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
