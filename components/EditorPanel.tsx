import React, { useState, useEffect } from 'react';
import { GeneratedContent, LayoutConfigStep } from '../types';
import { Code, Layout, Settings, Save, Download, Music, ExternalLink, Copy, CheckCircle2, Sparkles, MessageSquare, Trash2, FileAudio, Key } from 'lucide-react';
import { extractWavFromVideo } from '../utils/audioHelpers';
import { constructPrompt } from '../utils/promptTemplates';

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
  onSaveApiKey
}) => {
  const [activeTab, setActiveTab] = useState<'html' | 'config' | 'ai_audio'>('config');
  const [localConfig, setLocalConfig] = useState(JSON.stringify(content.layoutConfig, null, 2));
  const [localHtml, setLocalHtml] = useState(content.html);
  const [isExtracting, setIsExtracting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Sync local state when content prop updates (e.g. after AI generation)
  useEffect(() => {
    setLocalConfig(JSON.stringify(content.layoutConfig, null, 2));
    setLocalHtml(content.html);
  }, [content]);

  const handleSave = () => {
    try {
      const parsedConfig = JSON.parse(localConfig) as LayoutConfigStep[];
      
      // Also save the API Key when user hits save/apply
      onSaveApiKey();

      onUpdate({
        ...content,
        html: localHtml,
        layoutConfig: parsedConfig
      });
    } catch (e) {
      alert("Invalid JSON in Config");
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

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800">
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
          <Sparkles size={16} /> AI & Audio
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 relative">
        {activeTab === 'config' && (
          <textarea 
            className="w-full h-full bg-gray-950 text-green-400 font-mono text-sm p-4 rounded border border-gray-800 focus:border-purple-500 outline-none resize-none"
            value={localConfig}
            onChange={(e) => setLocalConfig(e.target.value)}
          />
        )}
        {activeTab === 'html' && (
          <textarea 
            className="w-full h-full bg-gray-950 text-blue-300 font-mono text-xs p-4 rounded border border-gray-800 focus:border-purple-500 outline-none resize-none"
            value={localHtml}
            onChange={(e) => setLocalHtml(e.target.value)}
          />
        )}
        {activeTab === 'ai_audio' && (
          <div className="space-y-6 text-sm">
            
            {/* Visual Context Display */}
            <div className="bg-gray-800/50 p-4 rounded-lg space-y-3">
               <h3 className="font-bold text-white">Visual Context</h3>
               <textarea
                 value={topicContext}
                 onChange={(e) => onTopicContextChange(e.target.value)}
                 className="w-full h-24 bg-gray-900 border border-gray-700 rounded p-2 text-xs text-gray-300 resize-none focus:border-purple-500 focus:outline-none"
                 placeholder="Edit context here..."
               />
               <div className="flex gap-2">
                 <button 
                    onClick={handleCopyPrompt}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-xs flex items-center justify-center gap-2 transition-colors"
                 >
                   {copySuccess ? <CheckCircle2 size={12} className="text-green-500"/> : <Copy size={12} />}
                   {copySuccess ? "Copied!" : "Copy Full Prompt"}
                 </button>
               </div>
            </div>

             {/* Internal Generator & Settings */}
             <div className="bg-gray-800/50 p-4 rounded-lg space-y-3 border border-purple-500/30">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" /> Internal Generator
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-gray-400 flex items-center gap-1">
                    <Key size={10} /> Gemini API Key
                  </label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                  >
                    Get Key <ExternalLink size={8} />
                  </a>
                </div>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Gemini API Key"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 outline-none"
                />
              </div>

               <div className="space-y-2">
                <label className="text-xs text-gray-400">Model Name</label>
                <input 
                  type="text" 
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="gemini-2.0-flash"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 outline-none"
                />
              </div>

              <button 
                onClick={onGenerate}
                disabled={isGenerating || !apiKey}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded font-semibold transition-colors mt-2 ${
                  !apiKey ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600 text-white'
                }`}
              >
                 {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Sparkles size={14} />}
                 Generate Scene
              </button>
            </div>

            {/* External Intelligence */}
            <div className="bg-gray-800/50 p-4 rounded-lg space-y-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <MessageSquare size={16} /> External Intelligence
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="bg-gray-700 hover:bg-teal-700/50 text-white py-2 rounded text-xs text-center transition-colors">ChatGPT</a>
                <a href="https://claude.ai/new" target="_blank" rel="noreferrer" className="bg-gray-700 hover:bg-orange-700/50 text-white py-2 rounded text-xs text-center transition-colors">Claude</a>
                <a href="https://gemini.google.com/app" target="_blank" rel="noreferrer" className="bg-gray-700 hover:bg-blue-700/50 text-white py-2 rounded text-xs text-center transition-colors">Gemini</a>
                <a href="https://chat.deepseek.com/" target="_blank" rel="noreferrer" className="bg-gray-700 hover:bg-blue-600/50 text-white py-2 rounded text-xs text-center transition-colors">DeepSeek</a>
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
