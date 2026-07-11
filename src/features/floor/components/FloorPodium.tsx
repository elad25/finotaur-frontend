// src/components/floor/FloorPodium.tsx
// =====================================================
// Podium display for the top 3 Floor competitors.
// Champion = full-width GOLD prestige hero card (gradient border, trophy,
// gold radial tint, watermark) — Profit Factor as the hero number (quality,
// never a dollar figure).
// Runner-up + Third = 2-column grid below, silver/bronze tinted, PF-prominent.
// Gold-on-black palette (#C9A646 / #E8C766 / #0A0A0A / #141414).
// =====================================================

import { Crown } from 'lucide-react';
import { getRowRR, type FloorLeaderboardRow } from '@/features/floor/hooks/useFloor';
// Imported through Vite so they get content-hashed filenames — overwriting the
// image content later produces a NEW url, so the immutable CDN cache can never
// serve a stale version (public/ assets keep a stable url and get stuck cached).
import championshipTrophy from '@/features/floor/assets/championship-trophy.png';
import medalSilver from '@/features/floor/assets/medal-silver.png';
import medalBronze from '@/features/floor/assets/medal-bronze.png';

// ── Null-safe stat label ───────────────────────────────────────────────────────

function statLabel(value: number | null, suffix = ''): string {
  if (value === null) return '—';
  return `${value}${suffix}`;
}

// ── Champion card ──────────────────────────────────────────────────────────────

function ChampionCard({ row }: { row: FloorLeaderboardRow }) {
  const nickname = row.floor_username ?? row.display_name;
  const rr = getRowRR(row);

  return (
    // Gradient-border wrapper (padding trick): the outer div paints the
    // gold gradient border, the inner div holds the actual dark-glass card.
    <div
      className="rounded-[18px]"
      style={{
        padding: '2px',
        background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
        boxShadow: '0 12px 50px rgba(201,166,70,0.45), inset 0 2px 0 rgba(255,255,255,0.12)',
      }}
    >
      <div
        className="relative overflow-hidden rounded-[16px] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
        style={{
          background:
            'radial-gradient(ellipse at top left, rgba(201,166,70,0.18), transparent 60%), ' +
            'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.02) 100%), #0A0A0A',
        }}
      >
        {/* Oversized trophy watermark — championship presence, behind the PF number.
            Slightly smaller on mobile so it doesn't overwhelm the stacked layout. */}
        <img
          src={championshipTrophy}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute select-none w-[140px] sm:w-[200px] h-auto"
          style={{
            right: '-24px',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0.07,
            zIndex: 0,
          }}
        />

        {/* Left: trophy + identity */}
        <div className="relative flex items-center gap-4 min-w-0" style={{ zIndex: 1 }}>
          {/* Trophy with a soft golden halo radiating around it */}
          <div className="relative shrink-0 inline-flex items-center justify-center">
            <span
              aria-hidden="true"
              className="absolute pointer-events-none rounded-full"
              style={{
                width: '112px',
                height: '112px',
                background:
                  'radial-gradient(circle, rgba(201,166,70,0.50) 0%, rgba(201,166,70,0.16) 45%, transparent 70%)',
              }}
            />
            <img
              src={championshipTrophy}
              alt="Championship trophy"
              className="relative select-none h-[56px] sm:h-[72px] w-auto"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(201,166,70,0.55))',
              }}
            />
          </div>

          <div className="min-w-0">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide mb-1.5"
              style={{
                background: 'rgba(201,166,70,0.18)',
                border: '1px solid rgba(201,166,70,0.35)',
                color: '#E8C766',
              }}
            >
              <Crown className="h-[10px] w-[10px]" />
              Champion
            </span>

            <p
              className="font-black truncate leading-snug"
              style={{ fontSize: '30px', color: '#fff' }}
            >
              {nickname}
            </p>

            <p className="text-[12px] mt-0.5" style={{ color: '#888' }}>
              Ranked #1
            </p>
          </div>
        </div>

        {/* Right: Profit Factor hero number + stat row */}
        <div
          className="relative flex-shrink-0 text-left sm:text-right w-full sm:w-auto"
          style={{ zIndex: 1 }}
        >
          <p
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: '#888' }}
          >
            Profit Factor
          </p>
          <p
            className="tabular-nums font-black leading-none mt-1"
            style={{ fontSize: '44px', color: '#C9A646' }}
          >
            {row.profit_factor !== null ? row.profit_factor.toFixed(2) : '—'}
          </p>

          <p className="text-[12px] mt-2" style={{ color: '#777' }}>
            Win{' '}
            <span style={{ color: '#aaa' }}>{statLabel(row.win_rate, '%')}</span>
            {' · '}Trades{' '}
            <span style={{ color: '#aaa' }}>{row.trade_count}</span>
            {' · '}Days{' '}
            <span style={{ color: '#aaa' }}>
              {statLabel(row.active_days ?? null)}
            </span>
            {' · '}RR{' '}
            <span style={{ color: '#aaa' }}>
              {rr !== null ? `${rr.toFixed(1)}R` : '—'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Runner-up / Third card ─────────────────────────────────────────────────────

type SubPodiumSlot = 'runner-up' | 'third';

function SubPodiumCard({
  row,
  slot,
}: {
  row: FloorLeaderboardRow;
  slot: SubPodiumSlot;
}) {
  const nickname = row.floor_username ?? row.display_name;
  const isRunnerUp = slot === 'runner-up';

  // Subtle metal identity — silver for runner-up, bronze for third. Clearly
  // quieter than the champion card (no gradient border, no trophy, no glow).
  const slotBorderColor = isRunnerUp ? 'rgba(203,213,225,0.5)' : 'rgba(205,127,50,0.5)';
  const medalSrc = isRunnerUp ? medalSilver : medalBronze;
  const medalAlt = isRunnerUp ? 'Silver medal' : 'Bronze medal';
  const medalGlow = isRunnerUp ? 'rgba(203,213,225,0.35)' : 'rgba(205,127,50,0.35)';

  return (
    <div
      className="rounded-[14px] p-4 flex flex-col gap-3"
      style={{
        background: '#141414',
        border: `1px solid ${slotBorderColor}`,
      }}
    >
      {/* Medal (in place of the avatar) + nickname */}
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={medalSrc}
          alt={medalAlt}
          className="shrink-0 select-none h-[46px] w-[46px] object-contain"
          style={{ filter: `drop-shadow(0 0 6px ${medalGlow})` }}
        />
        <span
          className="text-sm font-medium truncate"
          style={{ color: '#e0e0e0' }}
        >
          {nickname}
        </span>
      </div>

      {/* PF — prominent */}
      <p
        className="tabular-nums font-bold leading-none"
        style={{ fontSize: '26px', color: '#C9A646' }}
      >
        {row.profit_factor !== null ? row.profit_factor.toFixed(2) : '—'}
        <span
          className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: '#777' }}
        >
          PF
        </span>
      </p>

      {/* Condensed stats */}
      <p className="text-[12px]" style={{ color: '#666' }}>
        {statLabel(row.win_rate, '% win')}
        {' · '}
        {row.trade_count} trades
      </p>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function FloorPodium({ rows }: { rows: FloorLeaderboardRow[] }) {
  // Take up to first 3 qualified rows (caller passes sorted list)
  const qualified = rows.filter((r) => r.qualified).slice(0, 3);

  if (qualified.length === 0) return null;

  const [first, second, third] = qualified;

  return (
    <div className="flex flex-col gap-3">
      {/* Champion */}
      <ChampionCard row={first} />

      {/* Runner-up + Third */}
      {(second || third) && (
        <div className="grid grid-cols-2 gap-3">
          {second && <SubPodiumCard row={second} slot="runner-up" />}
          {third && <SubPodiumCard row={third} slot="third" />}
        </div>
      )}
    </div>
  );
}
