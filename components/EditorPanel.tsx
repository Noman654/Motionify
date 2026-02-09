import React, { useState, useEffect } from 'react';
import { GeneratedContent, LayoutConfigStep } from '../types';
import { Code, Layout, Settings, Save, Download, Music, ExternalLink, Copy, CheckCircle2, Sparkles, MessageSquare, Trash2, FileAudio, Key, Edit2, X, Check, Bot, Zap, Cpu, BrainCircuit, ShieldAlert, Lock, RefreshCw, Search } from 'lucide-react';
import { extractWavFromVideo } from '../utils/audioHelpers';
import { constructPrompt } from '../utils/promptTemplates';
import { validateGeminiConnection } from '../services/geminiService';
import { APP_CONFIG } from '../config';
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
  onPreviewOverride
}) => {
  const [activeTab, setActiveTab] = useState<'html' | 'config' | 'ai_audio'>('config');
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
    const prompt = constructPrompt(topicContext, srtText);
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
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800">
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

      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm font-medium ${activeTab === 'config' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <Layout size={16} /> Layout
        </button>
        <button
          onClick={() => setActiveTab('html')}
          className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm font-medium ${activeTab === 'html' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <Code size={16} /> HTML
        </button>
        <button
          onClick={() => setActiveTab('ai_audio')}
          className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm font-medium ${activeTab === 'ai_audio' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <Settings size={16} /> AI & Audio
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 relative">
        {activeTab === 'config' && (
          <div className="h-full visual-editor-container border border-gray-800">
            <div className="prism-code">
              <Editor
                value={localConfig}
                onValueChange={setLocalConfig}
                highlight={highlightJSON}
                padding={16}
                style={{
                  minHeight: '100%',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
                  fontSize: 14,
                  lineHeight: 1.6,
                  background: '#0a0a0f'
                }}
              />
            </div>
          </div>
        )}
        {activeTab === 'html' && (
          <div className="flex flex-col h-full space-y-2 -m-4 p-4">
            {/* HTML Editor Toolbar */}
            <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded border border-gray-700 shrink-0">
              <button
                onClick={() => setSearchVisible(!searchVisible)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs flex items-center gap-1.5 transition-colors"
                title="Toggle Search"
              >
                <Search size={14} />
                Search
              </button>

              <div className="h-4 w-px bg-gray-700 mx-1" />

              <div className="flex bg-gray-900 rounded-lg p-0.5 border border-gray-700">
                <button
                  onClick={() => setViewMode('original')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'original' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                >
                  Original
                </button>
                <button
                  onClick={() => {
                    if (!offlineHtml) generateOfflineHtml();
                    else setViewMode('offline');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${viewMode === 'offline' ? 'bg-blue-900/50 text-blue-200 border border-blue-500/30' : 'text-gray-400 hover:text-gray-300'}`}
                >
                  {isGeneratingOffline ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Zap size={10} />}
                  Offline Version
                </button>
              </div>

              <div className="flex-1"></div>

              {viewMode === 'original' && (
                <button
                  onClick={() => setLocalHtml(formatHtml(localHtml))}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs flex items-center gap-1.5 transition-colors"
                  title="Format HTML"
                >
                  <Code size={14} />
                  Format
                </button>
              )}

              <span className="text-[10px] text-gray-500">
                {(viewMode === 'original' ? localHtml : (offlineHtml || '')).split('\n').length} lines
              </span>
            </div>

            {/* Search Bar */}
            {searchVisible && (
              <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded border border-gray-700 animate-fade-in shrink-0">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search in HTML..."
                  className="flex-1 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:border-purple-500 outline-none"
                />
                <button
                  onClick={handleSearch}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs transition-colors"
                >
                  Find
                </button>
              </div>
            )}

            {/* HTML Visual Editor */}
            <div className="flex-1 visual-editor-container border border-gray-800 relative overflow-hidden flex flex-col">
              {/* Scroll Container */}
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
                      fontSize: 14,
                      lineHeight: 1.6,
                      background: '#0a0a0f',
                      pointerEvents: isGeneratingOffline ? 'none' : 'auto', // Disable only when generating
                      opacity: isGeneratingOffline ? 0.8 : 1
                    }}
                    textareaId="html-editor-textarea"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'ai_audio' && (
          <div className="space-y-6 text-sm">

            {/* Visual Context / Refinement Instructions */}
            <div className={`p-4 rounded-lg space-y-3 ${hasContent ? 'bg-purple-900/10 border border-purple-500/30' : 'bg-gray-800/50'}`}>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                  {hasContent ? <><RefreshCw size={14} className="text-purple-400" /> Refine Scene</> : "Visual Context"}
                </h3>
              </div>

              <textarea
                value={topicContext}
                onChange={(e) => onTopicContextChange(e.target.value)}
                className="w-full h-24 bg-gray-900 border border-gray-700 rounded p-2 text-xs text-gray-300 resize-none focus:border-purple-500 focus:outline-none"
                placeholder={hasContent ? "Describe changes to make... e.g. 'Make the background blue' or 'Add particles'" : "Describe your video topic... e.g. 'Quantum Physics explanation with grids'"}
              />

              <div className="flex gap-2">
                <button
                  onClick={handleCopyPrompt}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  {copySuccess ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                  {copySuccess ? "Copied!" : "Copy Full Prompt"}
                </button>
              </div>
            </div>

            {/* Internal Generator & Settings */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-purple-500/20 p-4 rounded-lg space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" /> Internal Generator
                </h3>
                {!isEditingKey && (
                  <button
                    onClick={() => setIsEditingKey(true)}
                    className="text-xs text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded transition-colors flex items-center gap-1"
                    title="Edit API Key"
                  >
                    <Edit2 size={12} /> {isDefaultKey ? "Add Key" : "Edit"}
                  </button>
                )}
              </div>

              {!isEditingKey ? (
                // Display Mode
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-gray-950/50 p-2 rounded border border-gray-800">
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                      <Key size={12} className={isDefaultKey ? "text-yellow-500" : "text-blue-500"} />
                      <span className={isDefaultKey ? "text-yellow-400 font-semibold" : ""}>
                        {isDefaultKey ? 'No Key Set' : `••••••••${apiKey.slice(-4)}`}
                      </span>
                    </div>
                    <div className="text-[10px] bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded flex items-center gap-1 max-w-[150px] truncate" title={modelName}>
                      {modelName}
                      {isDefaultKey && <Lock size={8} />}
                    </div>
                  </div>

                  <button
                    onClick={onGenerate}
                    disabled={isGenerating || !apiKey}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded font-bold transition-all mt-2 ${!apiKey
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-900/20'
                      }`}
                  >
                    {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={14} />}
                    {hasContent ? "Update Scene (Refine)" : "Generate Scene"}
                  </button>
                </div>
              ) : (
                // Edit Mode
                <div className="space-y-3 animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-xs text-gray-400">Custom API Key</label>
                      <div className="flex gap-2">
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
                          <ExternalLink size={10} /> Get Free Key
                        </a>
                        {isDefaultKey && (
                          <span className="text-[10px] text-yellow-400">Key required for generation</span>
                        )}
                      </div>
                    </div>
                    <input
                      type="password"
                      value={tempKey}
                      onChange={(e) => setTempKey(e.target.value)}
                      placeholder={isDefaultKey ? "Enter your custom key..." : ""}
                      className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Model</label>
                    <select
                      value={tempModel}
                      onChange={(e) => setTempModel(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 outline-none"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                      <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                      <option value="custom">Custom...</option>
                    </select>
                    {tempModel === 'custom' && (
                      <input
                        type="text"
                        placeholder="Enter model string..."
                        className="w-full mt-1 bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 outline-none"
                        onChange={(e) => setTempModel(e.target.value)}
                      />
                    )}
                  </div>

                  {keyError && <div className="text-xs text-red-400 flex items-center gap-1"><X size={10} /> {keyError}</div>}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingKey(false)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1.5 rounded text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveKeyConfig}
                      disabled={isValidatingKey}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      {isValidatingKey ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={12} />}
                      Verify & Save
                    </button>
                  </div>

                  {/* Option to clear custom key */}
                  {!isDefaultKey && (
                    <div className="pt-2 text-center border-t border-gray-700">
                      <button
                        onClick={() => {
                          setApiKey(APP_CONFIG.DEFAULT_API_KEY);
                          setModelName(APP_CONFIG.DEFAULT_MODEL);
                          setTimeout(() => onSaveApiKey(), 0);
                          setIsEditingKey(false);
                        }}
                        className="text-[10px] text-red-400 hover:text-red-300 underline"
                      >
                        Remove Custom Key
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* External Intelligence */}
            <div className="bg-gray-800/50 p-4 rounded-lg space-y-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <MessageSquare size={16} /> External Intelligence
              </h3>
              <p className="text-[10px] text-gray-400 mb-2">Manual Workflow: Copy prompt above -&gt; Generate in External App -&gt; Paste code in HTML Tab.</p>
              <div className="grid grid-cols-2 gap-2">
                <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-teal-700/50 text-white py-3 rounded-lg text-xs font-medium transition-colors border border-gray-600 hover:border-teal-500/50">
                  <Bot size={14} className="text-teal-400" /> ChatGPT
                </a>
                <a href="https://claude.ai/new" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-orange-700/50 text-white py-3 rounded-lg text-xs font-medium transition-colors border border-gray-600 hover:border-orange-500/50">
                  <BrainCircuit size={14} className="text-orange-400" /> Claude
                </a>
                <a href="https://gemini.google.com/app" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-blue-700/50 text-white py-3 rounded-lg text-xs font-medium transition-colors border border-gray-600 hover:border-blue-500/50">
                  <Sparkles size={14} className="text-blue-400" /> Gemini
                </a>
                <a href="https://chat.deepseek.com/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-blue-600/50 text-white py-3 rounded-lg text-xs font-medium transition-colors border border-gray-600 hover:border-blue-400/50">
                  <Cpu size={14} className="text-blue-300" /> DeepSeek
                </a>
              </div>
            </div>

            {/* Audio Tools */}
            <div className="bg-gray-800/50 p-4 rounded-lg space-y-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Music size={16} /> Audio Tools
              </h3>

              <button
                onClick={extractAndDownloadAudio}
                disabled={isExtracting}
                className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 py-2 rounded text-white transition-colors"
              >
                {isExtracting ? (
                  <span className="animate-pulse">Extracting...</span>
                ) : (
                  <>
                    <Download size={14} /> Extract WAV
                  </>
                )}
              </button>

              <div className="flex justify-between gap-2 mt-2">
                <a href="https://transcri.io/en/subtitle-generator/srt" target="_blank" rel="noreferrer" className="flex-1 bg-gray-700 hover:bg-gray-600 text-center py-1.5 rounded text-xs text-gray-300">
                  Transcri.io
                </a>
                <a href="https://podcast.adobe.com/enhance" target="_blank" rel="noreferrer" className="flex-1 bg-gray-700 hover:bg-gray-600 text-center py-1.5 rounded text-xs text-gray-300">
                  Adobe Enhance
                </a>
              </div>
            </div>

            {/* Background Music */}
            <div className="bg-gray-800/50 p-4 rounded-lg space-y-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Music size={16} /> Background Music
              </h3>

              {bgMusicName ? (
                <div className="flex items-center justify-between bg-gray-700 rounded p-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileAudio size={16} className="text-purple-400 flex-shrink-0" />
                    <span className="text-xs text-white truncate">{bgMusicName}</span>
                  </div>
                  <button
                    onClick={handleRemoveMusic}
                    className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors"
                    title="Remove Music"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleMusicUpload}
                  className="block w-full text-xs text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600"
                />
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Vol:</span>
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={bgMusicVolume}
                  onChange={(e) => onBgVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs w-8">{(bgMusicVolume * 100).toFixed(0)}%</span>
              </div>
            </div>

          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded font-semibold transition-colors"
        >
          <Save size={18} /> Apply Changes
        </button>
      </div>
    </div>
  );
};