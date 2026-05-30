// Full-screen carousel guide for creating a read-only Binance API key.
// Visual pattern mirrors JournalExportGuide (same overlay, card, step-counter,
// dot-nav, and button styling). Self-contained — no importUtils dependency.

import { useCallback, useEffect, useState } from 'react';
import { X, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

interface Slide {
  title: string;
  body: string;
  imageSrc?: string;
}

const SLIDES: Slide[] = [
  {
    title: 'Step 1 — Open API Management',
    body: 'Log in to Binance and open Account → API Management from the left sidebar.',
    imageSrc: '/import-guides/binance/01-api-management.png?v=1',
  },
  {
    title: 'Step 2 — Create a new API key',
    body: 'Click the Create API button at the top-right. Your account must have KYC completed; each account can create up to 30 keys.',
    imageSrc: '/import-guides/binance/02-create-api.png?v=1',
  },
  {
    title: 'Step 3 — Choose "System generated"',
    body: 'Select System generated (HMAC) and click Next. Do not choose Self-generated (Ed25519 / RSA) — FINOTAUR does not support that key type.',
    imageSrc: '/import-guides/binance/03-key-type.png?v=1',
  },
  {
    title: 'Step 4 — Label the key',
    body: 'Give the key a name you\'ll recognize, for example "FINOTAUR-Journal", then click Next.',
    imageSrc: '/import-guides/binance/04-label.png?v=1',
  },
  {
    title: 'Step 5 — Enable Reading only',
    body: 'Turn on "Enable Reading" and leave everything else OFF — no Spot, Futures, Withdrawals, or Transfer. Then copy your API Key and Secret Key now; Binance shows the Secret Key only once.',
    imageSrc: '/import-guides/binance/05-permissions.png?v=1',
  },
  {
    title: 'Step 6 — Connect in FINOTAUR',
    body: 'Back here in FINOTAUR, paste your API Key and Secret Key, enter the pairs you trade (for example BTCUSDT, ETHUSDT), then click Connect. Your first sync starts automatically.',
  },
];

interface Props {
  onClose: () => void;
}

export default function BinanceApiKeyGuide({ onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;
  const isFirst = idx === 0;

  const next = useCallback(() => setIdx(i => Math.min(i + 1, SLIDES.length - 1)), []);
  const prev = useCallback(() => setIdx(i => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#141414] border border-zinc-800/80 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl shadow-black/50 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0B90B]/10 border border-[#F0B90B]/30 flex items-center justify-center">
              <img
                src="/brokers/binance.svg"
                alt="Binance"
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const sib = e.currentTarget.nextElementSibling;
                  if (sib) (sib as HTMLElement).classList.remove('hidden');
                }}
              />
              <span className="hidden text-xs font-bold text-[#F0B90B]">BNB</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Connect Binance</h2>
              <p className="text-xs text-zinc-500">binance.com/en/my/settings/api-management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close guide"
            className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <p className="text-xs text-[#C9A646] font-medium uppercase tracking-wider mb-1">
              {idx + 1} / {SLIDES.length}
            </p>
            <h3 className="text-xl font-semibold text-white mb-2">{slide.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{slide.body}</p>
          </div>

          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 flex items-center justify-center min-h-[260px]">
            {slide.imageSrc ? (
              <img
                src={slide.imageSrc}
                alt={slide.title}
                className="max-w-full max-h-[420px] rounded-lg border border-zinc-800/60"
              />
            ) : (
              /* Closing panel for the last (no-image) slide */
              <div className="flex flex-col items-center justify-center gap-4 py-6 text-center max-w-sm mx-auto">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#F0B90B]/30 bg-[#F0B90B]/10">
                  <img
                    src="/brokers/binance.svg"
                    alt="Binance"
                    className="w-9 h-9 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const sib = e.currentTarget.nextElementSibling;
                      if (sib) (sib as HTMLElement).classList.remove('hidden');
                    }}
                  />
                  <span className="hidden text-lg font-bold text-[#F0B90B]">BNB</span>
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">You're all set!</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Paste your API Key and Secret Key on the next screen, add the trading pairs you want to track, and click Connect.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800/80 p-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? 'bg-[#C9A646] w-8' : 'bg-zinc-700 hover:bg-zinc-600 w-1.5'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={prev}
              disabled={isFirst}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            {!isLast ? (
              <button
                onClick={next}
                className="px-4 py-2 bg-gradient-to-r from-[#C9A646] to-[#E5C158] hover:from-[#B39540] hover:to-[#D4B55E] text-black font-semibold rounded-lg transition-all flex items-center gap-1.5 text-sm shadow-lg shadow-[#C9A646]/20"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gradient-to-r from-[#C9A646] to-[#E5C158] hover:from-[#B39540] hover:to-[#D4B55E] text-black font-semibold rounded-lg transition-all flex items-center gap-1.5 text-sm shadow-lg shadow-[#C9A646]/20"
              >
                Got it
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
