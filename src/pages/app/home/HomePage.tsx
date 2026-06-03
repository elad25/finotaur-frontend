/**
 * HomePage — FINOTAUR hub landing page.
 *
 * Tradezella-style hub: greeting + Ask Fino card + product grid + focus links.
 * Renders full-width (no product sidebar) via NO_SIDEBAR_ROUTES in ProtectedAppLayout.
 */

import { useState, type KeyboardEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp,
  Brain,
  Copy,
  Flame,
  FileText,
  BookOpen,
  Zap,
  Send,
  type LucideIcon,
} from 'lucide-react';

import { Card, Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useFinoChat } from '@/contexts/FinoChatContext';
import { computeGreeting } from '@/pages/app/ai/copilot/hooks/useDailyBrief';
import { domains, domainOrder, isDomainVisible } from '@/constants/nav';

// ---------------------------------------------------------------------------
// Product card metadata — owned by this page; not imported from ProductDrawer.
// ---------------------------------------------------------------------------
const PRODUCT_CARD: Record<string, { icon: LucideIcon; blurb: string }> = {
  markets:      { icon: TrendingUp, blurb: 'Research hub across every market.' },
  ai:           { icon: Brain,      blurb: 'AI-powered analysis tools.' },
  copilot:      { icon: Copy,       blurb: 'Your portfolio AI.' },
  'war-zone':   { icon: Flame,      blurb: 'High-conviction daily setups.' },
  'top-secret': { icon: FileText,   blurb: 'Premium monthly research.' },
  journal:      { icon: BookOpen,   blurb: 'Track, review, improve.' },
  'copy-trade': { icon: Zap,        blurb: 'Beta: trade copier.' },
};

// ---------------------------------------------------------------------------
// Prompt chips shown below the Ask Fino input
// ---------------------------------------------------------------------------
interface PromptChip {
  label: string;
  query?: string; // if undefined → open Fino with no preset query
}

const PROMPT_CHIPS: PromptChip[] = [
  { label: 'Show my best setups',          query: 'Show my best setups' },
  { label: "Review yesterday's trades",    query: "Review yesterday's trades" },
  { label: 'What mistakes am I repeating?', query: 'What mistakes am I repeating?' },
  { label: 'Build my game plan',           query: 'Build my game plan' },
  { label: 'Ask Fino anything' },          // no query → open only
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasBetaAccess } = useAdminAuth();
  const { open } = useFinoChat();
  const { profile } = useUserProfile();

  const firstName = (
    profile?.display_name ||
    user?.email?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'trader'
  ).trim().split(' ')[0];
  const greeting = computeGreeting();

  const [inputValue, setInputValue] = useState('');

  function askFino(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    open({ path: '/app/home', label: 'Ask Fino', query: trimmed });
    setInputValue('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      askFino(inputValue);
    }
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* ── GOLD ATMOSPHERE — subtle institutional glow behind the hub ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: `
            linear-gradient(rgba(201,166,70,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,166,70,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 88%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 88%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 50% 0%, rgba(244,217,123,0.17), transparent 34%),
            radial-gradient(circle at 86% 4%, rgba(201,166,70,0.11), transparent 26%),
            radial-gradient(circle at 12% 10%, rgba(201,166,70,0.07), transparent 28%)
          `,
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-ds-5 py-ds-6 space-y-ds-6">

      {/* ── 1. GREETING ─────────────────────────────────────────────── */}
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-ink-primary">
          {greeting}, {firstName}
        </h1>
      </div>

      {/* ── 2. ASK FINO CARD ────────────────────────────────────────── */}
      <Card variant="featured" padding="default">
        {/* Header row */}
        <div className="mb-ds-4 flex items-center gap-ds-3">
          {/* Animated FINO — full-body clip; mix-blend drops the near-black
              video background so he floats frameless on the card (no box). */}
          <video
            src="/fino/fino-meet-fullbody.mp4"
            poster="/fino/fino-meet-fullbody-poster.jpg"
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            className="h-24 w-24 flex-shrink-0 object-contain [mix-blend-mode:screen]"
          />
          <div>
            <p className="text-base font-semibold text-gold-primary">Ask Fino</p>
            <p className="text-sm text-ink-secondary mt-1">
              Ask anything about your trading, setups, or the markets.
            </p>
          </div>
        </div>

        {/* Input + send button */}
        <div className="flex items-center gap-ds-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Fino anything..."
            aria-label="Ask Fino a question"
            className="
              flex-1 rounded-md bg-surface-base border border-border-ds-subtle
              px-ds-4 py-2 text-sm text-ink-primary placeholder:text-ink-secondary
              focus:outline-none focus:border-gold-border transition-colors
            "
          />
          <Button
            variant="gold"
            size="compact"
            showArrow={false}
            onClick={() => askFino(inputValue)}
            aria-label="Send question to Fino"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send
          </Button>
        </div>

        {/* Prompt chips */}
        <div className="flex flex-wrap gap-2 mt-ds-4">
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                if (chip.query) {
                  open({ path: '/app/home', label: 'Ask Fino', query: chip.query });
                } else {
                  open({ path: '/app/home', label: 'Ask Fino' });
                }
              }}
              className="
                rounded-sm border border-border-ds-subtle px-3 py-1.5
                text-xs text-ink-secondary
                hover:text-gold-primary hover:border-gold-border
                transition-colors cursor-pointer
              "
            >
              {chip.label}
            </button>
          ))}
        </div>
      </Card>

      {/* ── 3. EXPLORE PRODUCTS GRID ────────────────────────────────── */}
      <section aria-labelledby="explore-heading">
        <div className="mb-ds-4">
          <Eyebrow id="explore-heading">Explore Products</Eyebrow>
          <h2 className="mt-2 text-xl font-semibold text-ink-primary">
            Everything FINOTAUR offers
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">
          {domainOrder.map((id) => {
            if (id === 'copy-trade') return null;
            const domain = domains[id];
            if (!domain) return null;
            if (!isDomainVisible(domain, hasBetaAccess)) return null;

            const meta = PRODUCT_CARD[id];
            const Icon = meta?.icon ?? TrendingUp;
            const blurb = meta?.blurb ?? '';

            // Copilot — non-navigable, shows "Coming Soon" badge
            if (id === 'copilot') {
              return (
                <div
                  key={id}
                  className="
                    rounded-[12px] bg-surface-1 border-[0.5px] border-border-ds-subtle
                    p-ds-5 opacity-70 cursor-default
                  "
                  aria-label={`${domain.label} — coming soon`}
                >
                  <div className="flex items-start justify-between gap-ds-3">
                    <div className="flex items-center gap-ds-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-surface-base border border-border-ds-subtle text-gold-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink-primary">{domain.label}</p>
                        <p className="text-xs text-ink-secondary mt-0.5">{blurb}</p>
                      </div>
                    </div>
                    <span className="rounded-sm bg-surface-base border border-border-ds-subtle px-2 py-0.5 text-[10px] text-ink-secondary whitespace-nowrap">
                      Coming Soon
                    </span>
                  </div>
                </div>
              );
            }

            // All other navigable products
            const targetPath =
              domain.defaultPath ??
              domain.subNav[0]?.path ??
              '/app';

            return (
              <Card
                key={id}
                role="button"
                tabIndex={0}
                padding="default"
                onClick={() => navigate(targetPath)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(targetPath);
                  }
                }}
                aria-label={`Go to ${domain.label}`}
                className="
                  cursor-pointer
                  hover:border-gold-border
                  transition-colors
                "
              >
                <div className="flex items-center gap-ds-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-surface-base border border-border-ds-subtle text-gold-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-primary">{domain.label}</p>
                    <p className="text-xs text-ink-secondary mt-0.5">{blurb}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── 4. RECOMMENDED FOCUS ────────────────────────────────────── */}
      <section aria-labelledby="focus-heading">
        <div className="mb-ds-4">
          <Eyebrow id="focus-heading">Recommended focus</Eyebrow>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">
          <Card
            role="button"
            tabIndex={0}
            padding="compact"
            onClick={() => navigate('/app/journal/new')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/app/journal/new');
              }
            }}
            aria-label="Log today's trades"
            className="cursor-pointer hover:border-gold-border transition-colors"
          >
            <p className="text-sm font-semibold text-ink-primary">Log today&apos;s trades</p>
            <p className="text-xs text-ink-secondary mt-1">Keep your journal up to date.</p>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            padding="compact"
            onClick={() => navigate('/app/ai/stock-analyzer')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/app/ai/stock-analyzer');
              }
            }}
            aria-label="Run an AI analysis"
            className="cursor-pointer hover:border-gold-border transition-colors"
          >
            <p className="text-sm font-semibold text-ink-primary">Run an AI analysis</p>
            <p className="text-xs text-ink-secondary mt-1">Get AI-powered insights on any stock.</p>
          </Card>
        </div>
      </section>

      {/* ── 5. RESOURCES ────────────────────────────────────────────── */}
      <section aria-labelledby="resources-heading">
        <div className="mb-ds-4">
          <Eyebrow id="resources-heading">Resources</Eyebrow>
        </div>
        <ul className="space-y-2">
          <li>
            <Link
              to="/app/all-markets/pricing"
              className="text-sm text-ink-secondary hover:text-gold-primary transition-colors"
            >
              Pricing
            </Link>
          </li>
          <li>
            <Link
              to="/app/journal/academy"
              className="text-sm text-ink-secondary hover:text-gold-primary transition-colors"
            >
              Academy
            </Link>
          </li>
        </ul>
      </section>

      </div>
    </div>
  );
}
