import { useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  Layers3,
  Radar,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { PerformanceChart } from './components/PerformanceChart';
import { GlobeLoader } from './components/GlobeLoader';
import { usePortfolioMockData, TimeRange } from './hooks/usePortfolioMockData';

const RANGES: TimeRange[] = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

export function FinotaurCopilotDashboard() {
  const [range, setRange] = useState<TimeRange>('1Y');
  const snapshot = usePortfolioMockData(range);

  return (
    <div className="min-h-screen bg-[#030302] text-ink-primary relative overflow-hidden">
      <CircuitBackdrop />

      <main className="relative z-10 px-3 py-3 max-w-[1480px] mx-auto">
        <div className="relative overflow-hidden border-b border-gold-primary/12 pb-5 pt-1">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
          <p className="text-center text-[10px] uppercase tracking-[0.28em] text-gold-primary/72">
            Finotaur Intelligence System
          </p>
          <h1 className="mx-auto mt-3 max-w-[980px] text-center text-[36px] font-semibold uppercase leading-[0.95] text-white md:text-[52px]">
            <span className="block bg-gradient-to-r from-gold-deep via-gold-bright to-gold-primary bg-clip-text text-transparent">
              FINOTAUR Copilot
            </span>
            <span className="mt-2 block text-ink-primary">Portfolio Command Center</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[860px] text-center text-[11px] uppercase tracking-[0.18em] text-ink-tertiary">
            Institutional-grade market intelligence, portfolio signals, and autonomous risk awareness
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
          <PortfolioValuePanel className="xl:col-span-4" range={range} />
          <AiBrainPanel className="xl:col-span-4" />
          <InsightsPanel className="xl:col-span-4" />

          <div className="xl:col-span-8">
            <PerformanceChart series={snapshot.series} />
          </div>
          <div className="xl:col-span-4">
            <TopOpportunitiesPanel />
          </div>

          <AllocationPanel className="xl:col-span-4" />
          <SectorExposurePanel className="xl:col-span-4" />
          <RiskAnalysisPanel className="xl:col-span-4" />
        </div>
      </main>

    </div>
  );
}

function CircuitBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-55"
        style={{
          backgroundImage: `
            linear-gradient(rgba(201,166,70,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,166,70,0.045) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 50% 9%, rgba(244,217,123,0.18), transparent 24%),
            radial-gradient(circle at 84% 6%, rgba(201,166,70,0.10), transparent 18%),
            linear-gradient(180deg, transparent 0%, #030302 88%)
          `,
        }}
      />
    </>
  );
}

function PremiumFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden rounded-[7px] border border-gold-primary/20 bg-[#070604]/92 shadow-[0_24px_70px_rgba(0,0,0,0.48)] ${className}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/65 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(244,217,123,0.075),transparent_30%,rgba(201,166,70,0.025))]" />
      <div className="relative h-full">{children}</div>
    </section>
  );
}

function PortfolioValuePanel({ className, range }: { className?: string; range: TimeRange }) {
  return (
    <PremiumFrame className={`min-h-[260px] ${className}`}>
      <div className="p-5 h-full grid grid-rows-[1fr_auto]">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase text-ink-tertiary">TOTAL PORTFOLIO VALUE</p>
            <Eye className="h-3.5 w-3.5 text-ink-tertiary" />
          </div>
          <div className="mt-6 font-mono text-[42px] leading-none text-gold-primary tabular-nums">$1,247,842.35</div>
          <div className="mt-6 grid grid-cols-2 gap-5">
            <Stat label="24H CHANGE" value="+2.34%" sub="+$28,472.11" positive />
            <MiniReturn />
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-gold-primary/12 mt-6 pt-5">
          <Stat label="CASH BALANCE" value="$87,432.21" />
          <Stat label="BUYING POWER" value="$163,210.09" />
        </div>
        <div className="absolute right-4 top-4 text-[10px] text-gold-primary/70">{range}</div>
      </div>
    </PremiumFrame>
  );
}

function Stat({ label, value, sub, positive = false }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div>
      <p className="text-[9px] uppercase text-ink-tertiary">{label}</p>
      <div className={`mt-2 font-mono text-sm tabular-nums ${positive ? 'text-emerald-300' : 'text-ink-primary'}`}>{value}</div>
      {sub && <div className="mt-1 font-mono text-xs text-emerald-300">{sub}</div>}
    </div>
  );
}

function MiniReturn() {
  return (
    <div>
      <p className="text-[9px] uppercase text-ink-tertiary">ALL TIME RETURN</p>
      <p className="mt-2 font-mono text-sm text-emerald-300">+24.67%</p>
      <svg viewBox="0 0 120 28" className="mt-2 h-7 w-28">
        <path d="M0 22L10 18L19 20L28 13L37 16L47 8L56 11L65 6L75 13L84 10L94 14L104 7L120 10" fill="none" stroke="#d6b34f" strokeWidth="2" />
        <path d="M0 22L10 18L19 20L28 13L37 16L47 8L56 11L65 6L75 13L84 10L94 14L104 7L120 10V28H0Z" fill="rgba(201,166,70,0.12)" />
      </svg>
    </div>
  );
}

function AiBrainPanel({ className }: { className?: string }) {
  return (
    <div className={`relative min-h-[330px] ${className}`}>
      <div className="absolute inset-x-[-72px] top-[118px] hidden xl:block h-px bg-gradient-to-r from-transparent via-gold-primary/60 to-transparent" />
      <div className="relative h-full min-h-[330px] flex items-start justify-center overflow-visible">
        <div className="absolute top-0 h-[286px] w-[108%] max-w-[500px] border border-gold-primary/20 bg-black/15 shadow-[0_0_90px_rgba(201,166,70,0.18)] [clip-path:polygon(10%_0,90%_0,100%_16%,100%_76%,88%_100%,12%_100%,0_76%,0_16%)]" />
        <div className="absolute top-4 h-[252px] w-[94%] max-w-[444px] border border-gold-primary/10 [clip-path:polygon(10%_0,90%_0,100%_16%,100%_76%,88%_100%,12%_100%,0_76%,0_16%)]" />
        <div className="absolute left-1/2 top-[110px] h-[250px] w-[470px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,217,123,0.24),rgba(201,166,70,0.08)_38%,transparent_68%)] blur-xl" />
        <div className="absolute left-1/2 top-[16px] -translate-x-1/2">
          <GlobeLoader size={240} />
        </div>
        <div className="absolute bottom-[-4px] left-1/2 w-[270px] -translate-x-1/2 rounded-[8px] border border-gold-primary/24 bg-black/75 px-5 py-3 text-center shadow-[0_0_36px_rgba(201,166,70,0.22)] backdrop-blur-md">
          <div className="text-sm font-semibold uppercase text-gold-primary">AI CORE</div>
          <p className="mt-1 text-[10px] leading-relaxed text-ink-tertiary">Real-time market analysis</p>
          <p className="mt-1 font-mono text-[10px] text-ink-primary">24/7</p>
          <div className="absolute -bottom-3 left-1/2 h-3 w-px bg-gold-primary/80" />
          <Zap className="absolute -bottom-5 left-1/2 h-4 w-4 -translate-x-1/2 text-gold-primary" />
        </div>
      </div>
    </div>
  );
}

function InsightsPanel({ className }: { className?: string }) {
  return (
    <PremiumFrame className={`min-h-[260px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="AI INSIGHTS" action="CHAT" actionTo="/app/ai/copilot/ai-chat" />
        <div className="mt-4 flex items-center gap-4 border-b border-gold-primary/12 pb-4">
          <div className="relative h-24 w-24 rounded-full bg-[conic-gradient(#f4d97b_0_78%,rgba(255,255,255,0.08)_78%_100%)] p-2 shadow-[0_0_26px_rgba(201,166,70,0.22)]">
            <div className="h-full w-full rounded-full bg-[#090704] flex items-center justify-center font-mono text-2xl text-white">78%</div>
          </div>
          <div>
            <p className="text-[10px] uppercase text-ink-tertiary">PORTFOLIO HEALTH</p>
            <p className="mt-1 text-lg text-gold-primary">Strong</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">Your portfolio is well balanced with optimal risk exposure.</p>
          </div>
        </div>
        <InsightRow icon={Layers3} title="DIVERSIFICATION" text="Well diversified across assets and sectors." />
        <InsightRow icon={ShieldCheck} title="RISK EXPOSURE" text="Risk level is optimal for your profile." />
        <InsightRow icon={TrendingUp} title="PERFORMANCE" text="Outperforming 78% of similar portfolios." />
      </div>
    </PremiumFrame>
  );
}

function PanelHeader({ title, action, actionTo }: { title: string; action?: string; actionTo?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[13px] uppercase text-gold-primary">{title}</p>
      {action && actionTo && (
        <Link to={actionTo} className="rounded-[5px] border border-gold-primary/22 bg-black/30 px-3 py-1 text-[9px] uppercase text-gold-primary hover:bg-gold-primary/10">
          {action}
        </Link>
      )}
      {action && !actionTo && (
        <button className="rounded-[5px] border border-gold-primary/22 bg-black/30 px-3 py-1 text-[9px] uppercase text-gold-primary hover:bg-gold-primary/10">
          {action}
        </button>
      )}
    </div>
  );
}

function InsightRow({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
  return (
    <div className="flex gap-3 border-b border-gold-primary/10 py-3 last:border-b-0">
      <div className="h-8 w-8 rounded-[6px] border border-gold-primary/20 bg-gold-primary/9 flex items-center justify-center text-gold-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] text-gold-primary">{title}</p>
        <p className="mt-1 text-xs text-ink-secondary">{text}</p>
      </div>
    </div>
  );
}

function TopOpportunitiesPanel() {
  const items = [
    ['NVDA', 'NVIDIA Corporation', 'AI/TECHNOLOGY', 92],
    ['TSLA', 'Tesla, Inc.', 'GROWTH', 88],
    ['MSFT', 'Microsoft Corporation', 'LONG TERM', 85],
    ['AMZN', 'Amazon.com, Inc.', 'E-COMMERCE', 83],
  ] as const;

  return (
    <PremiumFrame className="min-h-[338px]">
      <div className="p-5">
        <PanelHeader title="TOP OPPORTUNITIES" action="VIEW ALL" actionTo="/app/ai/copilot/top-opportunities" />
        <div className="mt-4 space-y-2">
          {items.map(([ticker, company, tag, score]) => (
            <div key={ticker} className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-3 rounded-[6px] px-2 py-2 hover:bg-gold-primary/[0.045]">
              <TickerMark ticker={ticker} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{ticker}</p>
                <p className="text-[11px] text-ink-tertiary truncate">{company}</p>
              </div>
              <span className="rounded-[4px] border border-gold-primary/18 bg-gold-primary/8 px-2 py-1 text-[9px] uppercase text-gold-primary">{tag}</span>
              <div className="h-9 w-9 rounded-full border border-gold-primary/55 flex items-center justify-center font-mono text-xs text-gold-primary">{score}</div>
            </div>
          ))}
        </div>
      </div>
      <Link to="/app/ai/copilot/top-opportunities" className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t border-gold-primary/12 bg-gold-primary/[0.055] text-[11px] uppercase text-gold-primary">
        VIEW ALL OPPORTUNITIES <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </PremiumFrame>
  );
}

function TickerMark({ ticker }: { ticker: string }) {
  const color = ticker === 'TSLA' ? 'text-red-500' : ticker === 'NVDA' ? 'text-lime-400' : ticker === 'MSFT' ? 'text-sky-300' : 'text-amber-400';
  return <div className={`h-8 w-8 flex items-center justify-center font-black ${color}`}>{ticker.slice(0, 1)}</div>;
}

function AllocationPanel({ className }: { className?: string }) {
  const rows = [
    ['EQUITIES', '68.4%'],
    ['ETFs', '15.7%'],
    ['BONDS', '7.3%'],
    ['CASH', '5.6%'],
    ['OTHER', '2.0%'],
  ];
  return (
    <PremiumFrame className={`min-h-[210px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="HOLDINGS" action="VIEW ALL" actionTo="/app/ai/copilot/holdings" />
        <div className="mt-4 flex items-center gap-5">
          <div className="relative h-28 w-28 rounded-full bg-[conic-gradient(#f4d97b_0_34%,#c9a646_34%_68%,rgba(201,166,70,0.52)_68%_84%,rgba(255,255,255,0.13)_84%_100%)] p-4">
            <div className="h-full w-full rounded-full bg-[#080704] flex flex-col items-center justify-center">
              <span className="font-mono text-sm text-gold-primary">$1.25M</span>
              <span className="text-[9px] uppercase text-ink-tertiary">TOTAL</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[10px_1fr_auto] items-center gap-2 text-[11px]">
                <span className="h-2 w-2 bg-gold-primary/70" />
                <span className="text-ink-secondary">{label}</span>
                <span className="font-mono text-ink-primary">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PremiumFrame>
  );
}

function SectorExposurePanel({ className }: { className?: string }) {
  const sectors: Array<[string, number]> = [
    ['Technology', 28.7],
    ['Financials', 14.3],
    ['Health Care', 12.6],
    ['Consumer Cyclical', 11.8],
    ['Industrials', 8.7],
    ['Other', 23.9],
  ];
  return (
    <PremiumFrame className={`min-h-[210px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="MACRO" action="VIEW ALL" actionTo="/app/ai/copilot/macro" />
        <div className="mt-4 space-y-3">
          {sectors.map(([name, value]) => (
            <div key={name} className="grid grid-cols-[1fr_130px_42px] items-center gap-3 text-[11px]">
              <span className="text-ink-secondary truncate">{name}</span>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#9b7d22] to-[#f4d97b]" style={{ width: `${value * 2.1}%` }} />
              </div>
              <span className="font-mono text-ink-tertiary text-right">{value}%</span>
            </div>
          ))}
        </div>
      </div>
    </PremiumFrame>
  );
}

function RiskAnalysisPanel({ className }: { className?: string }) {
  const rows = [
    ['Market Risk', 'Medium'],
    ['Credit Risk', 'Low'],
    ['Liquidity Risk', 'Low'],
    ['Volatility Risk', 'Medium'],
    ['Concentration Risk', 'Low'],
  ];
  return (
    <PremiumFrame className={`min-h-[210px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="RISK ANALYSIS" action="VIEW ALL" actionTo="/app/ai/copilot/risks" />
        <div className="mt-4 grid grid-cols-[130px_1fr] gap-4 items-center">
          <div className="relative h-28 w-28">
            <Radar className="absolute inset-0 h-full w-full text-gold-primary/18" />
            <div className="absolute inset-[28px] rotate-45 border border-gold-primary/42 bg-gold-primary/12 shadow-[0_0_24px_rgba(201,166,70,0.18)]" />
            <div className="absolute left-[49%] top-[12%] h-2 w-2 rounded-full bg-gold-primary" />
            <div className="absolute right-[18%] top-[40%] h-2 w-2 rounded-full bg-gold-primary/80" />
            <div className="absolute right-[31%] bottom-[18%] h-2 w-2 rounded-full bg-gold-primary/70" />
            <div className="absolute left-[18%] bottom-[31%] h-2 w-2 rounded-full bg-gold-primary/70" />
          </div>
          <div className="space-y-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-ink-secondary">{label}</span>
                <span className={value === 'Medium' ? 'text-gold-primary' : 'text-ink-primary'}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PremiumFrame>
  );
}
