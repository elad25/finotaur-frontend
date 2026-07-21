// src/components/landing-new/TraderSection.tsx
// ================================================
// 🔥 THE TRADER — unified, auto-rotating tabbed showcase
// Merges the former stacked journal/AI/copier blocks + the standalone
// JournalToolsTabs pill-tab idiom into ONE tabbed section. Auto-advances
// every 8s, pauses on hover, stops permanently on manual tab click.
// Real product screenshots throughout — no illustrations, no mockups.
// ================================================

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Brain,
  Flame,
  RotateCcw,
  BookOpen,
  BarChart3,
  Copy,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { SectionShell } from './_shared/SectionShell';
import { SectionEyebrow } from './_shared/SectionEyebrow';
import { SectionTitle } from './_shared/SectionTitle';

import journalDashboard from '@/assets/landing/journal-dashboard.webp';
import myTradesShot from '@/assets/landing/my-trades.webp';
import journalCalendar from '@/assets/landing/journal-calendar.webp';
import leakDetector from '@/assets/landing/leak-detector.webp';
import revengeRadar from '@/assets/landing/revenge-radar.webp';
import shadowShot from '@/assets/landing/shadow.webp';
import strategiesShot from '@/assets/landing/strategies.webp';
import dayOfWeekShot from '@/assets/landing/day-of-week.webp';
import copierShot from '@/assets/landing/copier.webp';
import riskManagementShot from '@/assets/landing/risk-management.webp';

// ---------------------------------------------------------------------------
// Tab data — copy/bullets carried over verbatim from the former stacked
// blocks (Dashboard / Calendar / Leak Detector / 2x2 grid / Copier + Risk)
// and from the former JournalToolsTabs (Backtesting / Trade Replay).
// ---------------------------------------------------------------------------
type TraderTabKey =
  | 'dashboard'
  | 'trades'
  | 'calendar'
  | 'leak'
  | 'revenge'
  | 'shadow'
  | 'playbooks'
  | 'breakdowns'
  | 'copier'
  | 'risk';

interface TraderTab {
  key: TraderTabKey;
  icon: LucideIcon;
  label: string;
  status: 'live';
  heading: string;
  description?: string;
  bullets?: string[];
  image: { src: string; alt: string; glow?: boolean };
}

const tabs: TraderTab[] = [
  {
    key: 'dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    status: 'live',
    heading: 'Every trade. Auto-synced. Scored.',
    bullets: [
      'Connects to your broker — no manual entry',
      'FINO Score grades your consistency, drawdown and expectancy',
      'Equity curve and daily P&L at institutional depth',
    ],
    image: {
      src: journalDashboard,
      alt: 'Finotaur journal dashboard showing net P&L of +$26,594, 49.6% win rate, 1.73 profit factor, a FINO Score of 78.19, and the full equity curve',
      glow: true,
    },
  },
  {
    key: 'trades',
    icon: ListOrdered,
    label: 'Trades',
    status: 'live',
    heading: 'Every fill, in one ledger.',
    description:
      'Date, side, session, entry to exit, R multiple and the strategy behind it — every trade logged the moment it closes, still there when you review.',
    image: {
      src: myTradesShot,
      alt: 'Finotaur My Trades ledger showing 118 logged trades with win rate, net P&L, R multiples and strategy tags',
    },
  },
  {
    key: 'calendar',
    icon: CalendarDays,
    label: 'Calendar',
    status: 'live',
    heading: 'Your month, at a glance.',
    description:
      "Green days aren't luck. The calendar shows every session's P&L, trade count and weekly R — so patterns stop hiding between trades.",
    image: {
      src: journalCalendar,
      alt: 'Finotaur journal calendar view showing a full month of daily P&L, trade counts and weekly summaries',
    },
  },
  {
    key: 'leak',
    icon: Brain,
    label: 'Leak Detector',
    status: 'live',
    heading: 'AI that finds your most expensive habit.',
    description:
      'The Leak Detector reads every trade and names the exact pattern draining your account — and what following your own rule was worth.',
    image: {
      src: leakDetector,
      alt: "Finotaur Leak Detector identifying the user's #1 leak — banking winners too early, costing −$102,662 — with a rule card and actual-vs-rule equity comparison",
      glow: true,
    },
  },
  {
    key: 'revenge',
    icon: Flame,
    label: 'Revenge Radar',
    status: 'live',
    heading: 'Catches tilt before it costs you.',
    description:
      'Revenge Radar flags the trade you took to get even — and puts a dollar figure on exactly what tilt has cost you this month.',
    image: {
      src: revengeRadar,
      alt: 'Finotaur Revenge Radar screen analyzing the cost of revenge trading',
    },
  },
  {
    key: 'shadow',
    icon: RotateCcw,
    label: 'Shadow',
    status: 'live',
    heading: 'What your trades could have been.',
    description:
      "Shadow replays your account against the discipline you didn't follow, so you can see the exact cost of breaking your own rules.",
    image: {
      src: shadowShot,
      alt: 'Finotaur Shadow screen comparing cumulative P&L across trading scenarios',
    },
  },
  {
    key: 'playbooks',
    icon: BookOpen,
    label: 'Playbooks',
    status: 'live',
    heading: 'Know which setup actually pays.',
    description:
      "Every strategy you tag gets its own win rate, expectancy and sample size — so you can size into what works and cut what doesn't.",
    image: {
      src: strategiesShot,
      alt: 'Finotaur My Strategies screen showing ICT MSS at 67% win rate and other tracked setups',
    },
  },
  {
    key: 'breakdowns',
    icon: BarChart3,
    label: 'Breakdowns',
    status: 'live',
    heading: 'Your edge by day, hour and symbol.',
    description:
      'See exactly when and where your P&L comes from, down to the session, the hour and the ticker.',
    image: {
      src: dayOfWeekShot,
      alt: 'Finotaur By Day of Week screen showing best and worst trading days by P&L',
    },
  },
  {
    key: 'copier',
    icon: Copy,
    label: 'Trade Copier',
    status: 'live',
    heading: 'Trade one account. Mirror them all.',
    bullets: [
      'Tradovate and NinjaTrader, connected in minutes',
      'Per-account risk locks and an instant kill switch',
      'One click flattens everything, everywhere',
    ],
    image: {
      src: copierShot,
      alt: 'Finotaur Trade Copier screen showing a Master Group mirroring an Apex evaluation account and a live Tradovate account, with automation on and a kill switch',
      glow: true,
    },
  },
  {
    key: 'risk',
    icon: ShieldCheck,
    label: 'Risk Manager',
    status: 'live',
    heading: 'Risk that enforces itself.',
    description:
      'Loss limits per trade, per day, per week — on breach, new copies pause automatically. Set once, applied to every account.',
    image: {
      src: riskManagementShot,
      alt: 'Finotaur Copier Risk Management screen showing per-account loss limits, profit targets, an automatic pause-new-copies on breach, and a $1,500 daily loss limit override',
    },
  },
];

// ---------------------------------------------------------------------------
// Pillar data — groups the flat tab list into a two-level nav. Journal and
// AI Insights show a secondary sub-tab row; Copier and Risk are single-panel
// pillars (their "sub-tab" is just themselves, no secondary row rendered).
// ---------------------------------------------------------------------------
type PillarKey = 'journal' | 'ai' | 'copier' | 'risk';

interface Pillar {
  key: PillarKey;
  icon: LucideIcon;
  label: string;
  subKeys: TraderTabKey[];
}

const pillars: Pillar[] = [
  {
    key: 'journal',
    icon: LayoutDashboard,
    label: 'Trade Journal',
    subKeys: ['dashboard', 'trades', 'calendar', 'breakdowns', 'playbooks'],
  },
  {
    key: 'ai',
    icon: Brain,
    label: 'AI Insights',
    subKeys: ['leak', 'revenge', 'shadow'],
  },
  {
    key: 'copier',
    icon: Copy,
    label: 'Trade Copier',
    subKeys: ['copier'],
  },
  {
    key: 'risk',
    icon: ShieldCheck,
    label: 'Risk Manager',
    subKeys: ['risk'],
  },
];

// Auto-rotation & manual-navigation sequence — flattened across pillars in
// Journal → AI Insights → Copier → Risk order. Arrow controls and dot/pill
// clicks all navigate through this same sequence, by numeric index.
const ROTATION_SEQUENCE: TraderTabKey[] = [
  'dashboard',
  'trades',
  'calendar',
  'breakdowns',
  'playbooks',
  'leak',
  'revenge',
  'shadow',
  'copier',
  'risk',
];

const AUTOROTATE_MS = 8000;

// Direction-aware slide+crossfade variants — `direction` (+1 = advancing
// forward through the sequence, -1 = going back) is passed in via
// AnimatePresence's `custom` prop so the EXITING panel (rendered by the
// previous render) picks up the latest direction too.
const panelVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: -dir * 48 }),
};

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/** Product screenshot — rounded corners, subtle border, optional gold glow for flagship shots. */
function ProductShot({
  src,
  alt,
  glow = false,
  className = '',
}: {
  src: string;
  alt: string;
  glow?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {glow && (
        <div
          className="absolute -inset-6 bg-gradient-to-r from-gold-primary/20 via-gold-primary/10 to-transparent rounded-3xl blur-3xl opacity-50 pointer-events-none"
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="relative block w-auto max-w-full h-auto max-h-[420px] lg:max-h-[500px] object-contain mx-auto rounded-[12px] border border-border-ds-subtle"
      />
    </div>
  );
}

/** Bulleted list matching the gold-dot idiom used across landing-new sections. */
function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-ink-secondary">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-gold-primary shrink-0" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Panel text block (heading + description + optional bullets) shared by both layouts. */
function PanelCopy({ tab, children }: { tab: TraderTab; children?: ReactNode }) {
  return (
    <div>
      <h3 className="font-wordmark font-medium text-2xl lg:text-3xl text-ink-primary leading-tight mb-3">
        {tab.heading}
      </h3>
      {tab.description && (
        <p className="font-sans font-light text-ink-secondary text-base leading-relaxed mb-5">
          {tab.description}
        </p>
      )}
      {tab.bullets && <BulletList items={tab.bullets} />}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TraderSection
// ---------------------------------------------------------------------------
const TraderSection = () => {
  // Rotation position is driven purely by a numeric index into
  // ROTATION_SEQUENCE — never by re-deriving "next" from a captured key,
  // which is what caused the stale-closure bug (advanced once, then stuck).
  const [seqIndex, setSeqIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [autoRotateStopped, setAutoRotateStopped] = useState(false);
  const preloadedRef = useRef<Set<string>>(new Set());

  const activeTabKey = ROTATION_SEQUENCE[seqIndex];
  const activeTab = tabs.find((t) => t.key === activeTabKey)!;
  const activePillar = pillars.find((p) => p.subKeys.includes(activeTabKey))!;
  const hasSubRow = activePillar.subKeys.length > 1;

  // Auto-rotation: advance every 8s through the sequence, looping. Paused on
  // hover (anywhere in the tab area — pills or panel), stopped for good once
  // the visitor manually picks a pill/dot/arrow.
  useEffect(() => {
    if (autoRotateStopped || isPaused) return;
    const id = window.setInterval(() => {
      setDirection(1);
      setSeqIndex((i) => (i + 1) % ROTATION_SEQUENCE.length);
    }, AUTOROTATE_MS);
    return () => window.clearInterval(id);
  }, [autoRotateStopped, isPaused]);

  // Preload the NEXT panel's screenshot so the fade-in never shows a blank
  // frame while the browser fetches it. (Chosen over eagerly mounting every
  // panel's <img> — keeps the DOM light and still keeps lazy-loading intact
  // for panels a visitor never reaches via manual clicks.)
  useEffect(() => {
    const nextIdx = (seqIndex + 1) % ROTATION_SEQUENCE.length;
    const next = tabs.find((t) => t.key === ROTATION_SEQUENCE[nextIdx]);
    if (next?.image && !preloadedRef.current.has(next.image.src)) {
      preloadedRef.current.add(next.image.src);
      const img = new Image();
      img.src = next.image.src;
    }
  }, [seqIndex]);

  function goToKey(key: TraderTabKey) {
    const idx = ROTATION_SEQUENCE.indexOf(key);
    const targetIdx = idx === -1 ? 0 : idx;
    setDirection(targetIdx >= seqIndex ? 1 : -1);
    setSeqIndex(targetIdx);
    setAutoRotateStopped(true);
  }

  function handleTabClick(key: TraderTabKey) {
    goToKey(key);
  }

  function handlePillarClick(pillar: Pillar) {
    setAutoRotateStopped(true);
    // If we're already showing a leaf that belongs to this pillar, leave it
    // as-is — otherwise jump to the pillar's first sub-tab (or its single
    // panel, for Copier/Risk).
    if (!pillar.subKeys.includes(activeTabKey)) {
      const idx = ROTATION_SEQUENCE.indexOf(pillar.subKeys[0]);
      const targetIdx = idx === -1 ? 0 : idx;
      setDirection(targetIdx >= seqIndex ? 1 : -1);
      setSeqIndex(targetIdx);
    }
  }

  function handlePrevArrow() {
    setDirection(-1);
    setSeqIndex((i) => (i - 1 + ROTATION_SEQUENCE.length) % ROTATION_SEQUENCE.length);
    setAutoRotateStopped(true);
  }

  function handleNextArrow() {
    setDirection(1);
    setSeqIndex((i) => (i + 1) % ROTATION_SEQUENCE.length);
    setAutoRotateStopped(true);
  }

  return (
    <SectionShell id="the-trader" atmosphere="subtle" beam={false}>
      {/* Progress-bar keyframe — scoped inline since it's a one-off, not a DS token. */}
      <style>{`
        @keyframes trader-tab-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div className="text-center mb-10">
        <SectionEyebrow>The Trader</SectionEyebrow>
        <SectionTitle gradient="split" size="default" className="mb-4">
          Your trading, finally{' '}
          <span className="text-gold-primary">accountable.</span>
        </SectionTitle>
        <p className="font-sans font-light text-ink-secondary text-lg leading-relaxed max-w-2xl mx-auto">
          The full trader's desk: a journal that syncs itself, AI that finds where you bleed
          money, and a copier that executes your discipline across every account.
        </p>
      </div>

      {/* ===== TAB AREA ===== */}
      {/* Hovering anywhere in the tab area — either pill row or the panel below —
          pauses auto-rotation; leaving it resumes. */}
      <div onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
        <div>
          {/* Primary row — 4 pillar pills, always visible */}
          <div
            role="tablist"
            aria-label="The Trader — feature categories"
            className="flex flex-wrap justify-center gap-3 mb-4"
          >
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              const isActivePillar = pillar.key === activePillar.key;
              const isSinglePanel = pillar.subKeys.length === 1;
              return (
                <button
                  key={pillar.key}
                  role="tab"
                  type="button"
                  aria-selected={isActivePillar}
                  aria-controls={isSinglePanel ? `trader-tabpanel-${pillar.subKeys[0]}` : undefined}
                  id={`trader-tab-pillar-${pillar.key}`}
                  onClick={() => handlePillarClick(pillar)}
                  className={`group relative overflow-hidden inline-flex items-center gap-3 px-6 py-3.5 rounded-[14px] border transition-all duration-200 ease-out ${
                    isActivePillar
                      ? 'bg-gold-primary/[0.08] border-gold-primary/40 text-ink-primary'
                      : 'bg-section-card-rest border-gold-border text-ink-secondary hover:border-gold-primary/30 hover:text-ink-primary'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
                      isActivePillar
                        ? 'bg-gradient-to-br from-gold-primary/30 to-gold-primary/10 border border-gold-primary/40'
                        : 'bg-section-card-deep border border-gold-border group-hover:border-gold-primary/25'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isActivePillar ? 'text-gold-primary' : 'text-ink-tertiary group-hover:text-gold-primary/70'
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-sm font-semibold whitespace-nowrap">{pillar.label}</span>

                  {/* Progress affordance lives on the primary pill only for single-panel
                      pillars (Copier / Risk) — multi-sub pillars carry it on the sub-pill. */}
                  {isActivePillar && isSinglePanel && !autoRotateStopped && (
                    <span
                      key={activeTabKey}
                      className="absolute left-0 bottom-0 h-[2px] bg-gold-primary rounded-full"
                      style={{
                        animation: `trader-tab-progress ${AUTOROTATE_MS}ms linear forwards`,
                        animationPlayState: isPaused ? 'paused' : 'running',
                      }}
                      aria-hidden="true"
                    />
                  )}
                  {isActivePillar && isSinglePanel && autoRotateStopped && (
                    <span
                      className="absolute left-0 bottom-0 h-[2px] w-full bg-gold-primary rounded-full"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary row — carousel-dots indicator, only when the active pillar
              has more than one sub-tab. Active = elongated gold dash (fills while
              auto-rotating), inactive = small dim dots. */}
          {hasSubRow && (
            <div
              role="tablist"
              aria-label={`${activePillar.label} — features`}
              className="flex items-center justify-center gap-1.5 mb-6"
            >
              {activePillar.subKeys.map((key) => {
                const tab = tabs.find((t) => t.key === key)!;
                const isActive = tab.key === activeTabKey;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    aria-controls={`trader-tabpanel-${tab.key}`}
                    id={`trader-tab-${tab.key}`}
                    aria-label={tab.label}
                    title={tab.label}
                    onClick={() => handleTabClick(tab.key)}
                    className="group relative flex items-center justify-center p-2.5"
                  >
                    <span
                      className={`relative block rounded-full overflow-hidden transition-all duration-base ease-out ${
                        isActive ? 'w-7 h-1.5 bg-gold-primary/20' : 'w-1.5 h-1.5 bg-white/20 group-hover:bg-white/40'
                      }`}
                    >
                      {/* Progress-in-dash — animated fill while auto-rotating, static full gold once stopped. */}
                      {isActive && !autoRotateStopped && (
                        <span
                          key={activeTabKey}
                          className="absolute inset-y-0 left-0 bg-gradient-gold rounded-full"
                          style={{
                            animation: `trader-tab-progress ${AUTOROTATE_MS}ms linear forwards`,
                            animationPlayState: isPaused ? 'paused' : 'running',
                          }}
                          aria-hidden="true"
                        />
                      )}
                      {isActive && autoRotateStopped && (
                        <span className="absolute inset-0 bg-gradient-gold rounded-full" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tab panel — wrapped in a relative container so the prev/next
            arrows can sit vertically centered on either side. */}
        <div className="relative">
          <button
            type="button"
            onClick={handlePrevArrow}
            aria-label="Previous feature"
            className="absolute -left-3 md:-left-14 xl:-left-16 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-full border border-border-ds-subtle bg-surface-1 text-ink-secondary transition-colors hover:border-gold-primary/40 hover:text-gold-primary"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleNextArrow}
            aria-label="Next feature"
            className="absolute -right-3 md:-right-14 xl:-right-16 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-full border border-border-ds-subtle bg-surface-1 text-ink-secondary transition-colors hover:border-gold-primary/40 hover:text-gold-primary"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="grid min-h-[380px] lg:min-h-[440px] items-center">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={activeTab.key}
                id={`trader-tabpanel-${activeTab.key}`}
                role="tabpanel"
                aria-labelledby={hasSubRow ? `trader-tab-${activeTab.key}` : `trader-tab-pillar-${activePillar.key}`}
                custom={direction}
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="[grid-area:1/1]"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-10 lg:gap-14 items-center">
                  <PanelCopy tab={activeTab} />
                  <ProductShot
                    src={activeTab.image.src}
                    alt={activeTab.image.alt}
                    glow={activeTab.image.glow}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ===== FINAL CTA ===== */}
      <div className="text-center mt-6">
        <Link to="/register">
          <Button variant="gold" size="xl">
            Start free — 14 days of full access, no card
          </Button>
        </Link>
      </div>
    </SectionShell>
  );
};

export default TraderSection;
