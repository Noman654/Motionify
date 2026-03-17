import React from 'react';
import { CAPTION_STYLES, CaptionStyleDef, DEFAULT_STYLE_ID } from '../utils/captionStyles';

interface CaptionStylePickerProps {
    selectedStyleId: string;
    onStyleChange: (styleId: string) => void;
}

export const CaptionStylePicker: React.FC<CaptionStylePickerProps> = ({
    selectedStyleId,
    onStyleChange,
}) => {
    return (
        <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <span>🎨</span> Caption Style
            </h4>
            <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                {CAPTION_STYLES.map((style) => {
                    const isSelected = style.id === selectedStyleId;
                    return (
                        <button
                            key={style.id}
                            onClick={() => onStyleChange(style.id)}
                            className={`
                group relative text-left p-3 rounded-xl border transition-all duration-200
                ${isSelected
                                    ? 'bg-orange-500/20 border-orange-500/60 ring-1 ring-orange-500/30 shadow-lg shadow-orange-500/10'
                                    : 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600/60'
                                }
              `}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{style.icon}</span>
                                <span className={`text-sm font-semibold ${isSelected ? 'text-orange-300' : 'text-gray-300'}`}>
                                    {style.name}
                                </span>
                            </div>
                            <p className={`text-[10px] leading-tight ${isSelected ? 'text-orange-300/70' : 'text-gray-500'}`}>
                                {style.description}
                            </p>
                            {isSelected && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
