
import React, { useState } from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';

interface Template {
    id: string;
    name: string;
    description: string;
    category: string;
    prompt: string;
}

const TEMPLATES: Template[] = [
    {
        id: 'tech-demo',
        name: 'Tech Demo',
        description: 'Neon grids, data streams, holographic overlays',
        category: 'Technology',
        prompt: 'High-energy tech demo with neon grid backgrounds, floating data visualizations, holographic UI elements, and circuit-board patterns. Use cyan and purple color scheme with glowing accents. Fast-paced transitions with digital glitch effects.'
    },
    {
        id: 'cinematic-story',
        name: 'Cinematic Story',
        description: 'Film-grain overlays, dramatic lighting, letterbox',
        category: 'Editorial',
        prompt: 'Cinematic storytelling with film grain overlay, dramatic lighting effects, and letterbox framing. Use warm amber and deep shadow tones. Slow, purposeful transitions with fade-to-black moments. Typography should feel like movie credits.'
    },
    {
        id: 'minimalist-clean',
        name: 'Minimal Clean',
        description: 'Swiss design, bold type, white space',
        category: 'Design',
        prompt: 'Ultra-minimalist design with generous white space, bold sans-serif typography, and single accent color. Clean geometric shapes and subtle grid layouts. Smooth, refined transitions with no unnecessary decoration.'
    },
    {
        id: 'social-viral',
        name: 'Social Viral',
        description: 'Bold text, emoji reactions, TikTok energy',
        category: 'Social',
        prompt: 'High-energy social media style with bold, large text overlays, emoji reactions, and dynamic zoom effects. Bright, saturated colors with rapid transitions. Include progress bars, countdown timers, and engagement hooks.'
    },
    {
        id: 'educational',
        name: 'Edu Explainer',
        description: 'Visual aids, callouts, step-by-step flow',
        category: 'Education',
        prompt: 'Educational explainer with clear visual hierarchy, numbered steps, highlighted callouts, and diagram-style layouts. Use a calming blue and white palette. Include progress indicators and recap sections with smooth transitions.'
    },
    {
        id: 'retro-vhs',
        name: 'Retro VHS',
        description: 'VHS tracking lines, CRT glow, 80s palette',
        category: 'Creative',
        prompt: 'Retro VHS aesthetic with CRT scan lines, tracking distortion, and chromatic aberration effects. Use neon pink, electric blue, and hot magenta. Include VHS timestamp overlay and analog tape noise. Glitchy, imperfect transitions.'
    },
    {
        id: 'nature-ambient',
        name: 'Nature Ambient',
        description: 'Organic textures, earthy tones, soft movement',
        category: 'Lifestyle',
        prompt: 'Organic nature-inspired visuals with soft gradients, earthy color palette of greens, tans, and sky blues. Gentle particle effects like floating leaves or soft light rays. Smooth, breathing transitions with natural movement.'
    },
    {
        id: 'corporate-modern',
        name: 'Corporate Pro',
        description: 'Professional charts, clean data, brand-ready',
        category: 'Business',
        prompt: 'Polished corporate presentation with professional data visualizations, clean charts, and structured layouts. Navy blue and white color scheme with gold accents. Slide-style transitions with subtle animations. Brand-ready typography.'
    }
];

const CATEGORY_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
    'Technology': { dot: 'bg-cyan-400', bg: 'bg-cyan-500/8', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    'Editorial': { dot: 'bg-amber-400', bg: 'bg-amber-500/8', text: 'text-amber-400', border: 'border-amber-500/20' },
    'Design': { dot: 'bg-gray-400', bg: 'bg-gray-500/8', text: 'text-gray-400', border: 'border-gray-500/20' },
    'Social': { dot: 'bg-pink-400', bg: 'bg-pink-500/8', text: 'text-pink-400', border: 'border-pink-500/20' },
    'Education': { dot: 'bg-blue-400', bg: 'bg-blue-500/8', text: 'text-blue-400', border: 'border-blue-500/20' },
    'Creative': { dot: 'bg-fuchsia-400', bg: 'bg-fuchsia-500/8', text: 'text-orange-400', border: 'border-orange-500/20' },
    'Lifestyle': { dot: 'bg-emerald-400', bg: 'bg-emerald-500/8', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    'Business': { dot: 'bg-indigo-400', bg: 'bg-indigo-500/8', text: 'text-indigo-400', border: 'border-indigo-500/20' },
};

interface TemplateGalleryProps {
    onSelectTemplate: (template: { name: string; prompt: string }) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelectTemplate }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const categories = Array.from(new Set(TEMPLATES.map(t => t.category)));

    const filteredTemplates = activeCategory
        ? TEMPLATES.filter(t => t.category === activeCategory)
        : TEMPLATES;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-orange-400" />
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em]">Templates</span>
                </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5">
                <button
                    onClick={() => setActiveCategory(null)}
                    className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all ${!activeCategory
                        ? 'bg-white/[0.08] border-white/15 text-white'
                        : 'border-white/5 text-gray-500 hover:text-white hover:border-white/10'
                        }`}
                >
                    All
                </button>
                {categories.map(cat => {
                    const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Design'];
                    return (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                            className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${activeCategory === cat
                                ? `${colors.bg} ${colors.border} ${colors.text}`
                                : 'border-white/5 text-gray-500 hover:text-white hover:border-white/10'
                                }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                            {cat}
                        </button>
                    );
                })}
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {filteredTemplates.map((template) => {
                    const isSelected = selectedId === template.id;
                    const colors = CATEGORY_COLORS[template.category] || CATEGORY_COLORS['Design'];

                    return (
                        <button
                            key={template.id}
                            onClick={() => {
                                setSelectedId(template.id);
                                onSelectTemplate({ name: template.name, prompt: template.prompt });
                            }}
                            className={`group relative text-left p-3 rounded-xl border transition-all overflow-hidden ${isSelected
                                ? `${colors.bg} ${colors.border} shadow-lg`
                                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                                }`}
                        >
                            {/* Glow ring on selected */}
                            {isSelected && (
                                <div className={`absolute inset-0 border-2 ${colors.border} rounded-xl opacity-60 pointer-events-none`} />
                            )}

                            <div className="flex items-start gap-2 relative z-10">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${colors.dot}`} />
                                <div className="min-w-0 flex-1">
                                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                        {template.name}
                                    </p>
                                    <p className={`text-[10px] mt-0.5 line-clamp-2 leading-tight ${isSelected ? colors.text : 'text-gray-600 group-hover:text-gray-500'}`}>
                                        {template.description}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
