// =====================================================
// AskFino — Live Intel Rail block
// Gold-tinted chat entry point for the FINO AI drawer.
// =====================================================

import React, { memo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, SendHorizontal } from 'lucide-react';
import { useFinoChat } from '@/contexts/FinoChatContext';

const SUGGESTIONS = [
  "What changed in the macro regime?",
  "Summarize this week's reports",
] as const;

// ─── component ────────────────────────────────────────────────────────────

export const AskFino = memo(function AskFino() {
  const { open } = useFinoChat();
  const { pathname } = useLocation();
  const [query, setQuery] = useState('');

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    open({ path: pathname, label: 'Top Secret', query: trimmed });
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleSuggestion = (text: string) => {
    open({ path: pathname, label: 'Top Secret', query: text });
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #130f00 0%, #111 60%)',
        border: '1px solid rgba(201,166,70,0.2)',
        padding: 16,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        {/* Gold avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg,#E8C766,#C9A646 55%,#A88838)',
            boxShadow: '0 0 12px rgba(201,166,70,0.35)',
          }}
        >
          <Sparkles className="w-4 h-4 text-black" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">Ask FINO</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            about this week's intel
          </p>
        </div>
      </div>

      {/* Input row */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(201,166,70,0.18)',
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything…"
          className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none leading-snug"
        />
        <button
          onClick={handleSubmit}
          disabled={!query.trim()}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: query.trim()
              ? 'linear-gradient(135deg,#E8C766,#C9A646)'
              : 'rgba(255,255,255,0.08)',
          }}
          aria-label="Send"
        >
          <SendHorizontal
            className="w-3 h-3"
            style={{ color: query.trim() ? '#000' : 'rgba(255,255,255,0.4)' }}
          />
        </button>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-col gap-1.5">
        {SUGGESTIONS.map((text) => (
          <button
            key={text}
            onClick={() => handleSuggestion(text)}
            className="text-left text-[11px] rounded-lg px-3 py-2 transition-all hover:opacity-80"
            style={{
              background: 'rgba(201,166,70,0.07)',
              border: '1px solid rgba(201,166,70,0.14)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
});
