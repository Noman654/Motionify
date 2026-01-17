import React, { useEffect, useRef, useState } from 'react';

interface VisualCodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    language?: 'html' | 'css' | 'javascript';
}

export const VisualCodeEditor: React.FC<VisualCodeEditorProps> = ({
    value,
    onChange,
    language = 'html'
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);
    const [lineNumbers, setLineNumbers] = useState<number[]>([]);

    // Update line numbers when content changes
    useEffect(() => {
        const lines = value.split('\n');
        setLineNumbers(Array.from({ length: lines.length }, (_, i) => i + 1));
    }, [value]);

    // Sync scroll between textarea and highlighted code
    const handleScroll = () => {
        if (textareaRef.current && highlightRef.current) {
            highlightRef.current.scrollTop = textareaRef.current.scrollTop;
            highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    // Simple syntax highlighting for HTML
    const highlightHTML = (code: string): string => {
        return code
            // HTML Tags
            .replace(/(&lt;)\/?([a-zA-Z][a-zA-Z0-9]*)\b([^&gt;]*?)(&gt;)/g,
                '<span class="token-tag">$1$2</span><span class="token-attr">$3</span><span class="token-tag">$4</span>')
            // Attributes
            .replace(/([a-zA-Z-]+)=("[^"]*"|'[^']*')/g,
                '<span class="token-attr-name">$1</span>=<span class="token-attr-value">$2</span>')
            // Comments
            .replace(/(&lt;!--.*?--&gt;)/g, '<span class="token-comment">$1</span>')
            // Strings in style/script
            .replace(/("[^"]*"|'[^']*')/g, '<span class="token-string">$1</span>');
    };

    // Escape HTML for display
    const escapeHTML = (str: string): string => {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    // Get highlighted code
    const getHighlightedCode = (): string => {
        const escaped = escapeHTML(value);
        if (language === 'html') {
            return highlightHTML(escaped);
        }
        return escaped;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Auto-indent on Enter
        if (e.key === 'Enter') {
            const textarea = textareaRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const beforeCursor = value.substring(0, start);
            const lastLine = beforeCursor.split('\n').pop() || '';
            const indent = lastLine.match(/^\s*/)?.[0] || '';

            e.preventDefault();
            const newValue = value.substring(0, start) + '\n' + indent + value.substring(textarea.selectionEnd);
            onChange(newValue);

            // Set cursor position after the indent
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + indent.length + 1;
            }, 0);
        }

        // Tab key for indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = textareaRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            if (e.shiftKey) {
                // Shift+Tab: Remove indent
                const beforeCursor = value.substring(0, start);
                const lineStart = beforeCursor.lastIndexOf('\n') + 1;
                const currentLine = value.substring(lineStart, end);

                if (currentLine.startsWith('  ')) {
                    const newValue = value.substring(0, lineStart) + currentLine.substring(2) + value.substring(end);
                    onChange(newValue);
                    setTimeout(() => {
                        textarea.selectionStart = Math.max(lineStart, start - 2);
                        textarea.selectionEnd = end - 2;
                    }, 0);
                }
            } else {
                // Tab: Add indent
                const newValue = value.substring(0, start) + '  ' + value.substring(end);
                onChange(newValue);
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + 2;
                }, 0);
            }
        }
    };

    return (
        <div className="visual-code-editor">
            {/* Line Numbers */}
            <div className="line-numbers">
                {lineNumbers.map(num => (
                    <div key={num} className="line-number">{num}</div>
                ))}
            </div>

            {/* Highlighted Code Background */}
            <pre
                ref={highlightRef}
                className="code-highlight"
                dangerouslySetInnerHTML={{ __html: getHighlightedCode() }}
            />

            {/* Textarea for editing */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                className="code-input"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
            />

            <style>{`
        .visual-code-editor {
          position: relative;
          display: flex;
          width: 100%;
          height: 100%;
          background: #0a0a0f;
          border-radius: 8px;
          overflow: hidden;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
          font-size: 14px;
          line-height: 1.6;
        }

        .line-numbers {
          position: relative;
          z-index: 2;
          padding: 16px 8px 16px 16px;
          background: #0d0d12;
          color: #4b5563;
          text-align: right;
          user-select: none;
          min-width: 50px;
          border-right: 1px solid #1f2937;
        }

        .line-number {
          line-height: 1.6;
          font-size: 13px;
        }

        .code-highlight {
          position: absolute;
          top: 0;
          left: 50px;
          right: 0;
          bottom: 0;
          margin: 0;
          padding: 16px;
          color: transparent;
          white-space: pre;
          overflow: auto;
          pointer-events: none;
          z-index: 1;
          caret-color: white;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .code-input {
          position: absolute;
          top: 0;
          left: 50px;
          right: 0;
          bottom: 0;
          margin: 0;
          padding: 16px;
          background: transparent;
          color: #93c5fd;
          border: none;
          outline: none;
          resize: none;
          white-space: pre;
          overflow: auto;
          z-index: 2;
          caret-color: #93c5fd;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          tab-size: 2;
          -moz-tab-size: 2;
        }

        .code-input::selection {
          background: rgba(147, 197, 253, 0.3);
        }

        /* Syntax Highlighting Tokens */
        .token-tag {
          color: #f472b6;
          font-weight: 500;
        }

        .token-attr {
          color: #93c5fd;
        }

        .token-attr-name {
          color: #fbbf24;
          font-style: italic;
        }

        .token-attr-value {
          color: #86efac;
        }

        .token-comment {
          color: #6b7280;
          font-style: italic;
        }

        .token-string {
          color: #86efac;
        }

        /* Scrollbar Styling */
        .code-input::-webkit-scrollbar,
        .code-highlight::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .code-input::-webkit-scrollbar-track,
        .code-highlight::-webkit-scrollbar-track {
          background: #0a0a0f;
        }

        .code-input::-webkit-scrollbar-thumb,
        .code-highlight::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 5px;
        }

        .code-input::-webkit-scrollbar-thumb:hover,
        .code-highlight::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}</style>
        </div>
    );
};
