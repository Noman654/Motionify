import React, { useState, useEffect } from 'react';

const messages = [
  "Analyzing context...",
  "Composing scene layout...",
  "Synchronizing typography...",
  "Rendering motion graphics...",
  "Applying dynamic styling...",
  "Adding the final touches..."
];

export const LoadingMessage: React.FC<{ interval?: number }> = ({ interval = 2500 }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);

  return (
    <div className="relative h-6 overflow-hidden flex items-center min-w-[220px]">
      {messages.map((msg, i) => (
        <span
          key={i}
          className={`absolute left-0 right-0 text-center transition-all duration-500 ease-in-out ${
            i === messageIndex 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
          }`}
        >
          {msg}
        </span>
      ))}
    </div>
  );
};
