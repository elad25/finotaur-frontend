// Slideshow walkthrough showing the user how to export their trades from a
// specific journal (TradeZella, Tradervue, ...). Opened from the HOW? button
// on each journal card inside ImportTradesPopup.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  X, ArrowRight, ArrowLeft, CheckCircle2, MousePointer2,
  Target, BarChart3, Activity, LineChart, TrendingUp, Layers,
  Briefcase, Zap, Database, FileText,
} from 'lucide-react';
import type { JournalSource } from '@/utils/importUtils';

type SlideKind = 'image' | 'mockup';

interface GuideSlide {
  kind: SlideKind;
  title: string;
  body: string;
  imageSrc?: string;
  secondaryImageSrc?: string; // optional companion image (e.g. zoom-in with annotations)
  secondaryCaption?: string;  // small label rendered above the secondary image
  mockup?: ReactNode;
}

interface JournalGuide {
  source: JournalSource;
  name: string;
  homepageHint: string;
  slides: GuideSlide[];
}

// ------------------------------------------------------------
// MOCKUP COMPONENTS (rendered inline — no external images needed)
// ------------------------------------------------------------

const TZMockMenu = () => (
  <div className="rounded-xl border border-zinc-700 bg-[#1a1a2e] p-3 w-[320px] mx-auto shadow-2xl">
    {[
      'Mark as reviewed',
      'Mark as not reviewed',
      'Export trades to CSV',
      'Merge trades',
      'Split trade',
      'Add to strategy',
    ].map((label) => {
      const highlighted = label === 'Export trades to CSV';
      return (
        <div
          key={label}
          className={`px-3 py-2 text-sm rounded-md transition-all flex items-center gap-2 ${
            highlighted
              ? 'bg-[#C9A646]/15 text-[#C9A646] border border-[#C9A646]/40'
              : 'text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          {highlighted && <MousePointer2 className="w-3.5 h-3.5" />}
          {label}
        </div>
      );
    })}
  </div>
);

const TZMockModal = () => (
  <div className="rounded-2xl border border-zinc-700 bg-[#1a1a2e] p-5 w-[420px] mx-auto shadow-2xl">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-white font-semibold">Export trades</h4>
      <X className="w-4 h-4 text-zinc-500" />
    </div>
    <p className="text-zinc-400 text-xs mb-4 leading-relaxed">
      You&apos;re about to export your trades to CSV. Please select between including all columns or only the current active ones
    </p>
    <label className="text-xs text-zinc-500 mb-1.5 block">Columns</label>
    <div className="border border-[#C9A646]/40 bg-[#C9A646]/10 rounded-lg px-3 py-2.5 text-sm text-[#C9A646] mb-4 flex items-center justify-between">
      <span className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" /> All columns
      </span>
      <span className="text-[10px] text-[#C9A646]/70 uppercase tracking-wide">recommended</span>
    </div>
    <button className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#C9A646] to-[#E5C158] text-black font-semibold text-sm shadow-lg shadow-[#C9A646]/20">
      DOWNLOAD TRADES
    </button>
  </div>
);

const TZMockBulkBar = () => (
  <div className="rounded-xl border border-zinc-700 bg-[#1a1a2e] p-5 w-[520px] mx-auto shadow-2xl">
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
      <div className="flex items-center gap-3">
        <input type="checkbox" checked readOnly className="w-4 h-4 accent-[#C9A646]" />
        <span className="text-sm text-white font-medium">All trades selected</span>
        <span className="text-xs text-zinc-500">(15)</span>
      </div>
      <button className="px-4 py-2 rounded-lg bg-[#C9A646]/15 border border-[#C9A646]/40 text-[#C9A646] text-sm font-medium flex items-center gap-2">
        <MousePointer2 className="w-3.5 h-3.5" /> Bulk actions ▾
      </button>
    </div>
    <div className="grid grid-cols-6 gap-2 text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
      <span>Date</span><span>Symbol</span><span>Side</span><span>Qty</span><span>Entry</span><span>P&amp;L</span>
    </div>
    {[0, 1, 2].map(i => (
      <div key={i} className="grid grid-cols-6 gap-2 py-2 border-t border-zinc-800/50">
        {Array.from({ length: 6 }).map((_, j) => (
          <div key={j} className="h-3 rounded bg-zinc-700/40" />
        ))}
      </div>
    ))}
  </div>
);

// ------------------------------------------------------------
// PER-JOURNAL GUIDE DEFINITIONS
// ------------------------------------------------------------

const GUIDES: Partial<Record<JournalSource, JournalGuide>> = {
  tradezella: {
    source: 'tradezella',
    name: 'TradeZella',
    homepageHint: 'app.tradezella.com',
    slides: [
      {
        kind: 'image',
        title: 'Step 1 — Open Trade View',
        body: 'Log in to TradeZella and click "Trade View" in the left sidebar. The zoom on the right shows exactly where to click.',
        imageSrc: '/import-guides/tradezella/01-trade-view.png',
        secondaryImageSrc: '/import-guides/tradezella/01-trade-view-zoom.png',
        secondaryCaption: 'Zoom in',
      },
      {
        kind: 'mockup',
        title: 'Step 2 — Select trades & click Bulk Actions',
        body: 'Click the checkbox in the table header to select all trades, then click the "Bulk actions" button on the top right.',
        mockup: <TZMockBulkBar />,
      },
      {
        kind: 'mockup',
        title: 'Step 3 — Choose "Export trades to CSV"',
        body: 'A menu opens. Pick "Export trades to CSV" — the third item in the list.',
        mockup: <TZMockMenu />,
      },
      {
        kind: 'mockup',
        title: 'Step 4 — Pick "All columns" + Download',
        body: 'A dialog appears. Switch the dropdown to "All columns" (recommended — gives you Side & Quantity, not just visible data), then click DOWNLOAD TRADES. Your CSV lands in Downloads.',
        mockup: <TZMockModal />,
      },
    ],
  },
};

// Fallback for journals without a hand-built guide yet
const buildGenericGuide = (source: JournalSource, name: string): JournalGuide => ({
  source,
  name,
  homepageHint: '',
  slides: [
    {
      kind: 'mockup',
      title: `Export your trades from ${name}`,
      body: `Most journals offer a CSV export under Settings, Reports, or a "Bulk Actions" menu in your trades list. Look for "Export trades", "Download CSV", or similar wording, and pick the option that exports all columns (so Side, Quantity, and Commission come through).`,
      mockup: (
        <div className="rounded-xl border border-zinc-700 bg-[#1a1a2e] p-6 w-[420px] mx-auto text-center">
          <FileText className="w-10 h-10 text-[#C9A646] mx-auto mb-3" />
          <p className="text-zinc-300 text-sm">
            Detailed step-by-step guide for <span className="text-[#C9A646] font-semibold">{name}</span> coming soon.
          </p>
          <p className="text-zinc-500 text-xs mt-2">
            For now, export any CSV and Finotaur will auto-detect the format.
          </p>
        </div>
      ),
    },
  ],
});

const SOURCE_DISPLAY: Record<JournalSource, { name: string; icon: ReactNode; color: string }> = {
  tradezella: { name: 'TradeZella', icon: <Target className="w-4 h-4" />, color: 'text-emerald-400' },
  tradervue: { name: 'Tradervue', icon: <BarChart3 className="w-4 h-4" />, color: 'text-blue-400' },
  edgewonk: { name: 'Edgewonk', icon: <Activity className="w-4 h-4" />, color: 'text-orange-400' },
  tradesviz: { name: 'TradesViz', icon: <LineChart className="w-4 h-4" />, color: 'text-purple-400' },
  kinfo: { name: 'Kinfo', icon: <TrendingUp className="w-4 h-4" />, color: 'text-cyan-400' },
  tradingview: { name: 'TradingView', icon: <Layers className="w-4 h-4" />, color: 'text-red-400' },
  thinkorswim: { name: 'thinkorswim', icon: <Briefcase className="w-4 h-4" />, color: 'text-green-400' },
  tradovate: { name: 'Tradovate', icon: <Zap className="w-4 h-4" />, color: 'text-yellow-400' },
  ninjatrader: { name: 'NinjaTrader', icon: <Database className="w-4 h-4" />, color: 'text-indigo-400' },
  generic: { name: 'Generic CSV', icon: <FileText className="w-4 h-4" />, color: 'text-zinc-400' },
};

// ------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------

interface Props {
  source: JournalSource;
  onClose: () => void;
}

export default function JournalExportGuide({ source, onClose }: Props) {
  const guide = useMemo<JournalGuide>(
    () => GUIDES[source] ?? buildGenericGuide(source, SOURCE_DISPLAY[source].name),
    [source],
  );
  const display = SOURCE_DISPLAY[source];
  const [idx, setIdx] = useState(0);
  const slide = guide.slides[idx];
  const isLast = idx === guide.slides.length - 1;
  const isFirst = idx === 0;

  const next = useCallback(() => setIdx(i => Math.min(i + 1, guide.slides.length - 1)), [guide.slides.length]);
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
            <div className={`w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center ${display.color}`}>
              {display.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">How to export from {guide.name}</h2>
              {guide.homepageHint && (
                <p className="text-xs text-zinc-500">{guide.homepageHint}</p>
              )}
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
              {idx + 1} / {guide.slides.length}
            </p>
            <h3 className="text-xl font-semibold text-white mb-2">{slide.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{slide.body}</p>
          </div>

          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 flex items-center justify-center min-h-[260px]">
            {slide.kind === 'image' && slide.imageSrc && (
              slide.secondaryImageSrc ? (
                // Side-by-side layout: blurred page on the left, zoom-in callout on the right.
                // Stacks vertically on narrow viewports.
                <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-4 w-full items-center">
                  <img
                    src={slide.imageSrc}
                    alt={slide.title}
                    className="w-full max-h-[420px] object-contain rounded-lg border border-zinc-800/60"
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    {slide.secondaryCaption && (
                      <span className="text-[10px] uppercase tracking-widest text-[#C9A646]/80">
                        {slide.secondaryCaption}
                      </span>
                    )}
                    <img
                      src={slide.secondaryImageSrc}
                      alt={`${slide.title} — zoom`}
                      className="w-full max-h-[420px] object-contain rounded-lg border border-[#C9A646]/30 shadow-[0_0_24px_rgba(201,166,70,0.15)]"
                    />
                  </div>
                </div>
              ) : (
                <img
                  src={slide.imageSrc}
                  alt={slide.title}
                  className="max-w-full max-h-[420px] rounded-lg border border-zinc-800/60"
                />
              )
            )}
            {slide.kind === 'mockup' && slide.mockup}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800/80 p-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {guide.slides.map((_, i) => (
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
