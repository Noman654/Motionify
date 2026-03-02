import React, { useState, useCallback } from 'react';
import { Sparkles, Search, Video, Image, Loader2, X, Plus, Play, ExternalLink, AlertTriangle, Key } from 'lucide-react';
import { suggestBRollKeywords, BRollSuggestion, BRollClip } from '../services/brollService';
import { searchPexelsVideos, searchPexelsPhotos, getBestVideoUrl, PexelsVideo, PexelsPhoto, setPexelsApiKey, hasPexelsApiKey } from '../services/pexelsService';

interface BRollPanelProps {
    srtText: string;
    topicContext: string;
    apiKey: string; // Gemini API Key
    brollClips: BRollClip[];
    onBRollClipsChange: (clips: BRollClip[]) => void;
}

type SearchTab = 'suggestions' | 'search';

export const BRollPanel: React.FC<BRollPanelProps> = ({
    srtText,
    topicContext,
    apiKey,
    brollClips,
    onBRollClipsChange,
}) => {
    const [tab, setTab] = useState<SearchTab>('suggestions');
    const [suggestions, setSuggestions] = useState<BRollSuggestion[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ videos: PexelsVideo[]; photos: PexelsPhoto[] }>({ videos: [], photos: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pexelsKeyInput, setPexelsKeyInput] = useState('');
    const [showPexelsSetup, setShowPexelsSetup] = useState(!hasPexelsApiKey());
    const [activeSuggestion, setActiveSuggestion] = useState<BRollSuggestion | null>(null);
    const [previewVideo, setPreviewVideo] = useState<string | null>(null);

    // ── AI Suggestions ──
    const handleGenerateSuggestions = useCallback(async () => {
        if (!apiKey || !srtText) return;
        setIsGenerating(true);
        setError(null);
        try {
            const results = await suggestBRollKeywords(srtText, topicContext, apiKey);
            setSuggestions(results);
            setTab('suggestions');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    }, [apiKey, srtText, topicContext]);

    // ── Pexels Search ──
    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) return;
        setIsSearching(true);
        setError(null);
        try {
            const [videos, photos] = await Promise.all([
                searchPexelsVideos(query, 6, 'portrait'),
                searchPexelsPhotos(query, 4, 'portrait'),
            ]);
            setSearchResults({ videos, photos });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSuggestionClick = (suggestion: BRollSuggestion) => {
        setActiveSuggestion(suggestion);
        setSearchQuery(suggestion.keyword);
        handleSearch(suggestion.keyword);
        setTab('search');
    };

    // ── Insert B-Roll ──
    const handleInsertVideo = (video: PexelsVideo) => {
        const url = getBestVideoUrl(video);
        const clip: BRollClip = {
            id: crypto.randomUUID(),
            keyword: searchQuery || 'stock clip',
            startTime: activeSuggestion?.startTime ?? 0,
            endTime: activeSuggestion?.endTime ?? 3,
            sourceUrl: url,
            thumbnailUrl: video.image,
            type: 'video',
            credit: video.user.name,
            pexelsId: video.id,
        };
        onBRollClipsChange([...brollClips, clip]);
        setActiveSuggestion(null);
    };

    const handleInsertPhoto = (photo: PexelsPhoto) => {
        const clip: BRollClip = {
            id: crypto.randomUUID(),
            keyword: searchQuery || 'stock image',
            startTime: activeSuggestion?.startTime ?? 0,
            endTime: activeSuggestion?.endTime ?? 3,
            sourceUrl: photo.src.large,
            thumbnailUrl: photo.src.small,
            type: 'image',
            credit: photo.photographer,
            pexelsId: photo.id,
        };
        onBRollClipsChange([...brollClips, clip]);
        setActiveSuggestion(null);
    };

    const handleRemoveClip = (id: string) => {
        onBRollClipsChange(brollClips.filter(c => c.id !== id));
    };

    const handleSavePexelsKey = () => {
        if (pexelsKeyInput.trim()) {
            setPexelsApiKey(pexelsKeyInput.trim());
            setShowPexelsSetup(false);
        }
    };

    // ── Pexels Key Setup ──
    if (showPexelsSetup) {
        return (
            <div className="space-y-4 p-4">
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 mb-1 border border-white/5">
                        <Key size={20} className="text-green-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Connect Pexels</h3>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto">Enter your Pexels API key to search millions of free stock videos and photos for B-Roll.</p>
                </div>

                <div className="space-y-2">
                    <input
                        type="text"
                        value={pexelsKeyInput}
                        onChange={(e) => setPexelsKeyInput(e.target.value)}
                        placeholder="Paste Pexels API Key..."
                        className="w-full input-base bg-black/30 px-3 py-2.5 text-xs rounded-xl"
                    />
                    <button
                        onClick={handleSavePexelsKey}
                        disabled={!pexelsKeyInput.trim()}
                        className="w-full btn-primary py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                        Connect
                    </button>
                    <a
                        href="https://www.pexels.com/api/new/"
                        target="_blank"
                        rel="noreferrer"
                        className="block text-center text-[10px] text-gray-500 hover:text-green-400 transition-colors"
                    >
                        Get a free API key →
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header + AI Button */}
            <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Video size={12} className="text-green-400" /> B-Roll
                </h4>
                <button
                    onClick={handleGenerateSuggestions}
                    disabled={isGenerating || !apiKey}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-lg text-[10px] font-bold text-green-400 hover:from-green-600/30 hover:to-emerald-600/30 transition-all disabled:opacity-50"
                >
                    {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    AI Suggest
                </button>
            </div>

            {/* Tab Toggle */}
            <div className="flex bg-black/30 p-0.5 rounded-lg border border-white/[0.04]">
                <button
                    onClick={() => setTab('suggestions')}
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${tab === 'suggestions' ? 'bg-white/[0.06] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    ✨ Suggestions ({suggestions.length})
                </button>
                <button
                    onClick={() => setTab('search')}
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${tab === 'search' ? 'bg-white/[0.06] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    🔍 Search
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400 flex gap-2 items-start">
                    <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Suggestions Tab */}
            {tab === 'suggestions' && (
                <div className="space-y-2">
                    {suggestions.length === 0 ? (
                        <div className="text-center py-8 text-gray-600">
                            <Sparkles size={24} className="mx-auto opacity-20 mb-2" />
                            <p className="text-[11px]">Click "AI Suggest" to analyze your transcript</p>
                            <p className="text-[10px] text-gray-700 mt-1">Gemini will suggest relevant B-Roll keywords</p>
                        </div>
                    ) : (
                        suggestions.map((s, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSuggestionClick(s)}
                                className="w-full text-left p-3 bg-black/30 border border-white/5 rounded-xl hover:bg-white/5 hover:border-green-500/30 transition-all group"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {s.type === 'video' ? <Video size={11} className="text-blue-400" /> : <Image size={11} className="text-pink-400" />}
                                            <span className="text-xs font-bold text-white truncate">{s.keyword}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 leading-snug">{s.reason}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <span className="text-[9px] font-mono text-gray-600">{s.startTime.toFixed(1)}s – {s.endTime.toFixed(1)}s</span>
                                        <div className="text-green-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity mt-1 font-semibold flex items-center gap-1 justify-end">
                                            <Search size={9} /> Search
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* Search Tab */}
            {tab === 'search' && (
                <div className="space-y-3">
                    {/* Search Input */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                                placeholder="Search stock footage..."
                                className="w-full input-base bg-black/30 pl-8 pr-3 py-2 text-xs rounded-lg"
                            />
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
                        </div>
                        <button
                            onClick={() => handleSearch(searchQuery)}
                            disabled={isSearching || !searchQuery.trim()}
                            className="px-4 py-2 btn-primary rounded-lg text-[11px] font-bold disabled:opacity-50"
                        >
                            {isSearching ? <Loader2 size={12} className="animate-spin" /> : 'Go'}
                        </button>
                    </div>

                    {/* Active Suggestion Context */}
                    {activeSuggestion && (
                        <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-[10px] text-green-400 flex items-center justify-between">
                            <span>Inserting at {activeSuggestion.startTime.toFixed(1)}s – {activeSuggestion.endTime.toFixed(1)}s</span>
                            <button onClick={() => setActiveSuggestion(null)} className="hover:text-white transition-colors">
                                <X size={11} />
                            </button>
                        </div>
                    )}

                    {/* Video Results */}
                    {searchResults.videos.length > 0 && (
                        <div>
                            <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Video size={10} /> Videos ({searchResults.videos.length})
                            </h5>
                            <div className="grid grid-cols-2 gap-2">
                                {searchResults.videos.map((v) => (
                                    <div key={v.id} className="group relative bg-black/40 border border-white/5 rounded-xl overflow-hidden aspect-[9/16]">
                                        <img src={v.image} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
                                            <span className="text-[9px] text-gray-400">{v.duration}s • {v.user.name}</span>
                                            <button
                                                onClick={() => handleInsertVideo(v)}
                                                className="w-full flex items-center justify-center gap-1 bg-green-500 hover:bg-green-400 text-black text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                                            >
                                                <Plus size={10} /> Insert
                                            </button>
                                        </div>
                                        {previewVideo === getBestVideoUrl(v) ? (
                                            <video src={previewVideo} autoPlay muted loop className="absolute inset-0 w-full h-full object-cover z-10" />
                                        ) : null}
                                        <button
                                            onMouseEnter={() => setPreviewVideo(getBestVideoUrl(v))}
                                            onMouseLeave={() => setPreviewVideo(null)}
                                            className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white/70 hover:text-white z-20"
                                        >
                                            <Play size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Photo Results */}
                    {searchResults.photos.length > 0 && (
                        <div>
                            <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Image size={10} /> Photos ({searchResults.photos.length})
                            </h5>
                            <div className="grid grid-cols-2 gap-2">
                                {searchResults.photos.map((p) => (
                                    <div key={p.id} className="group relative bg-black/40 border border-white/5 rounded-xl overflow-hidden aspect-[9/16]">
                                        <img src={p.src.small} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
                                            <span className="text-[9px] text-gray-400">{p.photographer}</span>
                                            <button
                                                onClick={() => handleInsertPhoto(p)}
                                                className="w-full flex items-center justify-center gap-1 bg-green-500 hover:bg-green-400 text-black text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                                            >
                                                <Plus size={10} /> Insert
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isSearching && searchResults.videos.length === 0 && searchResults.photos.length === 0 && searchQuery && (
                        <div className="text-center py-6 text-gray-600">
                            <Search size={20} className="mx-auto opacity-20 mb-2" />
                            <p className="text-[11px]">No results. Try a different keyword.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Inserted B-Roll Clips */}
            {brollClips.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                    <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Inserted ({brollClips.length})</span>
                    </h5>
                    {brollClips.map((clip) => (
                        <div key={clip.id} className="flex items-center gap-2 p-2 bg-black/30 border border-white/5 rounded-lg group">
                            <img src={clip.thumbnailUrl} alt="" className="w-10 h-14 object-cover rounded-md shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-white font-medium truncate">{clip.keyword}</p>
                                <p className="text-[9px] text-gray-500 font-mono">{clip.startTime.toFixed(1)}s – {clip.endTime.toFixed(1)}s</p>
                                <p className="text-[9px] text-gray-600">📷 {clip.credit}</p>
                            </div>
                            <button
                                onClick={() => handleRemoveClip(clip.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition-all"
                            >
                                <X size={11} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
