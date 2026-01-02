import React, { useEffect, useState } from "react";
import { getJSON } from "@/lib/api";

type Item = { 
  id: string; 
  title: string; 
  source?: string; 
  url: string; 
  publishedAt?: string; 
  sentiment?: string;
  image?: string;
  thumbnail?: string;
};

export default function NewsPreview({ symbol }: { symbol: string }){
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<Item | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    let stop = false;
    getJSON<Item[]>(`/api/news?symbol=${encodeURIComponent(symbol)}&limit=5`)
      .then(d => !stop && setItems(d))
      .catch(() => setItems([]));
    return () => { stop = true };
  }, [symbol]);

  const handleImgError = (id: string) => {
    setImgErrors(prev => new Set(prev).add(id));
  };

  const getSentimentColor = (sentiment?: string) => {
    if (!sentiment) return 'text-zinc-400';
    const s = sentiment.toLowerCase();
    if (s === 'positive' || s === 'bullish') return 'text-emerald-400';
    if (s === 'negative' || s === 'bearish') return 'text-red-400';
    return 'text-zinc-400';
  };

  const getSentimentBg = (sentiment?: string) => {
    if (!sentiment) return 'bg-zinc-500/10';
    const s = sentiment.toLowerCase();
    if (s === 'positive' || s === 'bullish') return 'bg-emerald-500/10';
    if (s === 'negative' || s === 'bearish') return 'bg-red-500/10';
    return 'bg-zinc-500/10';
  };

  // Placeholder image component
  const PlaceholderImage = () => (
    <div className="w-20 h-14 rounded-lg bg-zinc-800/80 flex items-center justify-center flex-shrink-0">
      <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
          d="M12 11a2 2 0 100-4 2 2 0 000 4zM4 20l5-5 3 3 4-4 4 4" />
      </svg>
    </div>
  );

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="text-center py-8 text-zinc-500 text-sm">
          No news available for {symbol}
        </div>
      )}
      
      {items.map(n => (
        <button 
          key={n.id} 
          className="w-full text-left rounded-xl p-3 bg-zinc-900/60 border border-zinc-800/60 
                     hover:border-zinc-700/60 hover:bg-zinc-900/80 transition-all duration-200
                     flex items-start gap-3 group" 
          onClick={() => setActive(n)}
        >
          {/* Thumbnail */}
          {(n.image || n.thumbnail) && !imgErrors.has(n.id) ? (
            <img 
              src={n.image || n.thumbnail} 
              alt=""
              className="w-20 h-14 rounded-lg object-cover flex-shrink-0 bg-zinc-800"
              onError={() => handleImgError(n.id)}
            />
          ) : (
            <PlaceholderImage />
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-zinc-200 font-medium line-clamp-2 group-hover:text-white transition-colors">
              {n.title}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs">
              <span className="text-zinc-500">{n.source || '—'}</span>
              <span className="text-zinc-700">•</span>
              <span className="text-zinc-500">
                {n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '—'}
              </span>
              <span className="text-zinc-700">•</span>
              <span className={`px-1.5 py-0.5 rounded ${getSentimentBg(n.sentiment)} ${getSentimentColor(n.sentiment)}`}>
                {n.sentiment || 'Neutral'}
              </span>
            </div>
          </div>
        </button>
      ))}
      
      {/* Modal */}
      {active && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
          onClick={() => setActive(null)}
        >
          <div 
            className="w-[600px] max-w-full rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Image */}
            {(active.image || active.thumbnail) && !imgErrors.has(active.id) && (
              <img 
                src={active.image || active.thumbnail} 
                alt=""
                className="w-full h-48 object-cover"
                onError={() => handleImgError(active.id)}
              />
            )}
            
            {/* Modal Content */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-2">{active.title}</h3>
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
                <span>{active.source || '—'}</span>
                <span>•</span>
                <span>{active.publishedAt ? new Date(active.publishedAt).toLocaleString() : '—'}</span>
                {active.sentiment && (
                  <>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded ${getSentimentBg(active.sentiment)} ${getSentimentColor(active.sentiment)}`}>
                      {active.sentiment}
                    </span>
                  </>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <a 
                  href={active.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A646] hover:bg-[#D4AF37] 
                           text-black font-medium text-sm transition-colors"
                >
                  Read Full Article
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button 
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors" 
                  onClick={() => setActive(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}