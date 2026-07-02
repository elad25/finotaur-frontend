/**
 * HomePage — FINOTAUR hub landing page.
 *
 * Tradezella-style hub: greeting + Ask Fino card + product grid + focus links.
 * Renders full-width (no product sidebar) via NO_SIDEBAR_ROUTES in ProtectedAppLayout.
 */

import { useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Brain,
  Copy,
  Flame,
  FileText,
  BookOpen,
  Library,
  Zap,
  Send,
  type LucideIcon,
} from 'lucide-react';

import { Card, Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
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
  'copy-trade': { icon: Zap,        blurb: 'Mirror trades across accounts.' },
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
  const { hasBetaAccess } = useAdminAuth();
  const { open } = useFinoChat();
  const { profile, isLoading: profileLoading } = useUserProfile();

  // Never fall back to the user's email for the greeting — showing it (even
  // momentarily, before the profile resolves) reads as a bug. While the
  // profile is loading we render no name at all, then swap straight to the
  // display name. No email ever flashes.
  const firstName = profileLoading
    ? ''
    : (profile?.display_name || 'trader').trim().split(' ')[0];
  const greeting = computeGreeting();

  const [inputValue, setInputValue] = useState('');

  // FINO mascot codec pick: Safari / iOS WebKit can't render VP9-alpha WebM
  // transparently, so those browsers get the animated-WebP-with-alpha fallback
  // instead. Everything Chromium/Gecko keeps the smaller, smoother VP9 WebM.
  const finoUsesWebpFallback =
    typeof navigator !== 'undefined' &&
    /AppleWebKit/.test(navigator.userAgent) &&
    !/Chrome|Chromium|Android/.test(navigator.userAgent);

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
      {/* mb-ds-6 (32px) on top of the container's space-y-ds-6 → a larger,
          more deliberate gap between the greeting and the Ask Fino card. */}
      <div className="text-center mb-ds-6">
        <h1 className="text-3xl font-semibold text-ink-primary">
          {greeting}{firstName && `, ${firstName}`}
        </h1>
      </div>

      {/* ── 2. ASK FINO CARD ────────────────────────────────────────── */}
      <Card variant="featured" padding="default">
        <div className="flex items-center gap-ds-4">
          {/* Big FINO — real animated video, transparent (VP9 alpha WebM).
              90s natural idle: subtle breathing/blink + occasional wave hello
              and a thinking beat, woven from eight 15s beats that each start
              AND end on the same neutral anchor pose (arms relaxed at sides),
              so the loop is seamless and FINO never "snaps". Locked-off camera,
              same framing throughout, bipedal (2 legs + 2 arms), anchored to
              the canonical full-body FINO still via image-to-video. Transparency
              from the bg-remover's exact (0,0,0) matte → ffmpeg colorkey 0.01 →
              VP9 alpha, which preserves the dark fur and cape folds. The poster
              keeps a still FINO visible if the browser can't play VP9-alpha
              (e.g. Safari). Replaces the v8 animated-webp loop. */}
          {finoUsesWebpFallback ? (
            <img
              src="/fino/fino-safari-v4.webp"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-40 w-40 flex-shrink-0 self-center object-contain"
            />
          ) : (
            <video
              src="/fino/fino-home-natural-v4.webm"
              poster="/fino/fino-home-natural-v4-poster.png"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
              draggable={false}
              className="h-40 w-40 flex-shrink-0 self-center object-contain"
            />
          )}

          {/* Right column — title, compact input, chips */}
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-gold-primary">Ask Fino</p>
            <p className="text-sm text-ink-secondary mt-1">
              Ask anything about your trading, setups, or the markets.
            </p>

            {/* Input + send button (compact) */}
            <div className="flex items-center gap-ds-2 mt-ds-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Fino anything..."
                aria-label="Ask Fino a question"
                className="
                  flex-1 min-w-0 rounded-md bg-surface-base border border-border-ds-subtle
                  px-ds-3 py-1.5 text-sm text-ink-primary placeholder:text-ink-secondary
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
            <div className="flex flex-wrap gap-2 mt-ds-3">
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
          </div>
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
            if (id === 'trading-arena') return null; // kept in side-nav drawer; removed from Home grid only
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
                  hover:border-gold-border hover:bg-[#C9A646]/10
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

          {/* Academy — public learning center */}
          <Card
            role="button"
            tabIndex={0}
            padding="default"
            onClick={() => navigate('/academy')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/academy');
              }
            }}
            aria-label="Go to Academy"
            className="sm:col-span-2 cursor-pointer border-[#d8c79a] hover:border-[#b08316] transition-colors"
            style={{
              backgroundColor: '#ece0c4',
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(99,132,173,0.32) 31px, rgba(99,132,173,0.32) 32px)',
            }}
          >
            <div className="flex items-center justify-between gap-ds-4">
              <div className="flex items-center gap-ds-3">
                {/* Inverted: black books inside a black-bordered square tile */}
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] border-2 border-[#1a1a1a]">
                  <Library className="h-5 w-5 text-[#1a1a1a]" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#2b2620]">Academy</p>
                  <p className="text-xs text-[#5c5443] mt-0.5">300+ free lessons — markets, options, crypto &amp; more.</p>
                </div>
              </div>
              {/* Visual CTA — the whole card is the interactive target (navigates to /academy) */}
              <span
                className="hidden sm:inline-flex flex-shrink-0 items-center rounded-[10px] px-4 py-2 text-sm font-semibold text-[#1a1a1a]"
                style={{
                  background:
                    'linear-gradient(135deg, #e3c569 0%, #c9a646 55%, #a8842f 100%)',
                }}
              >
                Explore Academy
              </span>
            </div>
          </Card>
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
            className="cursor-pointer hover:border-gold-border hover:bg-[#C9A646]/10 transition-colors"
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
            className="cursor-pointer hover:border-gold-border hover:bg-[#C9A646]/10 transition-colors"
          >
            <p className="text-sm font-semibold text-ink-primary">Run an AI analysis</p>
            <p className="text-xs text-ink-secondary mt-1">Get AI-powered insights on any stock.</p>
          </Card>
        </div>
      </section>

      </div>
    </div>
  );
}
