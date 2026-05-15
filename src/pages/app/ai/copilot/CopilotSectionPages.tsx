import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  BarChart3,
  Globe,
  Layers,
  MessageSquare,
  Radar,
  Shield,
  Zap,
} from 'lucide-react';
import { CopilotChatPanel } from './components/CopilotChatPanel';
import { HoldingsTable } from './components/HoldingsTable';
import { usePortfolioMockData } from './hooks/usePortfolioMockData';

const opportunities = [
  ['NVDA', 'NVIDIA Corporation', 'AI infrastructure momentum', '92', '+18.4%'],
  ['MSFT', 'Microsoft Corporation', 'Cloud + AI compounder', '89', '+11.2%'],
  ['AMZN', 'Amazon.com, Inc.', 'Margin expansion setup', '86', '+9.6%'],
  ['META', 'Meta Platforms Inc.', 'Cashflow + ads strength', '84', '+8.8%'],
] as const;

const macroRows = [
  ['Rates', 'Neutral to supportive', 'Cuts priced gradually; duration risk is controlled.'],
  ['Liquidity', 'Constructive', 'Mega-cap bid remains strong while credit stress is contained.'],
  ['USD', 'Watch', 'A sharper dollar rally can pressure growth and international exposure.'],
  ['Earnings cycle', 'Positive', 'Forward revisions are improving in technology and communication services.'],
] as const;

const riskRows = [
  ['Concentration', 'Medium', 'Top 3 holdings drive 58% of portfolio beta.'],
  ['Volatility', 'Medium', 'Growth allocation can widen daily drawdowns during rate shocks.'],
  ['Liquidity', 'Low', 'Core holdings remain highly liquid.'],
  ['Correlation', 'Medium', 'AI and mega-cap names can move together during risk-off sessions.'],
] as const;

export function CopilotTopOpportunitiesPage() {
  return (
    <CopilotPageShell title="Top Opportunities" eyebrow="AI-ranked portfolio actions" icon={Zap}>
      <div className="grid gap-3">
        {opportunities.map(([ticker, name, thesis, score, upside]) => (
          <section key={ticker} className="grid gap-4 rounded-[7px] border border-gold-primary/18 bg-[#080704]/92 p-5 md:grid-cols-[96px_1fr_120px]">
            <div className="flex h-20 w-20 items-center justify-center rounded-[7px] border border-gold-primary/25 bg-gold-primary/10 font-mono text-xl font-bold text-gold-primary">
              {ticker}
            </div>
            <div>
              <p className="text-lg font-semibold text-ink-primary">{name}</p>
              <p className="mt-2 text-sm text-ink-secondary">{thesis}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full bg-gradient-to-r from-[#9b7d22] to-[#f4d97b]" style={{ width: `${Number(score)}%` }} />
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-[7px] border border-gold-primary/16 bg-black/30 p-4 text-center">
              <span className="font-mono text-2xl text-gold-primary">{score}</span>
              <span className="mt-1 text-[10px] uppercase text-ink-tertiary">AI score</span>
              <span className="mt-3 font-mono text-sm text-emerald-300">{upside}</span>
            </div>
          </section>
        ))}
      </div>
    </CopilotPageShell>
  );
}

export function CopilotMacroPage() {
  return (
    <CopilotPageShell title="Macro" eyebrow="Portfolio-aware macro lens" icon={Globe}>
      <div className="grid gap-3 lg:grid-cols-2">
        {macroRows.map(([label, state, text]) => (
          <section key={label} className="rounded-[7px] border border-gold-primary/18 bg-[#080704]/92 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm uppercase text-gold-primary">{label}</p>
              <span className="rounded-[5px] border border-gold-primary/18 bg-gold-primary/8 px-3 py-1 text-[10px] uppercase text-gold-primary">{state}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{text}</p>
          </section>
        ))}
      </div>
      <section className="mt-3 rounded-[7px] border border-gold-primary/18 bg-[#080704]/92 p-5">
        <div className="flex items-center gap-3 text-gold-primary">
          <BarChart3 className="h-5 w-5" />
          <p className="text-sm uppercase">Portfolio sensitivity</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label="Rate shock" value="-3.2%" />
          <Metric label="USD spike" value="-1.4%" />
          <Metric label="Risk-on rally" value="+6.8%" positive />
        </div>
      </section>
    </CopilotPageShell>
  );
}

export function CopilotHoldingsPage() {
  const snapshot = usePortfolioMockData('1Y');

  return (
    <CopilotPageShell title="Holdings" eyebrow="Positions, exposure, and P&L" icon={Layers}>
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Positions" value={String(snapshot.holdings.length)} />
        <Metric label="Market value" value={`$${Math.round(snapshot.totalValue).toLocaleString('en')}`} />
        <Metric label="Unrealized P&L" value={`+$${Math.round(snapshot.holdings.reduce((sum, h) => sum + h.unrealizedPnl, 0)).toLocaleString('en')}`} positive />
      </div>
      <div className="mt-3">
        <HoldingsTable holdings={snapshot.holdings} />
      </div>
    </CopilotPageShell>
  );
}

export function CopilotRisksPage() {
  return (
    <CopilotPageShell title="Risks" eyebrow="AI risk map for the portfolio" icon={Shield}>
      <div className="grid gap-3 lg:grid-cols-[360px_1fr]">
        <section className="rounded-[7px] border border-gold-primary/18 bg-[#080704]/92 p-6">
          <div className="relative mx-auto h-64 w-64">
            <Radar className="absolute inset-0 h-full w-full text-gold-primary/22" />
            <div className="absolute inset-[62px] rotate-45 border border-gold-primary/45 bg-gold-primary/12 shadow-[0_0_38px_rgba(201,166,70,0.22)]" />
            <div className="absolute left-[48%] top-[14%] h-3 w-3 rounded-full bg-gold-primary" />
            <div className="absolute right-[18%] top-[42%] h-3 w-3 rounded-full bg-gold-primary/80" />
            <div className="absolute left-[21%] bottom-[31%] h-3 w-3 rounded-full bg-gold-primary/70" />
          </div>
        </section>
        <section className="rounded-[7px] border border-gold-primary/18 bg-[#080704]/92 p-5">
          <div className="space-y-3">
            {riskRows.map(([label, level, text]) => (
              <div key={label} className="rounded-[7px] border border-gold-primary/12 bg-black/24 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-ink-primary">{label}</p>
                  <span className={level === 'Low' ? 'text-emerald-300' : 'text-gold-primary'}>{level}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </CopilotPageShell>
  );
}

export function CopilotAIChatPage() {
  return (
    <CopilotPageShell title="AI Portfolio Chat" eyebrow="Ask the AI about your portfolio" icon={MessageSquare}>
      <div className="min-h-[680px]">
        <CopilotChatPanel />
      </div>
    </CopilotPageShell>
  );
}

function CopilotPageShell({
  title,
  eyebrow,
  icon: Icon,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#030302] px-3 py-4 text-ink-primary">
      <main className="mx-auto max-w-[1480px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[7px] border border-gold-primary/30 bg-gold-primary/10 text-gold-primary shadow-[0_0_24px_rgba(201,166,70,0.16)]">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-ink-tertiary">{eyebrow}</p>
              <h1 className="text-2xl font-semibold text-gold-primary">{title}</h1>
            </div>
          </div>
          <Link to="/app/ai/copilot" className="inline-flex items-center gap-2 rounded-[6px] border border-gold-primary/20 bg-black/30 px-3 py-2 text-xs uppercase text-gold-primary hover:bg-gold-primary/10">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Copilot
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}

function Metric({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-[7px] border border-gold-primary/18 bg-[#080704]/92 p-5">
      <p className="text-[10px] uppercase text-ink-tertiary">{label}</p>
      <p className={`mt-2 font-mono text-2xl ${positive ? 'text-emerald-300' : 'text-gold-primary'}`}>{value}</p>
    </div>
  );
}
