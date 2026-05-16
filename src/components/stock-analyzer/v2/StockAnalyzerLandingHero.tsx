import { ArrowRight, BarChart3, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { StockSuggestion } from '@/types/stock-analyzer.types';
import { SearchBar } from '@/components/stock-analyzer/SearchBar';

interface StockAnalyzerLandingHeroProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectTicker: (ticker: string) => void;
  isLoading: boolean;
  suggestedTickers: StockSuggestion[];
  className?: string;
}

const CHART_POINTS = '0,74 26,68 52,55 78,61 104,42 130,46 156,34 182,26 208,32 234,18 260,24';
const CHART_BARS = [18, 28, 15, 34, 24, 41, 29, 20, 47, 31, 38, 26, 44, 36, 22, 50, 32, 40, 25, 48, 35, 30];

export function StockAnalyzerLandingHero({
  searchQuery,
  onSearchChange,
  onSelectTicker,
  isLoading,
  suggestedTickers,
  className,
}: StockAnalyzerLandingHeroProps) {
  return (
    <div
      className={cn(
        'stock-analyzer-premium-hero group relative min-h-[580px] overflow-hidden rounded-[8px]',
        'bg-section-base',
        className,
      )}
    >
      <PremiumHeroAtmosphere />

      <div className="relative z-10 grid min-h-[580px] items-center gap-ds-9 px-ds-5 py-ds-8 md:px-ds-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-[72px]">
        <motion.div
          className="max-w-3xl"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="max-w-[680px] font-sans text-[44px] font-semibold leading-[0.98] tracking-[0] text-ink-primary md:text-[66px]">
            Stock Analyzer
          </h1>
          <p className="mt-ds-4 max-w-xl text-[17px] font-normal leading-[1.7] text-ink-secondary">
            Institutional-grade deep research and AI-narrated analysis.
          </p>

          <div className="mt-ds-7 max-w-[760px]">
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              onSelect={onSelectTicker}
              isLoading={isLoading}
              variant="hero"
              showAnalyzeButton
            />
          </div>

          <div className="mt-ds-7">
            <p
              className="mb-ds-3 font-sans text-[10px] font-semibold uppercase text-gold-primary/65"
              style={{ letterSpacing: '0.26em' }}
            >
              Popular tickers
            </p>
            <div className="flex flex-wrap gap-ds-2">
              {suggestedTickers.slice(0, 8).map((stock) => (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() => onSelectTicker(stock.ticker)}
                  title={stock.name}
                  className={cn(
                    'rounded-[8px] border border-white/[0.045] bg-white/[0.018]',
                    'px-ds-3 py-ds-2 font-mono text-[12px] font-semibold text-ink-secondary',
                    'shadow-[0_10px_28px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.035)]',
                    'transition-all duration-300 ease-out',
                    'hover:-translate-y-0.5 hover:border-gold-border/70 hover:bg-gold-primary/[0.045] hover:text-ink-primary',
                    'hover:shadow-[0_16px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)]',
                    'focus-visible:outline-none focus-visible:border-gold-primary',
                  )}
                >
                  {stock.ticker}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="relative hidden min-h-[390px] lg:block">
          <MarketPreviewCard className="absolute right-[126px] top-[8px] w-[404px] rotate-[-0.7deg]" />
          <AnalysisPreviewCard className="absolute right-0 top-[82px] w-[216px]" />
        </div>
      </div>

      <style>{`
        .stock-analyzer-premium-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.032), transparent 20%),
            radial-gradient(ellipse at 50% -14%, rgba(248,218,134,0.20) 0%, rgba(201,166,70,0.075) 30%, transparent 63%);
          opacity: 0.9;
        }

        .stock-analyzer-premium-hero::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 8px;
          pointer-events: none;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.026),
            0 46px 140px rgba(0,0,0,0.46);
        }

        @keyframes stockAnalyzerFloat {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(var(--card-rotate, 0deg)); }
          50% { transform: translate3d(0, -7px, 0) rotate(var(--card-rotate, 0deg)); }
        }

        @keyframes stockAnalyzerReflection {
          0% { transform: translateX(-135%) rotate(18deg); opacity: 0; }
          32% { opacity: 0.34; }
          100% { transform: translateX(135%) rotate(18deg); opacity: 0; }
        }

        @keyframes stockAnalyzerLineDraw {
          from { stroke-dashoffset: 520; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

function PremiumHeroAtmosphere() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.018) 0%, transparent 31%), radial-gradient(ellipse at 18% 26%, rgba(201,166,70,0.072) 0%, rgba(201,166,70,0.026) 31%, transparent 58%), radial-gradient(ellipse at 82% 34%, rgba(255,255,255,0.036) 0%, rgba(255,255,255,0.012) 28%, transparent 57%), linear-gradient(180deg, rgba(8,8,8,0.28) 0%, rgba(2,2,2,0.78) 100%)',
        }}
      />
      <div
        className="absolute left-1/2 top-[-34%] h-[46%] w-[58%] -translate-x-1/2 rounded-full blur-[72px]"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(255,231,167,0.23) 0%, rgba(201,166,70,0.09) 38%, transparent 72%)',
        }}
      />
      <div
        className="absolute inset-x-[4%] top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/35 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-y-0 left-[4%] w-px bg-gradient-to-b from-transparent via-white/[0.055] to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-y-0 right-[4%] w-px bg-gradient-to-b from-transparent via-white/[0.055] to-transparent"
        aria-hidden="true"
      />
      <div className="absolute left-[4%] top-[40px] text-gold-primary/35" aria-hidden="true">+</div>
      <div className="absolute right-[4%] top-[40px] text-gold-primary/35" aria-hidden="true">+</div>
    </>
  );
}

function MarketPreviewCard({ className }: { className?: string }) {
  return (
    <motion.div
        className={cn(
        'relative overflow-hidden rounded-[16px] border border-white/[0.052] p-ds-5 backdrop-blur-2xl',
        'shadow-[0_40px_105px_rgba(0,0,0,0.46),0_12px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.055)]',
        className,
      )}
      style={{
        background:
          'linear-gradient(145deg, rgba(255,255,255,0.052) 0%, rgba(255,255,255,0.018) 38%, rgba(0,0,0,0.24) 100%)',
        animation: 'stockAnalyzerFloat 7.5s ease-in-out infinite',
        ['--card-rotate' as string]: '-1.2deg',
      }}
      whileHover={{ y: -8, rotate: -0.4, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse at 32% 0%, rgba(255,255,255,0.10) 0%, transparent 36%), linear-gradient(180deg, rgba(255,255,255,0.045), transparent 36%)',
        }}
      />
      <div
        className="absolute -left-1/3 top-[-40%] h-[180%] w-1/2 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.11), transparent)',
          animation: 'stockAnalyzerReflection 7s ease-in-out infinite 1.3s',
        }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold text-ink-primary">AAPL</p>
          <p className="mt-2 font-mono text-[28px] font-medium leading-none text-ink-primary">192.57</p>
          <p className="mt-2 font-mono text-[12px] font-medium text-ink-primary">+1.28 (0.67%)</p>
        </div>
        <div className="flex gap-1.5">
          {['1D', '1W', '1M', '3M', '1Y', '5Y'].map((range, index) => (
            <span
              key={range}
              className={cn(
                'rounded-[4px] border px-2 py-1 font-mono text-[8px] font-semibold',
                index === 0
                  ? 'border-gold-border bg-gold-primary/10 text-gold-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                  : 'border-white/[0.065] bg-white/[0.025] text-ink-tertiary',
              )}
            >
              {range}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-ds-5 h-[190px]">
        <svg viewBox="0 0 300 190" role="img" aria-label="Preview price chart" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="stockAnalyzerPremiumLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--gold-deep)" />
              <stop offset="48%" stopColor="var(--gold-bright)" />
              <stop offset="100%" stopColor="var(--gold-primary)" />
            </linearGradient>
            <linearGradient id="stockAnalyzerPremiumArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(201,166,70,0.20)" />
              <stop offset="45%" stopColor="rgba(201,166,70,0.07)" />
              <stop offset="100%" stopColor="rgba(201,166,70,0)" />
            </linearGradient>
            <filter id="stockAnalyzerLineGlow" x="-25%" y="-80%" width="150%" height="260%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g opacity="0.32" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5">
            <line x1="0" y1="48" x2="258" y2="48" />
            <line x1="0" y1="104" x2="258" y2="104" />
            <line x1="0" y1="160" x2="258" y2="160" />
          </g>
          <path d={`M ${CHART_POINTS} L 260,128 L 0,128 Z`} fill="url(#stockAnalyzerPremiumArea)" opacity="0.9" />
          <polyline
            points={CHART_POINTS}
            fill="none"
            stroke="url(#stockAnalyzerPremiumLine)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#stockAnalyzerLineGlow)"
            style={{
              strokeDasharray: 520,
              strokeDashoffset: 520,
              animation: 'stockAnalyzerLineDraw 1.55s cubic-bezier(0.16,1,0.3,1) forwards',
            }}
          />
          <g opacity="0.38">
            {CHART_BARS.map((height, index) => (
              <rect
                key={`${height}-${index}`}
                x={index * 12}
                y={158 - height}
                width="4"
                height={height}
                rx="1.5"
                fill="rgba(255,255,255,0.52)"
              />
            ))}
          </g>
          <g className="font-mono text-[8px]" fill="var(--text-tertiary)">
            <text x="268" y="50">185.8</text>
            <text x="268" y="108">182.4</text>
            <text x="268" y="164">99.8</text>
          </g>
        </svg>
      </div>
    </motion.div>
  );
}

function AnalysisPreviewCard({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-[14px] border border-white/[0.052] p-ds-5 backdrop-blur-2xl',
        'shadow-[0_34px_90px_rgba(0,0,0,0.48),0_10px_28px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)]',
        className,
      )}
      style={{
        background:
          'linear-gradient(150deg, rgba(255,255,255,0.056) 0%, rgba(255,255,255,0.022) 42%, rgba(0,0,0,0.30) 100%)',
        animation: 'stockAnalyzerFloat 8.4s ease-in-out infinite 0.55s',
        ['--card-rotate' as string]: '0deg',
      }}
      whileHover={{ y: -8, scale: 1.015, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute -right-12 -top-14 h-28 w-28 rounded-full blur-3xl"
        aria-hidden="true"
        style={{ background: 'rgba(201,166,70,0.14)' }}
      />
      <div className="relative flex items-center gap-ds-2 text-gold-primary">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <p className="font-sans text-[11px] font-semibold">AI Analysis</p>
      </div>
      <div className="relative mt-ds-4 flex h-11 w-11 items-center justify-center rounded-[10px] border border-gold-border bg-gold-primary/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <BarChart3 className="h-[18px] w-[18px] text-gold-primary" aria-hidden="true" />
      </div>
      <h2 className="relative mt-ds-4 text-[15px] font-semibold leading-[1.35] text-ink-primary">
        Strong financial health
      </h2>
      <p className="relative mt-ds-2 text-[12px] leading-[1.65] text-ink-secondary">
        Robust revenue growth and balance sheet quality, positioned for long-term value.
      </p>
      <button
        type="button"
        className="relative mt-ds-5 inline-flex items-center gap-ds-2 text-[12px] font-semibold text-gold-primary transition-all duration-300 hover:gap-ds-3 hover:text-gold-bright"
      >
        View full report
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>
    </motion.div>
  );
}
