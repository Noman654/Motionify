import React, { useState, useEffect } from 'react';
import { GeneratedContent, LayoutConfigStep, SRTItem } from '../types';
import { Code, Layout, Settings, Save, Download, Music, ExternalLink, Copy, CheckCircle2, Sparkles, MessageSquare, Trash2, FileAudio, Key, Edit2, X, Check, Bot, Zap, Cpu, BrainCircuit, ShieldAlert, Lock, RefreshCw, Search, Upload, Image as ImageIcon, AlertTriangle, Type, Palette, Loader2 } from 'lucide-react';
import { extractWavFromVideo } from '../utils/audioHelpers';
import { constructPrompt, constructPromptWithAssets } from '../utils/promptTemplates';
import { validateGeminiConnection } from '../services/geminiService';
import { APP_CONFIG } from '../config';
import { CaptionStylePicker } from './CaptionStylePicker';
import { DEFAULT_STYLE_ID } from '../utils/captionStyles';
import { BRollPanel } from './BRollPanel';
import { BRollClip } from '../services/brollService';
import { HOOK_DESIGNS } from '../services/hookService';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css';

interface EditorPanelProps {
  content: GeneratedContent;
  onUpdate: (newContent: GeneratedContent) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  videoFile: File | null;
  topicContext: string;
  onTopicContextChange: (text: string) => void;
  srtText: string;
  bgMusicName?: string;
  onBgMusicChange: (file: File | null) => void;
  bgMusicVolume: number;
  onBgVolumeChange: (vol: number) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  modelName: string;
  setModelName: (name: string) => void;
  onSaveApiKey: () => void;
  onPreviewOverride?: (html: string | null) => void;
  assets: import('../types').MediaAsset[];
  onAssetUpload: (files: File[]) => void;
  onRemoveAsset: (id: string) => void;
  // Subtitle Props
  srtData?: SRTItem[];
  onSrtDataUpdate?: (newData: SRTItem[]) => void;
  // Timeline Props
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  // Caption Style Props
  captionStyleId?: string;
  onCaptionStyleChange?: (styleId: string) => void;
  // B-Roll Props
  brollClips?: BRollClip[];
  onBRollClipsChange?: (clips: BRollClip[]) => void;
  // Animation Design Style
  animationDesign?: string;
  onAnimationDesignChange?: (style: string) => void;
  animationCache?: Record<string, GeneratedContent>;
  onRegenerateInStyle?: (style: string) => void;
  generatingStyle?: string | null;
  styleError?: { style: string; message: string } | null;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  content,
  onUpdate,
  isGenerating,
  onGenerate,
  videoFile,
  topicContext,
  onTopicContextChange,
  srtText,
  bgMusicName,
  onBgMusicChange,
  bgMusicVolume,
  onBgVolumeChange,
  apiKey,
  setApiKey,
  modelName,
  setModelName,
  onSaveApiKey,
  onPreviewOverride,
  assets = [],
  onAssetUpload,
  onRemoveAsset,
  srtData,
  onSrtDataUpdate,
  duration,
  currentTime,
  onSeek,
  captionStyleId = DEFAULT_STYLE_ID,
  onCaptionStyleChange,
  brollClips = [],
  onBRollClipsChange,
  animationDesign = '',
  onAnimationDesignChange,
  animationCache = {},
  onRegenerateInStyle,
  generatingStyle = null,
  styleError = null
}) => {
  const [activeTab, setActiveTab] = useState<'html' | 'config' | 'ai_audio' | 'assets' | 'subtitles' | 'broll'>('config');
  const [localConfig, setLocalConfig] = useState(JSON.stringify(content.layoutConfig, null, 2));
  const [localHtml, setLocalHtml] = useState(content.html);
  const [offlineHtml, setOfflineHtml] = useState<string | null>(null); // New state for inlined code
  const [viewMode, setViewMode] = useState<'original' | 'offline'>('original'); // Toggle state
  const [isExtracting, setIsExtracting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isGeneratingOffline, setIsGeneratingOffline] = useState(false); // Loading state for inline generation

  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  // Key Editing State
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [tempModel, setTempModel] = useState('');
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Subtitle inline editing
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [editingSubText, setEditingSubText] = useState('');

  const isDefaultKey = !apiKey || apiKey === APP_CONFIG.DEFAULT_API_KEY;
  const hasContent = content.html && content.html.length > 50; // heuristic check

  // Sync local state when content prop updates (e.g. after AI generation)
  useEffect(() => {
    setLocalConfig(JSON.stringify(content.layoutConfig, null, 2));
    setLocalHtml(content.html);
    // Invalidate offline cache on external update
    setOfflineHtml(null);
    if (viewMode === 'offline') setViewMode('original');
  }, [content]);

  // Sync Preview Logic
  useEffect(() => {
    if (!onPreviewOverride) return;

    if (viewMode === 'offline' && offlineHtml) {
      onPreviewOverride(offlineHtml);
    } else {
      onPreviewOverride(null);
    }
  }, [viewMode, offlineHtml, onPreviewOverride]);

  // Handle Local HTML Change (Invalidate Offline)
  const handleLocalHtmlChange = (newHtml: string) => {
    setLocalHtml(newHtml);
    if (offlineHtml) {
      setOfflineHtml(null); // Invalidate because source changed
    }
  };

  // Handle Offline HTML Change
  const handleOfflineHtmlChange = (newHtml: string) => {
    setOfflineHtml(newHtml);
    // Preview effect will pick this up automatically
  };

  // Init temp key state when editing starts
  useEffect(() => {
    if (isEditingKey) {
      setTempKey(isDefaultKey ? '' : apiKey); // Clear if default, show if custom
      setTempModel(modelName);
      setKeyError(null);
    }
  }, [isEditingKey, apiKey, modelName, isDefaultKey]);

  const handleSave = () => {
    try {
      const parsedConfig = JSON.parse(localConfig) as LayoutConfigStep[];
      onUpdate({
        ...content,
        html: localHtml,
        layoutConfig: parsedConfig
      });
    } catch (e) {
      alert("Invalid JSON in Config");
    }
  };

  const handleSaveKeyConfig = async () => {
    if (!tempKey.trim()) {
      setKeyError("Please enter a custom API Key.");
      return;
    }
    setIsValidatingKey(true);
    setKeyError(null);

    const isValid = await validateGeminiConnection(tempKey, tempModel);

    setIsValidatingKey(false);

    if (isValid) {
      setApiKey(tempKey);
      setModelName(tempModel);
      setTimeout(() => onSaveApiKey(), 0);
      setIsEditingKey(false);
    } else {
      setKeyError("Connection failed. Check key/model.");
    }
  };

  const extractAndDownloadAudio = async () => {
    if (!videoFile) return;
    setIsExtracting(true);
    try {
      await extractWavFromVideo(videoFile);
    } catch (e) {
      alert("Failed to extract audio.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopyPrompt = () => {
    const prompt = constructPromptWithAssets(topicContext, srtText, assets);
    navigator.clipboard.writeText(prompt);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onBgMusicChange(e.target.files[0]);
    }
  };

  const handleRemoveMusic = () => {
    onBgMusicChange(null);
  };

  const handleSearch = () => {
    if (!searchTerm) return;

    // react-simple-code-editor creates a textarea with this id
    const textarea = document.getElementById('html-editor-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const text = textarea.value;
    const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());

    if (index !== -1) {
      textarea.focus();
      textarea.setSelectionRange(index, index + searchTerm.length);
      // Scroll to approximate position
      textarea.scrollTop = (index / text.length) * textarea.scrollHeight;
    }
  };

  const formatHtml = (html: string): string => {
    try {
      // Simple HTML formatting
      let formatted = html;
      let indent = 0;
      const tab = '  ';

      formatted = formatted.replace(/>\s*</g, '><'); // Remove whitespace between tags
      formatted = formatted.replace(/></g, '>\n<'); // Add newlines

      const lines = formatted.split('\n');
      const result = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';

        // Decrease indent for closing tags
        if (trimmed.startsWith('</')) {
          indent = Math.max(0, indent - 1);
        }

        const indented = tab.repeat(indent) + trimmed;

        // Increase indent for opening tags (but not self-closing or immediately closed)
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.match(/<[^>]+>[^<]*<\/[^>]+>/)) {
          indent++;
        }

        return indented;
      }).join('\n');

      return result;
    } catch (e) {
      return html;
    }
  };

  // Custom syntax highlighting for HTML with better colors
  const highlightHTML = (code: string) => {
    try {
      return highlight(code, languages.markup, 'markup');
    } catch (e) {
      return code;
    }
  };

  const highlightJSON = (code: string) => {
    try {
      return highlight(code, languages.javascript, 'javascript');
    } catch (e) {
      return code;
    }
  };

  /* ... (generating offline) ... */
  const generateOfflineHtml = async () => {
    if (window.electron?.getInlineHtml) {
      setIsGeneratingOffline(true);
      try {
        const result = await window.electron.getInlineHtml(localHtml);
        if (result.success) {
          setOfflineHtml(result.html);
          setViewMode('offline');
        } else {
          alert('Failed to generate offline HTML');
        }
      } catch (e) {
        console.error(e);
        alert('Error generating offline HTML');
      } finally {
        setIsGeneratingOffline(false);
      }
    } else {
      alert('This feature requires the Desktop App.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-surface-0)]">
      {/* ... styles ... */}
      {/* Custom CSS for Prism theme customization */}
      <style>{`
        .prism-code pre[class*="language-"] {
          background: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .prism-code code[class*="language-"] {
          background: transparent !important;
          color: #93c5fd !important;
          font-size: 14px !important;
          line-height: 1.6 !important;
          font-family: Monaco, Menlo, "Ubuntu Mono", Consolas, monospace !important;
        }

        /* Enhanced syntax colors */
        .token.tag { color: #f472b6 !important; font-weight: 500; }
        .token.attr-name { color: #fbbf24 !important; font-style: italic; }
        .token.attr-value { color: #86efac !important; }
        .token.punctuation { color: #93c5fd !important; }
        .token.comment { color: #6b7280 !important; font-style: italic; }
        .token.string { color: #86efac !important; }
        .token.keyword { color: #c084fc !important; font-weight: 600; }
        .token.function { color: #60a5fa !important; }
        .token.number { color: #fb923c !important; }
        .token.property { color: #fbbf24 !important; }
        .token.boolean { color: #fb923c !important; }
        .token.operator { color: #93c5fd !important; }

        /* Editor container */
        .visual-editor-container {
          background: #0a0a0f !important;
          border-radius: 8px;
          overflow: hidden;
        }

        .visual-editor-container textarea {
          outline: none !important;
          caret-color: #93c5fd !important;
        }

        .visual-editor-container pre {
          pointer-events: none !important;
        }
      `}</style>

      <div className="flex border-b border-white/[0.05] bg-[var(--color-bg-surface-1)] p-2.5 sticky top-0 z-20 backdrop-blur-xl">
        <div className="w-full flex bg-black/30 p-0.5 rounded-xl border border-white/[0.04]">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 ${activeTab === 'config' || activeTab === 'ai_audio' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Layout size={13} /> <span>Design</span>
          </button>
          <button
            onClick={() => setActiveTab('html')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 ${activeTab === 'html' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Code size={13} /> <span>Code</span>
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 ${activeTab === 'assets' || activeTab === 'subtitles' || activeTab === 'broll' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <ImageIcon size={13} /> <span>Media</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 relative">
        {(activeTab === 'config' || activeTab === 'ai_audio') && (
          <div className="space-y-4 text-sm">

            {/* ─── Animation Style Switcher ─── */}
            {onAnimationDesignChange && (
              <div className="border border-white/[0.06] p-4 rounded-xl space-y-3 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2 text-[11px] uppercase tracking-wider">
                    <Palette size={13} className="text-purple-400" /> Animation Style
                  </h3>
                  {generatingStyle && (
                    <span className="text-[9px] text-purple-400 font-medium flex items-center gap-1 animate-pulse">
                      <Loader2 size={9} className="animate-spin" /> Generating...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {/* Default Style */}
                  {(() => {
                    const isGen = generatingStyle === 'default';
                    const isCached = !!animationCache['default'];
                    return (
                      <button
                        onClick={() => onAnimationDesignChange('')}
                        disabled={!!generatingStyle}
                        className={`relative text-left p-3 rounded-xl transition-all ${
                          !animationDesign
                            ? 'bg-cyan-500/10 border border-cyan-500/25 ring-1 ring-cyan-500/10'
                            : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]'
                        } ${generatingStyle ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {isGen ? (
                            <Loader2 size={14} className="animate-spin text-cyan-400" />
                          ) : (
                            <span className="text-sm">⚡</span>
                          )}
                          <div>
                            <p className="text-[11px] font-bold text-white">Default</p>
                            <p className="text-[9px] text-gray-500">Dark neon, pulse & glow</p>
                          </div>
                        </div>
                        {isCached && !isGen && (
                          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        )}
                      </button>
                    );
                  })()}

                  {/* Design Styles */}
                  {HOOK_DESIGNS.map(d => {
                    const isCached = !!animationCache[d.id];
                    const isActive = animationDesign === d.id;
                    const isGen = generatingStyle === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => onAnimationDesignChange(d.id)}
                        disabled={!!generatingStyle}
                        className={`relative text-left p-3 rounded-xl transition-all ${
                          isActive
                            ? 'bg-purple-500/10 border border-purple-500/25 ring-1 ring-purple-500/10'
                            : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]'
                        } ${generatingStyle ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {isGen ? (
                            <Loader2 size={14} className="animate-spin text-purple-400" />
                          ) : (
                            <span className="text-sm">{d.icon}</span>
                          )}
                          <div>
                            <p className="text-[11px] font-bold text-white">{d.name}</p>
                            <p className="text-[9px] text-gray-500">{d.description}</p>
                          </div>
                        </div>
                        {isCached && !isGen && (
                          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-400 rounded-full" title="Cached — instant" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Error display */}
                {styleError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 animate-fade-in">
                    <AlertTriangle size={12} className="text-red-400 shrink-0" />
                    <p className="text-[10px] text-red-300 flex-1 leading-tight">
                      Failed to generate <span className="font-bold">{styleError.style}</span>: {styleError.message}
                    </p>
                    <button
                      onClick={() => onRegenerateInStyle && onRegenerateInStyle(styleError.style === 'default' ? '' : styleError.style)}
                      className="text-[9px] text-red-400 hover:text-red-300 font-bold shrink-0 px-2 py-1 bg-red-500/10 rounded-md hover:bg-red-500/20 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Layout Config Editor */}
            <div className="accordion-section">
              <button
                onClick={() => setActiveTab(activeTab === 'config' ? 'ai_audio' : 'config')}
                className="accordion-header w-full"
              >
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Layout size={12} /> Layout JSON
                </span>
                <span className="text-[10px] text-gray-600">{activeTab === 'config' ? '▼' : '▶'}</span>
              </button>
              {activeTab === 'config' && (
                <div className="visual-editor-container border-t border-white/[0.04] bg-[var(--color-bg-deep)]" style={{ maxHeight: '280px', overflow: 'auto' }}>
                  <div className="prism-code">
                    <Editor
                      value={localConfig}
                      onValueChange={setLocalConfig}
                      highlight={highlightJSON}
                      padding={16}
                      style={{
                        minHeight: '100%',
                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
                        fontSize: 12,
                        lineHeight: 1.6,
                        background: 'transparent'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Visual Context / Refinement Instructions */}
            <div className={`p-4 rounded-xl space-y-3 transition-all relative overflow-hidden ${hasContent ? 'border border-purple-500/20 bg-purple-500/5' : 'border border-white/[0.06] bg-white/[0.02]'}`}>
              <div className="flex justify-between items-center relative z-10">
                <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                  {hasContent ? <><RefreshCw size={14} className="text-purple-400" /> Refine Scene</> : <><Edit2 size={14} className="text-gray-400" /> Visual Context</>}
                </h3>
              </div>

              <textarea
                value={topicContext}
                onChange={(e) => onTopicContextChange(e.target.value)}
                className="w-full h-20 input-base bg-black/30 p-3 text-xs text-gray-300 resize-none rounded-xl placeholder:text-gray-600"
                placeholder={hasContent ? "Describe changes to make..." : "Describe your topic..."}
              />

              <div className="flex gap-2 relative z-10">
                <button
                  onClick={handleCopyPrompt}
                  className="flex-1 glass-button py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 text-gray-300 hover:text-white font-medium"
                >
                  {copySuccess ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                  {copySuccess ? "Copied!" : "Copy Prompt"}
                </button>
              </div>
            </div>

            {/* Internal Generator & Settings */}
            <div className="border border-white/[0.06] p-4 rounded-xl space-y-3 relative overflow-hidden bg-white/[0.02]">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
              <div className="absolute top-4 right-4 p-2 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                <Sparkles size={24} className="text-purple-400/20 group-hover:text-purple-400/40 transform rotate-12" />
              </div>

              <div className="flex items-center justify-between relative z-10">
                <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider text-purple-200">
                  <Sparkles size={14} className="text-purple-400" /> Internal Generator
                </h3>
                {!isEditingKey && (
                  <button
                    onClick={() => setIsEditingKey(true)}
                    className="text-[10px] text-gray-500 hover:text-white transition-colors flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full hover:bg-white/10"
                    title="Edit API Key"
                  >
                    <Edit2 size={10} /> {isDefaultKey ? "Add Key" : "Edit Key"}
                  </button>
                )}
              </div>

              {!isEditingKey ? (
                // Display Mode
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                      <Key size={12} className={isDefaultKey ? "text-yellow-500" : "text-emerald-500"} />
                      <span className={isDefaultKey ? "text-yellow-400 font-medium" : "font-mono text-emerald-400 tracking-tight"}>
                        {isDefaultKey ? 'No Key Set' : `•••• ${apiKey.slice(-4)}`}
                      </span>
                    </div>
                    <div className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/5 font-medium">
                      {modelName}
                    </div>
                  </div>

                  <button
                    onClick={onGenerate}
                    disabled={isGenerating || !apiKey}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all relative overflow-hidden ${!apiKey
                      ? 'bg-white/[0.04] text-gray-600 cursor-not-allowed border border-white/5'
                      : 'btn-primary'
                      }`}
                  >
                    {isGenerating ? <div className="w-4 h-4 border-2 border-purple-400/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={14} />}
                    <span className="relative z-10">{hasContent ? "Update Scene" : "Generate Scene"}</span>
                  </button>
                </div>
              ) : (
                // Edit Mode
                <div className="space-y-3 animate-fade-in relative z-10 bg-black/40 p-4 rounded-xl border border-white/10">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-[10px] uppercase text-gray-500 font-semibold">API Key</label>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
                        Get Key <ExternalLink size={8} />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={tempKey}
                      onChange={(e) => setTempKey(e.target.value)}
                      placeholder={isDefaultKey ? "Paste your Gemini API Key..." : ""}
                      className="w-full input-base bg-black/60 px-3 py-2.5 text-xs rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-gray-500 font-semibold">Model</label>
                    <select
                      value={tempModel}
                      onChange={(e) => setTempModel(e.target.value)}
                      className="w-full input-base bg-black/60 px-3 py-2.5 text-xs rounded-lg appearance-none"
                    >
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      <option value="gemini-2.0-pro-exp">Gemini 2.0 Pro (Exp)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      <option value="custom">Custom...</option>
                    </select>
                    {tempModel === 'custom' && (
                      <input
                        type="text"
                        placeholder="Enter model string..."
                        className="w-full mt-2 input-base bg-black/60 px-3 py-2.5 text-xs rounded-lg"
                        onChange={(e) => setTempModel(e.target.value)}
                      />
                    )}
                  </div>

                  {keyError && <div className="text-xs text-red-400 flex items-center gap-1 bg-red-900/20 p-2 rounded-lg border border-red-500/20"><X size={12} /> {keyError}</div>}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setIsEditingKey(false)}
                      className="flex-1 glass-button py-2 rounded-lg text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveKeyConfig}
                      disabled={isValidatingKey}
                      className="flex-1 bg-white hover:bg-gray-200 text-black py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-lg"
                    >
                      {isValidatingKey ? <div className="w-3 h-3 border-2 border-gray-400 border-t-black rounded-full animate-spin" /> : <Check size={12} />}
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>



            {/* Audio Tools */}
            <div className="glass-panel p-4 rounded-xl space-y-3">
              <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                <Music size={14} className="text-pink-400" /> Audio Tools
              </h3>

              <button
                onClick={extractAndDownloadAudio}
                disabled={isExtracting}
                className="w-full flex items-center justify-center gap-2 glass-button py-2.5 rounded-lg text-white text-xs font-medium hover:bg-white/10"
              >
                {isExtracting ? (
                  <span className="animate-pulse">Extracting...</span>
                ) : (
                  <>
                    <Download size={14} /> Extract WAV from Video
                  </>
                )}
              </button>

              <div className="flex justify-between gap-2 mt-2">
                <a href="https://transcri.io/en/subtitle-generator/srt" target="_blank" rel="noreferrer" className="flex-1 glass-button py-2 rounded-lg text-xs text-center text-gray-300 hover:text-white">
                  Transcri.io
                </a>
                <a href="https://podcast.adobe.com/enhance" target="_blank" rel="noreferrer" className="flex-1 glass-button py-2 rounded-lg text-xs text-center text-gray-300 hover:text-white">
                  Adobe Enhance
                </a>
              </div>
            </div>

            {/* Background Music */}
            <div className="border border-white/[0.06] p-4 rounded-xl space-y-3 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2 text-[11px] uppercase tracking-wider">
                  <Music size={12} className="text-fuchsia-400" /> Background Music
                </h3>
                <span className="text-[10px] text-gray-600 font-mono">{(bgMusicVolume * 100).toFixed(0)}%</span>
              </div>

              {bgMusicName ? (
                <div className="flex items-center justify-between bg-black/30 border border-white/5 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileAudio size={13} className="text-fuchsia-400 flex-shrink-0" />
                    <span className="text-xs text-white truncate">{bgMusicName}</span>
                  </div>
                  <button
                    onClick={handleRemoveMusic}
                    className="p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition-colors"
                    title="Remove Music"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full p-2.5 border border-dashed border-white/10 rounded-lg text-xs text-gray-500 hover:text-white hover:border-white/20 cursor-pointer transition-colors hover:bg-white/[0.03]">
                  <Music size={13} /> Upload Music
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleMusicUpload}
                    className="hidden"
                  />
                </label>
              )}

              <input
                type="range"
                min="0" max="1" step="0.05"
                value={bgMusicVolume}
                onChange={(e) => onBgVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
              />
            </div>

          </div>
        )}

        {activeTab === 'html' && (
          <div className="flex flex-col h-full space-y-2">
            {/* HTML Editor Toolbar */}
            <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-lg border border-white/[0.04] shrink-0">
              <button
                onClick={() => setSearchVisible(!searchVisible)}
                className="px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 rounded-md text-[11px] flex items-center gap-1.5 transition-colors border border-white/[0.06]"
                title="Toggle Search"
              >
                <Search size={12} />
                Search
              </button>

              <div className="h-4 w-px bg-white/[0.06] mx-0.5" />

              <div className="flex bg-black/30 rounded-lg p-0.5 border border-white/[0.04]">
                <button
                  onClick={() => setViewMode('original')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${viewMode === 'original' ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Original
                </button>
                <button
                  onClick={() => {
                    if (!offlineHtml) generateOfflineHtml();
                    else setViewMode('offline');
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${viewMode === 'offline' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {isGeneratingOffline ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Zap size={10} />}
                  Offline
                </button>
              </div>

              <div className="flex-1" />

              {viewMode === 'original' && (
                <button
                  onClick={() => setLocalHtml(formatHtml(localHtml))}
                  className="px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-md text-[11px] flex items-center gap-1.5 transition-colors border border-purple-500/20"
                  title="Format HTML"
                >
                  <Code size={12} />
                  Format
                </button>
              )}

              <span className="text-[9px] text-gray-600 font-mono">
                {(viewMode === 'original' ? localHtml : (offlineHtml || '')).split('\n').length}L
              </span>
            </div>

            {/* Search Bar */}
            {searchVisible && (
              <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/[0.04] animate-fade-in shrink-0">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search in HTML..."
                  className="flex-1 bg-transparent border-none text-xs text-white focus:ring-0 outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 rounded-md text-xs transition-colors font-medium border border-purple-500/20"
                >
                  Find
                </button>
              </div>
            )}

            {/* HTML Visual Editor */}
            <div className="flex-1 visual-editor-container border border-white/[0.04] rounded-xl relative overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto custom-scrollbar">
                <div className="prism-code min-h-full">
                  <Editor
                    value={viewMode === 'original' ? localHtml : (offlineHtml || 'Generating offline version...')}
                    onValueChange={viewMode === 'original' ? handleLocalHtmlChange : handleOfflineHtmlChange}
                    highlight={highlightHTML}
                    padding={16}
                    style={{
                      minHeight: '100%',
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
                      fontSize: 13,
                      lineHeight: 1.6,
                      background: '#07070c',
                      pointerEvents: isGeneratingOffline ? 'none' : 'auto',
                      opacity: isGeneratingOffline ? 0.8 : 1
                    }}
                    textareaId="html-editor-textarea"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subtitles' && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                <Type size={14} className="text-yellow-400" /> Subtitles
              </h3>
              {srtData && <span className="text-[10px] text-gray-500 font-mono">{srtData.length} items</span>}
            </div>

            {/* Caption Style Picker */}
            {onCaptionStyleChange && (
              <div className="mb-4">
                <CaptionStylePicker
                  selectedStyleId={captionStyleId}
                  onStyleChange={onCaptionStyleChange}
                />
              </div>
            )}

            {!srtData || srtData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Type size={32} className="mx-auto opacity-20 mb-3" />
                <p className="text-xs">No subtitles loaded.</p>
                <p className="text-[10px] text-gray-600 mt-1">Upload an SRT file in the upload step.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {srtData.map((item) => {
                  const isActive = currentTime >= item.startTime && currentTime < item.endTime;
                  const isEditing = editingSubId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`group rounded-lg border transition-all ${isActive
                        ? 'bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_12px_-4px_rgba(234,179,8,0.3)]'
                        : 'bg-black/20 border-white/5 hover:border-white/15 hover:bg-black/30'
                        }`}
                    >
                      {/* Time + Controls Row */}
                      <div className="flex items-center justify-between px-3 pt-2 pb-1">
                        <button
                          onClick={() => onSeek(item.startTime)}
                          className="text-[10px] font-mono text-gray-500 hover:text-yellow-400 transition-colors cursor-pointer"
                          title="Jump to this subtitle"
                        >
                          {item.startTime.toFixed(1)}s → {item.endTime.toFixed(1)}s
                        </button>
                        {!isEditing ? (
                          <button
                            onClick={() => {
                              setEditingSubId(item.id);
                              setEditingSubText(item.text);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-500 hover:text-white transition-all flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full hover:bg-white/10"
                          >
                            <Edit2 size={9} /> Edit
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingSubId(null)}
                              className="text-[10px] text-gray-500 hover:text-red-400 transition-colors p-0.5"
                              title="Cancel"
                            >
                              <X size={12} />
                            </button>
                            <button
                              onClick={() => {
                                if (onSrtDataUpdate) {
                                  onSrtDataUpdate(
                                    srtData.map(s => s.id === item.id ? { ...s, text: editingSubText } : s)
                                  );
                                }
                                setEditingSubId(null);
                              }}
                              className="text-[10px] text-green-400 hover:text-green-300 transition-colors p-0.5"
                              title="Save"
                            >
                              <Check size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Text Content */}
                      <div className="px-3 pb-2">
                        {isEditing ? (
                          <textarea
                            value={editingSubText}
                            onChange={(e) => setEditingSubText(e.target.value)}
                            className="w-full bg-black/40 border border-yellow-500/30 rounded-md p-2 text-xs text-white resize-none focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30"
                            rows={2}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (onSrtDataUpdate) {
                                  onSrtDataUpdate(
                                    srtData.map(s => s.id === item.id ? { ...s, text: editingSubText } : s)
                                  );
                                }
                                setEditingSubId(null);
                              }
                              if (e.key === 'Escape') {
                                setEditingSubId(null);
                              }
                            }}
                          />
                        ) : (
                          <p
                            className={`text-xs leading-relaxed cursor-pointer ${isActive ? 'text-yellow-200 font-medium' : 'text-gray-400'
                              }`}
                            onClick={() => {
                              setEditingSubId(item.id);
                              setEditingSubText(item.text);
                            }}
                            title="Click to edit"
                          >
                            {item.text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="flex flex-col h-full space-y-4">
            {/* Sub-tabs for Media */}
            <div className="flex bg-white/[0.02] p-0.5 rounded-lg border border-white/[0.04] w-fit">
              <button
                onClick={() => setActiveTab('assets')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${activeTab === 'assets' ? 'bg-white/[0.06] text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                🖼 Assets
              </button>
              <button
                onClick={() => setActiveTab('subtitles')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${activeTab === 'subtitles' ? 'bg-white/[0.06] text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                📝 Subtitles
              </button>
              <button
                onClick={() => setActiveTab('broll')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${activeTab === 'broll' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'text-gray-500 hover:text-gray-300'}`}
              >
                🎬 B-Roll
              </button>
            </div>

            {/* Upload Area */}
            <div className="p-4 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors group cursor-pointer relative overflow-hidden">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onAssetUpload(Array.from(e.target.files));
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="p-3 bg-purple-500/20 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <Upload size={24} className="text-purple-400" />
              </div>
              <p className="text-sm font-medium text-gray-300">Click or Drag to Upload Assets</p>
              <p className="text-xs text-gray-500 mt-1">Images (PNG, JPG) & Videos (MP4, WebM)</p>
            </div>

            {/* Asset Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {assets.length === 0 ? (
                <div className="text-center text-gray-500 py-10 flex flex-col items-center">
                  <ImageIcon size={32} className="opacity-20 mb-2" />
                  <p className="text-xs">No assets uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {assets.map(asset => (
                    <div key={asset.id} className="group relative bg-black/40 border border-white/5 rounded-xl overflow-hidden aspect-square">
                      {/* Thumbnail */}
                      {asset.type === 'image' ? (
                        <img src={asset.url} alt={asset.name} className="w-full h-full object-contain p-2" />
                      ) : (
                        <video src={asset.url} className="w-full h-full object-cover opacity-60" />
                      )}

                      {/* Overlay Controls */}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                        <span className="text-[10px] text-gray-300 w-full truncate text-center font-mono">{asset.name}</span>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(asset.type === 'image'
                              ? `<img src="${asset.name}" class="absolute top-1/2 left-1/2 w-32" />`
                              : `<video src="${asset.name}" autoplay muted loop class="absolute top-0 left-0 w-full h-full object-cover" />`
                            );
                          }}
                          className="bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 hover:scale-105 transition-transform"
                        >
                          <Copy size={10} /> Copy Code
                        </button>

                        <button
                          onClick={() => onRemoveAsset(asset.id)}
                          className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-900/30 rounded-full transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Type Badge */}
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] uppercase font-bold text-gray-400">
                        {asset.type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-[10px] text-gray-500 bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/10 flex gap-2">
              <AlertTriangle size={12} className="text-yellow-500 shrink-0" />
              <p>Assets are stored in memory. Reloading the page will clear them.</p>
            </div>
          </div>
        )}

        {activeTab === 'broll' && (
          <div className="flex flex-col h-full">
            {/* Sub-tabs for Media */}
            <div className="flex bg-white/[0.02] p-0.5 rounded-lg border border-white/[0.04] w-fit mb-3">
              <button
                onClick={() => setActiveTab('assets')}
                className="px-3 py-1.5 rounded-md text-[10px] font-bold text-gray-500 hover:text-gray-300 transition-all"
              >
                🖼 Assets
              </button>
              <button
                onClick={() => setActiveTab('subtitles')}
                className="px-3 py-1.5 rounded-md text-[10px] font-bold text-gray-500 hover:text-gray-300 transition-all"
              >
                📝 Subtitles
              </button>
              <button
                onClick={() => setActiveTab('broll')}
                className="px-3 py-1.5 rounded-md text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 transition-all"
              >
                🎬 B-Roll
              </button>
            </div>
            {onBRollClipsChange && (
              <BRollPanel
                srtText={srtData?.map(s => `${s.id}\n${s.startTime} --> ${s.endTime}\n${s.text}`).join('\n\n') || ''}
                topicContext={topicContext}
                apiKey={apiKey}
                brollClips={brollClips}
                onBRollClipsChange={onBRollClipsChange}
              />
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/[0.05] bg-[var(--color-bg-surface-1)]">
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 btn-primary py-2.5 rounded-xl font-bold text-sm"
        >
          <Save size={14} /> Apply Changes
        </button>
      </div>
    </div>
  );
};