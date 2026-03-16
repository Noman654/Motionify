import React, { useState } from 'react';
import { MessageSquareWarning, X } from 'lucide-react';

/**
 * Floating Feedback / Report Bug button — fixed to bottom-right corner.
 * Opens a Google Form or mailto link.
 */
export const FeedbackButton: React.FC = () => {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 animate-fade-in" style={{ animationDelay: '2s', animationFillMode: 'backwards' }}>
            <a
                href="https://forms.gle/YOUR_FEEDBACK_FORM_ID"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.07] hover:bg-white/[0.12] backdrop-blur-xl border border-white/10 rounded-full text-xs font-medium text-gray-300 hover:text-white transition-all shadow-lg shadow-black/20 group"
            >
                <MessageSquareWarning size={14} className="text-purple-400 group-hover:text-purple-300" />
                Feedback / Report Bug
            </a>
            <button
                onClick={() => setDismissed(true)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-gray-600 hover:text-gray-300 transition-colors border border-white/[0.06]"
                title="Dismiss"
            >
                <X size={10} />
            </button>
        </div>
    );
};
