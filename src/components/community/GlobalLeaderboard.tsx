// src/components/community/GlobalLeaderboard.tsx
// =====================================================
// The Floor Competition — home tab (merged into Global
// community's Leaderboard tab).
//
// Three period tabs:
//   This Month → active monthly competition with
//                countdown / register / live state block
//                above the FloorLeaderboardTable.
//   This Year  → cumulative 'this_year' leaderboard.
//   All Time   → cumulative 'all_time' leaderboard.
//
// Styling: gold-on-black (#C9A646/#E8C766 on #0A0A0A/#141414)
// matching the existing Floor page aesthetic.
// =====================================================

import { memo, useState } from 'react';
import { Lock, Trophy, ShieldCheck, AlertCircle, TrendingUp, BarChart2, Zap, Award, Star, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataState } from '@/components/ds/DataState';
import { useAuth } from '@/providers/AuthProvider';
import {
  useActiveCompetition,
  useFloorLeaderboard,
  useMyFloorParticipation,
  useJoinFloor,
  useLeaveFloor,
} from '@/hooks/useFloor';
import { FloorLeaderboardTable } from '@/components/floor/FloorLeaderboardTable';
import { FloorPodium } from '@/components/floor/FloorPodium';
import { FloorCountdown } from '@/components/floor/FloorCountdown';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

type PeriodTab = 'monthly' | 'this_year' | 'all_time';

// ── Configs ────────────────────────────────────────────────────────────────────

const PERIOD_TABS: { label: string; value: PeriodTab }[] = [
  { label: 'This Month', value: 'monthly' },
  { label: 'This Year', value: 'this_year' },
  { label: 'All Time', value: 'all_time' },
];

// Default min_trades when no active competition is available
const DEFAULT_MIN_TRADES = 20;

// ── Date formatting ────────────────────────────────────────────────────────────

/** Formats an ISO date string in user's locale, appending "ET" timezone hint. */
function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/New_York',
      }) + ' ET'
    );
  } catch {
    return iso;
  }
}

// ── Competition state derivation ───────────────────────────────────────────────

type CompetitionPhase = 'countdown' | 'registration' | 'live' | 'ended';

function getPhase(
  registrationOpensAt: string | null,
  periodStart: string,
  periodEnd: string,
): CompetitionPhase {
  const now = Date.now();
  const start = new Date(periodStart).getTime();
  const end = new Date(periodEnd).getTime();

  if (now >= end) return 'ended';
  if (now >= start) return 'live';

  if (registrationOpensAt) {
    const regOpen = new Date(registrationOpensAt).getTime();
    if (now < regOpen) return 'countdown';
    return 'registration';
  }

  // No registration window — treat as always open until period_start
  return 'registration';
}

// ── Join confirmation dialog ───────────────────────────────────────────────────

interface JoinDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  competitionTitle: string;
  periodStart: string;
  onConfirm: () => void;
  isPending: boolean;
  error: Error | null;
}

const JoinDialog = memo(function JoinDialog({
  open,
  onOpenChange,
  competitionTitle,
  periodStart,
  onConfirm,
  isPending,
  error,
}: JoinDialogProps) {
  const isBrokerError =
    error?.message?.toLowerCase().includes('broker') ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: '#0A0A0A',
          border: '1px solid rgba(201,166,70,0.25)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold">
            Register for {competitionTitle}?
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
          By registering, your verified results become public on the leaderboard.
          Your entry is locked once the competition starts on{' '}
          <span className="text-white font-medium">{formatDate(periodStart)}</span> —
          you can&apos;t opt out mid-competition. Only your real broker-verified
          trades count.
        </p>

        {error && (
          <div>
            {isBrokerError ? (
              <p
                className="text-[12px] rounded-lg px-3 py-2"
                style={{
                  background: 'rgba(201,166,70,0.08)',
                  color: '#C9A646',
                  border: '1px solid rgba(201,166,70,0.2)',
                }}
              >
                Connect a broker first to compete.{' '}
                <Link
                  to="/app/journal/settings"
                  onClick={() => onOpenChange(false)}
                  className="underline underline-offset-2 font-medium hover:opacity-80"
                >
                  Go to Settings
                </Link>
              </p>
            ) : (
              <p
                className="text-[12px] rounded-lg px-3 py-2"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                {error.message}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-2">
          <button
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-[10px] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
            style={{ color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-[10px] px-4 py-2 text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #E8C766 100%)',
              color: '#0A0A0A',
            }}
          >
            {isPending ? 'Registering…' : 'Register & lock in'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
JoinDialog.displayName = 'JoinDialog';

// ── Competition status block (This Month tab only) ─────────────────────────────

interface CompStatusProps {
  competitionId: string;
  title: string;
  registrationOpensAt: string | null;
  periodStart: string;
  periodEnd: string;
}

const CompStatusBlock = memo(function CompStatusBlock({
  competitionId,
  title,
  registrationOpensAt,
  periodStart,
  periodEnd,
}: CompStatusProps) {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  const { data: participation, isLoading: partLoading } =
    useMyFloorParticipation(competitionId);
  const {
    mutate: joinFloor,
    isPending: joining,
    error: joinError,
    reset: resetJoin,
  } = useJoinFloor();
  const {
    mutate: leaveFloor,
    isPending: leaving,
    error: leaveError,
    reset: resetLeave,
  } = useLeaveFloor();

  const phase = getPhase(registrationOpensAt, periodStart, periodEnd);
  const isRegistered = !!participation;

  const handleJoinConfirm = () => {
    resetJoin();
    joinFloor(
      { competitionId },
      { onSuccess: () => setJoinDialogOpen(false) },
    );
  };

  const handleLeave = () => {
    resetLeave();
    leaveFloor({ competitionId });
  };

  // ── COUNTDOWN ──────────────────────────────────────
  if (phase === 'countdown' && registrationOpensAt) {
    return (
      <div
        className="rounded-[20px] px-6 py-5 flex flex-col gap-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(18,14,6,1) 0%, rgba(12,10,4,1) 100%)',
          border: '1px solid rgba(201,166,70,0.28)',
          boxShadow: '0 0 32px rgba(201,166,70,0.06), inset 0 1px 0 rgba(201,166,70,0.12)',
        }}
      >
        {/* Subtle top glow line */}
        <div
          className="absolute top-0 left-6 right-6 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(201,166,70,0.4), transparent)' }}
        />

        {/* Header row */}
        <div className="flex items-center gap-[10px]">
          <div
            className="flex items-center justify-center h-7 w-7 rounded-[8px] shrink-0"
            style={{ background: 'rgba(201,166,70,0.12)', border: '1px solid rgba(201,166,70,0.25)' }}
          >
            <Trophy className="h-[14px] w-[14px]" style={{ color: '#C9A646' }} />
          </div>
          <span
            className="text-[15px] font-semibold tracking-[0.01em]"
            style={{ color: '#E8C766' }}
          >
            {title}
          </span>
        </div>

        {/* Countdown tiles */}
        <FloorCountdown target={registrationOpensAt} />

        {/* Subtext */}
        <p
          className="text-[11px] tracking-[0.02em]"
          style={{ color: 'rgba(201,166,70,0.45)' }}
        >
          Registration opens {formatDate(registrationOpensAt)}{' '}
          <span style={{ color: 'rgba(201,166,70,0.25)' }}>·</span>{' '}
          competition starts {formatDate(periodStart)}
        </p>
      </div>
    );
  }

  // ── REGISTRATION ───────────────────────────────────
  if (phase === 'registration') {
    if (partLoading) {
      return (
        <div
          className="h-[88px] rounded-[16px] animate-pulse"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}
        />
      );
    }

    if (isRegistered) {
      return (
        <div
          className="rounded-[16px] p-5 flex items-center gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.03) 100%)',
            border: '1px solid rgba(201,166,70,0.25)',
          }}
        >
          <div
            className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              background: 'rgba(201,166,70,0.15)',
              border: '1px solid rgba(201,166,70,0.3)',
            }}
          >
            <Lock className="h-5 w-5" style={{ color: '#E8C766' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#E8C766' }}>
              You&apos;re registered for {title}
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: '#666' }}>
              Competition starts {formatDate(periodStart)}.
            </p>
          </div>
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="flex-shrink-0 rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all hover:opacity-80 disabled:opacity-50"
            style={{
              color: '#888',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {leaving ? 'Leaving…' : 'Leave'}
          </button>
        </div>
      );
    }

    // Not yet registered — CTA
    return (
      <>
        <div
          className="rounded-[16px] p-5"
          style={{
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                background: 'rgba(201,166,70,0.1)',
                border: '1px solid rgba(201,166,70,0.25)',
              }}
            >
              <Trophy className="h-5 w-5" style={{ color: '#C9A646' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">
                Register for the competition
              </h3>
              <p className="mt-1 text-[12px]" style={{ color: '#888' }}>
                Only your real broker-verified trades count.
              </p>
            </div>
            <button
              onClick={() => { resetJoin(); setJoinDialogOpen(true); }}
              className="flex-shrink-0 rounded-[10px] px-4 py-2 text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #E8C766 100%)',
                color: '#0A0A0A',
              }}
            >
              Register
            </button>
          </div>

          {/* Non-broker inline error */}
          {joinError && !joinError.message.toLowerCase().includes('broker') && (
            <p
              className="mt-3 text-[12px] rounded-lg px-3 py-2"
              style={{
                background: 'rgba(239,68,68,0.1)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              {joinError.message}
            </p>
          )}

          {/* Leave error */}
          {leaveError && (
            <p
              className="mt-3 text-[12px] rounded-lg px-3 py-2 flex items-center gap-2"
              style={{
                background: 'rgba(239,68,68,0.1)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {leaveError.message}
            </p>
          )}
        </div>

        <JoinDialog
          open={joinDialogOpen}
          onOpenChange={setJoinDialogOpen}
          competitionTitle={title}
          periodStart={periodStart}
          onConfirm={handleJoinConfirm}
          isPending={joining}
          error={joinError}
        />
      </>
    );
  }

  // ── LIVE ───────────────────────────────────────────
  if (phase === 'live') {
    if (partLoading) {
      return (
        <div
          className="h-[72px] rounded-[16px] animate-pulse"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}
        />
      );
    }

    if (isRegistered) {
      return (
        <div
          className="rounded-[16px] px-5 py-4 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.03) 100%)',
            border: '1px solid rgba(201,166,70,0.25)',
          }}
        >
          <Lock className="h-4 w-4 shrink-0" style={{ color: '#E8C766' }} />
          <p className="text-sm font-medium" style={{ color: '#E8C766' }}>
            You&apos;re competing · locked until {formatDate(periodEnd)}
          </p>
        </div>
      );
    }

    // Not registered — competition already started
    return (
      <div
        className="rounded-[16px] px-5 py-4 flex items-center gap-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: '#555' }} />
        <p className="text-[12px]" style={{ color: '#666' }}>
          Registration for this competition has closed. Next one opens soon.
        </p>
      </div>
    );
  }

  // ── ENDED ──────────────────────────────────────────
  return null;
});
CompStatusBlock.displayName = 'CompStatusBlock';

// ── Competition rules block ────────────────────────────────────────────────────

interface CompRulesBlockProps {
  minTrades: number;
}

const SCORING_METRICS = [
  { abbr: 'RR', label: 'Risk / Reward', icon: TrendingUp },
  { abbr: 'WR', label: 'Win Rate', icon: BarChart2 },
  { abbr: 'EV', label: 'Expectancy', icon: Zap },
];

const PRIZES = [
  {
    tag: 'GRAND PRIZE',
    title: 'Full Premium Access',
    subtitle: 'Free for an entire year — no strings attached',
    detail: 'Unlimited AI features, full journal, all analytics',
    icon: Trophy,
    gold: true,
  },
  { tag: 'FAME', title: 'Hall of Fame', subtitle: null, detail: null, icon: Star, gold: false },
  { tag: 'AWARD', title: 'Official Certificate', subtitle: null, detail: null, icon: BadgeCheck, gold: false },
  { tag: 'SPOTLIGHT', title: 'Featured on Profile', subtitle: null, detail: null, icon: Award, gold: false },
];

const CompRulesBlock = memo(function CompRulesBlock({ minTrades }: CompRulesBlockProps) {
  const ENTRY_RULES = [
    {
      n: '01',
      title: `Minimum ${minTrades} trades`,
      sub: 'Logged and verified in your FINOTAUR Journal',
    },
    {
      n: '02',
      title: 'Active on 15+ of 30 days',
      sub: 'Consistency is the whole point',
    },
    {
      n: '03',
      title: 'Real broker-verified trades only',
      sub: 'Connect a broker to qualify',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* ── Entry requirements ── */}
      <div>
        <p
          className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-3"
          style={{ color: 'rgba(201,166,70,0.5)' }}
        >
          Entry Requirements
        </p>
        <div className="flex flex-col gap-[6px]">
          {ENTRY_RULES.map((r) => (
            <div
              key={r.n}
              className="flex items-start gap-3 rounded-[10px] px-4 py-3"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '0.5px solid rgba(255,255,255,0.07)',
              }}
            >
              <span
                className="text-[13px] font-bold tabular-nums mt-px shrink-0"
                style={{ color: 'rgba(201,166,70,0.45)' }}
              >
                {r.n}
              </span>
              <div className="flex flex-col gap-[2px] min-w-0">
                <span className="text-[13px] font-semibold text-white leading-snug">{r.title}</span>
                <span className="text-[11px] leading-snug" style={{ color: '#666' }}>{r.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scored by ── */}
      <div>
        <p
          className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-3"
          style={{ color: 'rgba(201,166,70,0.5)' }}
        >
          Scored By
        </p>
        <div className="grid grid-cols-3 gap-[6px]">
          {SCORING_METRICS.map(({ abbr, label, icon: Icon }) => (
            <div
              key={abbr}
              className="flex flex-col items-center justify-center gap-1 rounded-[10px] py-4"
              style={{
                background: 'rgba(201,166,70,0.04)',
                border: '0.5px solid rgba(201,166,70,0.18)',
              }}
            >
              <Icon className="h-3.5 w-3.5 mb-0.5" style={{ color: 'rgba(201,166,70,0.5)' }} />
              <span
                className="text-[22px] font-black tracking-tight leading-none"
                style={{ color: '#C9A646' }}
              >
                {abbr}
              </span>
              <span
                className="text-[9px] font-semibold tracking-[0.1em] uppercase"
                style={{ color: 'rgba(201,166,70,0.45)' }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top 5 winners ── */}
      <div>
        <p
          className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-3"
          style={{ color: 'rgba(201,166,70,0.5)' }}
        >
          Top 5 Winners Receive
        </p>
        <div className="flex flex-col gap-[6px]">
          {PRIZES.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.tag}
                className="flex items-start gap-3 rounded-[10px] px-4 py-3"
                style={{
                  background: p.gold
                    ? 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.04) 100%)'
                    : 'rgba(255,255,255,0.025)',
                  border: p.gold
                    ? '0.5px solid rgba(201,166,70,0.3)'
                    : '0.5px solid rgba(255,255,255,0.07)',
                }}
              >
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]"
                  style={{
                    background: p.gold ? 'rgba(201,166,70,0.15)' : 'rgba(255,255,255,0.05)',
                    border: p.gold ? '1px solid rgba(201,166,70,0.25)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Icon
                    className="h-3.5 w-3.5"
                    style={{ color: p.gold ? '#E8C766' : '#555' }}
                  />
                </div>
                <div className="flex flex-col gap-[2px] min-w-0">
                  <span
                    className="text-[9px] font-semibold tracking-[0.1em] uppercase"
                    style={{ color: p.gold ? 'rgba(201,166,70,0.6)' : 'rgba(255,255,255,0.3)' }}
                  >
                    {p.tag}
                  </span>
                  <span
                    className="text-[13px] font-bold leading-snug"
                    style={{ color: p.gold ? '#fff' : '#aaa' }}
                  >
                    {p.title}
                  </span>
                  {p.subtitle && (
                    <span
                      className="text-[11px] font-medium leading-snug"
                      style={{ color: '#C9A646' }}
                    >
                      {p.subtitle}
                    </span>
                  )}
                  {p.detail && (
                    <span className="text-[11px] leading-snug" style={{ color: '#666' }}>
                      {p.detail}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
CompRulesBlock.displayName = 'CompRulesBlock';

// ── Skeleton ───────────────────────────────────────────────────────────────────

function FloorSkeleton() {
  return (
    <div className="space-y-3 animate-pulse px-ds-5 py-ds-4">
      <div className="h-[88px] rounded-[16px]" style={{ background: '#141414' }} />
      <div className="h-[320px] rounded-[20px]" style={{ background: '#0A0A0A' }} />
    </div>
  );
}

// ── Period tab pill strip ──────────────────────────────────────────────────────

interface PeriodStripProps {
  value: PeriodTab;
  onChange: (v: PeriodTab) => void;
}

function PeriodStrip({ value, onChange }: PeriodStripProps) {
  return (
    <div
      className="flex items-center rounded-[8px] bg-surface-2 p-[3px] gap-[2px]"
      role="group"
      aria-label="Leaderboard period"
    >
      {PERIOD_TABS.map(({ label, value: v }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'px-ds-3 py-[5px] rounded-[6px]',
            'font-sans text-[12px] font-medium',
            'transition-colors duration-base ease-out',
            value === v
              ? 'bg-surface-1 text-ink-primary shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)]'
              : 'text-ink-tertiary hover:text-ink-secondary',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function GlobalLeaderboard() {
  const [period, setPeriod] = useState<PeriodTab>('monthly');
  const { user } = useAuth();

  const { data: competition, isLoading: competitionLoading } =
    useActiveCompetition();

  const competitionId = competition?.id;
  const minTrades = competition?.min_trades ?? DEFAULT_MIN_TRADES;

  const leaderboardScope =
    period === 'monthly' ? 'monthly' : period;

  const {
    data: rows,
    isLoading: leaderboardLoading,
    isError,
    error,
    refetch,
  } = useFloorLeaderboard(leaderboardScope, competitionId);

  const isLoading =
    (period === 'monthly' && competitionLoading) || leaderboardLoading;

  if (isLoading) return <FloorSkeleton />;

  return (
    <div className="flex flex-col gap-ds-4 px-ds-5 py-ds-5">
      {/* Competition status block — only on This Month tab */}
      {period === 'monthly' && competition && (
        <CompStatusBlock
          competitionId={competition.id}
          title={competition.title}
          registrationOpensAt={competition.registration_opens_at}
          periodStart={competition.period_start}
          periodEnd={competition.period_end}
        />
      )}

      {/* Competition rules — show on This Month tab when competition exists */}
      {period === 'monthly' && competition && (
        <CompRulesBlock minTrades={minTrades} />
      )}

      {/* No active competition notice (This Month, nothing returned) */}
      {period === 'monthly' && !competitionLoading && !competition && (
        <div
          className="rounded-[16px] px-5 py-4 flex items-center gap-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <Trophy className="h-4 w-4 shrink-0" style={{ color: '#555' }} />
          <p className="text-[12px]" style={{ color: '#666' }}>
            No active competition right now. Check back soon.
          </p>
        </div>
      )}

      {/* Period strip — centered */}
      <div className="flex justify-center">
        <PeriodStrip value={period} onChange={setPeriod} />
      </div>

      {/* Podium — top 3 qualified rows */}
      {rows && rows.length > 0 && <FloorPodium rows={rows} />}

      {/* Full ranking table */}
      <DataState
        isLoading={false}
        isError={isError}
        error={error}
        data={rows}
        onRetry={refetch}
        empty={
          <p className="py-ds-9 text-center font-sans text-[13px] text-ink-tertiary">
            No competitors on the leaderboard yet.
          </p>
        }
      >
        {(data) => (
          <FloorLeaderboardTable
            rows={data}
            currentUserId={user?.id ?? null}
            minTrades={minTrades}
          />
        )}
      </DataState>
    </div>
  );
}
