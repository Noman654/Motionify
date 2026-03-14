import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff, Check, AlertCircle, Sparkles, Camera } from 'lucide-react';
import { setPexelsApiKey, hasPexelsApiKey } from '../services/pexelsService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  onSaveApiKey: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  setApiKey,
  onSaveApiKey,
}) => {
  const [geminiKey, setGeminiKey] = useState(apiKey);
  const [pexelsKey, setPexelsKey] = useState('');
  const [showGemini, setShowGemini] = useState(false);
  const [showPexels, setShowPexels] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(apiKey);
      setPexelsKey(localStorage.getItem('pexels_api_key') || '');
      setSaved(false);
    }
  }, [isOpen, apiKey]);

  const handleSave = () => {
    // Save Gemini key
    setApiKey(geminiKey);
    if (geminiKey) {
      localStorage.setItem('gemini_api_key', geminiKey);
    } else {
      localStorage.removeItem('gemini_api_key');
    }

    // Save Pexels key
    if (pexelsKey.trim()) {
      setPexelsApiKey(pexelsKey.trim());
    } else {
      localStorage.removeItem('pexels_api_key');
    }

    onSaveApiKey();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 bg-[#0c0c10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-gradient-to-r from-violet-500/5 to-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center border border-violet-500/20">
              <Key size={18} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Settings</h3>
              <p className="text-[10px] text-gray-500">API Keys & Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Gemini API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-white">
                <Sparkles size={13} className="text-blue-400" />
                Gemini API Key
                <span className="text-[9px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded font-bold">REQUIRED</span>
              </label>
              {geminiKey && (
                <span className="text-[9px] px-1.5 py-0.5 bg-green-500/15 text-green-400 rounded-full font-bold flex items-center gap-1">
                  <Check size={8} /> Connected
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showGemini ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.07] transition-all font-mono"
              />
              <button
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showGemini ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              Powers AI scene generation, subtitles & hook text.{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 underline"
              >
                Get free key →
              </a>
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.04]" />

          {/* Pexels API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-white">
                <Camera size={13} className="text-cyan-400" />
                Pexels API Key
                <span className="text-[9px] px-1.5 py-0.5 bg-gray-500/15 text-gray-400 rounded font-bold">OPTIONAL</span>
              </label>
              {pexelsKey && (
                <span className="text-[9px] px-1.5 py-0.5 bg-green-500/15 text-green-400 rounded-full font-bold flex items-center gap-1">
                  <Check size={8} /> Connected
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPexels ? 'text' : 'password'}
                value={pexelsKey}
                onChange={(e) => setPexelsKey(e.target.value)}
                placeholder="Enter Pexels API key..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.07] transition-all font-mono"
              />
              <button
                onClick={() => setShowPexels(!showPexels)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPexels ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              Enables stock video backgrounds for Hook Lab & B-Roll.{' '}
              <a
                href="https://www.pexels.com/api/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Get free key →
              </a>
            </p>
          </div>

          {/* Info */}
          {!geminiKey && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
              <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-300/80 leading-relaxed">
                Without a Gemini API key, you can still use Manual Mode — upload your video and add subtitles manually.
              </p>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg shadow-violet-900/30'
            }`}
          >
            {saved ? (
              <span className="flex items-center justify-center gap-2">
                <Check size={16} /> Saved!
              </span>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
