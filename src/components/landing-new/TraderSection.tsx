// src/components/landing-new/TraderSection.tsx
// ================================================
// 🔥 THE TRADER — unified journal + AI + copier showcase
// Replaces ProductShowcase as the flagship "journal" zone on the landing page.
// Real product screenshots throughout — no illustrations, no mockups.
// Two flagship moments (Leak Detector AI, Trade Copier) get the AISection-style
// gold-lit card treatment; everything else uses the shared two-column idiom.
// ================================================

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ds/Button';
import { SectionShell } from './_shared/SectionShell';
import { SectionEyebrow } from './_shared/SectionEyebrow';
import { SectionTitle } from './_shared/SectionTitle';

import journalDashboard from '@/assets/landing/journal-dashboard.webp';
import journalCalendar from '@/assets/landing/journal-calendar.webp';
import leakDetector from '@/assets/landing/leak-detector.webp';
import revengeRadar from '@/assets/landing/revenge-radar.webp';
import shadowShot from '@/assets/landing/shadow.webp';
import strategiesShot from '@/assets/landing/strategies.webp';
import dayOfWeekShot from '@/assets/landing/day-of-week.webp';
import copierShot from '@/assets/landing/copier.webp';
import riskManagementShot from '@/assets/landing/risk-management.webp';

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/** Small gold "chip" label — matches AISection's FLAGSHIP tag idiom. */
function EyebrowChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 font-sans text-[9px] font-semibold uppercase tracking-[0.35em] px-3 py-1.5 rounded-sm mb-4"
      style={{
        color: '#FFE6A0',
        border: '1px solid rgba(255,230,160,0.3)',
        background:
          'linear-gradient(90deg, rgba(255,220,140,0.12) 0%, rgba(201,166,70,0.06) 100%)',
      }}
    >
      <span
        className="w-1 h-1 rounded-full"
        style={{ background: 'rgba(255,220,140,1)', boxShadow: '0 0 8px rgba(255,220,140,0.8)' }}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

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
        className="relative block w-full max-w-full h-auto rounded-[12px] border border-border-ds-subtle"
      />
    </div>
  );
}

/** Gold-lit flagship card frame — same "top light bar" treatment as AISection's AI Engine card. */
function FlagshipFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-6 md:p-10"
      style={{
        background:
          'linear-gradient(135deg, rgba(20,20,20,0.85) 0%, rgba(12,12,12,0.7) 100%) padding-box, linear-gradient(135deg, rgba(230,195,100,0.4) 0%, rgba(201,166,70,0.15) 50%, rgba(230,195,100,0.3) 100%) border-box',
        border: '1.5px solid transparent',
        boxShadow:
          '0 40px 100px rgba(0,0,0,0.65), 0 0 60px rgba(201,166,70,0.15), inset 0 1px 0 rgba(255,230,160,0.1)',
      }}
    >
      {/* Top-edge gold light bar */}
      <span
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          top: '-1px',
          width: '70%',
          height: '2px',
          borderRadius: '2px',
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,220,140,0.3) 20%, rgba(255,230,160,0.9) 50%, rgba(255,220,140,0.3) 80%, transparent 100%)',
          filter: 'blur(0.5px)',
        }}
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
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

/** Small supporting card for the 2x2 grid — screenshot + one-line caption. */
function MiniCard({
  src,
  alt,
  caption,
  delay = 0,
}: {
  src: string;
  alt: string;
  caption: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="rounded-[12px] bg-surface-1 p-ds-4"
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="w-full max-w-full h-auto rounded-[12px] border border-border-ds-subtle mb-ds-3"
      />
      <p className="text-sm text-ink-secondary font-sans">{caption}</p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// TraderSection
// ---------------------------------------------------------------------------
const TraderSection = () => {
  return (
    <SectionShell id="the-trader" atmosphere="subtle" beam={false}>
      {/* ===== HEADER ===== */}
      <div className="text-center mb-16">
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

      {/* ===== BLOCK 1 — flagship: journal dashboard (image left / copy right) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center mb-24 md:mb-32"
      >
        <ProductShot
          src={journalDashboard}
          alt="Finotaur journal dashboard showing net P&L of +$26,594, 49.6% win rate, 1.73 profit factor, a FINO Score of 78.19, and the full equity curve"
          glow
        />
        <div>
          <h3 className="font-wordmark font-medium text-2xl lg:text-3xl text-ink-primary leading-tight mb-3">
            Every trade. Auto-synced. Scored.
          </h3>
          <BulletList
            items={[
              'Connects to your broker — no manual entry',
              'FINO Score grades your consistency, drawdown and expectancy',
              'Equity curve and daily P&L at institutional depth',
            ]}
          />
        </div>
      </motion.div>

      {/* ===== BLOCK 2 — calendar (copy left / image right) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center mb-24 md:mb-32"
      >
        <div className="lg:order-1">
          <h3 className="font-wordmark font-medium text-2xl lg:text-3xl text-ink-primary leading-tight mb-3">
            Your month, at a glance.
          </h3>
          <p className="font-sans font-light text-ink-secondary text-base leading-relaxed">
            Green days aren't luck. The calendar shows every session's P&L, trade count and
            weekly R — so patterns stop hiding between trades.
          </p>
        </div>
        <div className="lg:order-2">
          <ProductShot
            src={journalCalendar}
            alt="Finotaur journal calendar view showing a full month of daily P&L, trade counts and weekly summaries"
          />
        </div>
      </motion.div>

      {/* ===== BLOCK 3 — flagship: Leak Detector (AI) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="mb-24 md:mb-32"
      >
        <FlagshipFrame>
          <div className="max-w-3xl mx-auto text-center mb-8">
            <EyebrowChip>AI on your trades</EyebrowChip>
            <h3 className="font-wordmark font-medium text-2xl lg:text-3xl text-ink-primary leading-tight mb-3">
              AI that finds your most expensive habit.
            </h3>
            <p className="font-sans font-light text-ink-secondary text-base leading-relaxed">
              The Leak Detector reads every trade and names the exact pattern draining your
              account — and what following your own rule was worth.
            </p>
          </div>
          <ProductShot
            src={leakDetector}
            alt="Finotaur Leak Detector identifying the user's #1 leak — banking winners too early, costing −$102,662 — with a rule card and actual-vs-rule equity comparison"
            glow
            className="max-w-4xl mx-auto"
          />
        </FlagshipFrame>
      </motion.div>

      {/* ===== BLOCK 4 — 2x2 supporting grid ===== */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24 md:mb-32"
      >
        <MiniCard
          src={revengeRadar}
          alt="Finotaur Revenge Radar screen analyzing the cost of revenge trading"
          caption="Revenge Radar — catches tilt before it costs you"
          delay={0}
        />
        <MiniCard
          src={shadowShot}
          alt="Finotaur Shadow screen comparing cumulative P&L across trading scenarios"
          caption="Shadow — what your trades could have been"
          delay={0.08}
        />
        <MiniCard
          src={strategiesShot}
          alt="Finotaur My Strategies screen showing ICT MSS at 67% win rate and other tracked setups"
          caption="Playbooks — know which setup actually pays"
          delay={0.16}
        />
        <MiniCard
          src={dayOfWeekShot}
          alt="Finotaur By Day of Week screen showing best and worst trading days by P&L"
          caption="Breakdowns — your edge by day, hour and symbol"
          delay={0.24}
        />
      </motion.div>

      {/* ===== BLOCK 5 — flagship: Trade Copier ===== */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="mb-16"
      >
        <FlagshipFrame>
          <div className="max-w-3xl mx-auto text-center mb-8">
            <EyebrowChip>Trade copier</EyebrowChip>
            <h3 className="font-wordmark font-medium text-2xl lg:text-3xl text-ink-primary leading-tight mb-3">
              Trade one account. Mirror them all.
            </h3>
          </div>
          <ProductShot
            src={copierShot}
            alt="Finotaur Trade Copier screen showing a Master Group mirroring an Apex evaluation account and a live Tradovate account, with automation on and a kill switch"
            glow
            className="max-w-5xl mx-auto mb-8"
          />
          <div className="max-w-xl mx-auto mb-12">
            <BulletList
              items={[
                'Tradovate and NinjaTrader, connected in minutes',
                'Per-account risk locks and an instant kill switch',
                'One click flattens everything, everywhere',
              ]}
            />
          </div>

          {/* Second shot — Risk Management sub-screen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-5xl mx-auto">
            <div>
              <h4 className="font-wordmark font-medium text-xl lg:text-2xl text-ink-primary leading-tight mb-3">
                Risk that enforces itself.
              </h4>
              <p className="font-sans font-light text-ink-secondary text-base leading-relaxed">
                Loss limits per trade, per day, per week — on breach, new copies pause
                automatically. Set once, applied to every account.
              </p>
            </div>
            <ProductShot
              src={riskManagementShot}
              alt="Finotaur Copier Risk Management screen showing per-account loss limits, profit targets, an automatic pause-new-copies on breach, and a $1,500 daily loss limit override"
            />
          </div>
        </FlagshipFrame>
      </motion.div>

      {/* ===== FINAL CTA ===== */}
      <div className="text-center">
        <Link to="/register">
          <Button variant="gold" size="xl">
            Start 14-day free trial
          </Button>
        </Link>
      </div>
    </SectionShell>
  );
};

export default TraderSection;
