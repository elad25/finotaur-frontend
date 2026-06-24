// src/components/floor/FloorPodium.tsx
// =====================================================
// Podium display for the top 3 Floor competitors.
// Champion = full-width gold card.
// Runner-up + Third = 2-column grid below.
// Gold-on-black palette (#C9A646 / #E8C766 / #0A0A0A / #141414).
// =====================================================

import { Crown } from 'lucide-react';
import type { FloorLeaderboardRow } from '@/hooks/useFloor';

// ── Avatar helper ──────────────────────────────────────────────────────────────

function PodiumAvatar({
  name,
  avatarUrl,
  size,
}: {
  name: string;
  avatarUrl: string | null;
  size: number;
}) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const dim = `${size}px`;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        className="rounded-full object-cover shrink-0"
        style={{
          width: dim,
          height: dim,
          border: '1.5px solid rgba(201,166,70,0.5)',
        }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 font-bold"
      aria-hidden="true"
      style={{
        width: dim,
        height: dim,
        fontSize: `${Math.round(size * 0.38)}px`,
        background: 'rgba(201,166,70,0.15)',
        border: '1.5px solid rgba(201,166,70,0.45)',
        color: '#E8C766',
      }}
    >
      {initial}
    </div>
  );
}

// ── Null-safe stat label ───────────────────────────────────────────────────────

function statLabel(value: number | null, suffix = ''): string {
  if (value === null) return '—';
  return `${value}${suffix}`;
}

// ── Champion card ──────────────────────────────────────────────────────────────

function ChampionCard({ row }: { row: FloorLeaderboardRow }) {
  const nickname = row.floor_username ?? row.display_name;

  return (
    <div
      className="rounded-[16px] p-5 flex items-center gap-5"
      style={{
        background:
          'linear-gradient(135deg, rgba(201,166,70,0.12) 0%, rgba(201,166,70,0.02) 100%)',
        border: '1px solid rgba(201,166,70,0.4)',
      }}
    >
      {/* Left: avatar */}
      <PodiumAvatar name={nickname} avatarUrl={row.avatar_url} size={52} />

      {/* Center: identity + stats */}
      <div className="flex-1 min-w-0">
        {/* Champion pill */}
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: 'rgba(201,166,70,0.18)',
              border: '1px solid rgba(201,166,70,0.35)',
              color: '#E8C766',
            }}
          >
            <Crown className="h-[10px] w-[10px]" />
            Champion
          </span>
        </div>

        {/* Nickname */}
        <p
          className="font-semibold truncate leading-snug"
          style={{ fontSize: '22px', color: '#fff' }}
        >
          {nickname}
        </p>

        {/* Sub-line */}
        <p className="text-[12px] mt-0.5" style={{ color: '#888' }}>
          Ranked #1 · {row.trade_count} trades
        </p>

        {/* Stat row */}
        <p className="text-[12px] mt-2" style={{ color: '#777' }}>
          Win{' '}
          <span style={{ color: '#aaa' }}>
            {statLabel(row.win_rate, '%')}
          </span>
          {' · '}PF{' '}
          <span style={{ color: '#aaa' }}>
            {row.profit_factor !== null
              ? row.profit_factor.toFixed(2)
              : '—'}
          </span>
          {' · '}Streak{' '}
          <span style={{ color: '#aaa' }}>
            {statLabel(row.win_streak)}
          </span>
        </p>
      </div>

      {/* Right: discipline score */}
      <div className="flex-shrink-0 text-right">
        <p
          className="text-[11px] font-medium uppercase tracking-wide"
          style={{ color: '#888' }}
        >
          Discipline Score
        </p>
        <p
          className="tabular-nums font-bold leading-none mt-1"
          style={{ fontSize: '34px', color: '#E8C766' }}
        >
          {row.discipline_score !== null
            ? row.discipline_score.toFixed(1)
            : '—'}
        </p>
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

  const slotLabel = isRunnerUp ? 'II / Runner-Up' : 'III / Third';
  const slotColor = isRunnerUp ? '#9aa0a6' : '#b87333';

  return (
    <div
      className="rounded-[14px] p-4 flex flex-col gap-3"
      style={{
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Slot label */}
      <p
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: slotColor }}
      >
        {slotLabel}
      </p>

      {/* Avatar + nickname */}
      <div className="flex items-center gap-3 min-w-0">
        <PodiumAvatar name={nickname} avatarUrl={row.avatar_url} size={38} />
        <span
          className="text-sm font-medium truncate"
          style={{ color: '#e0e0e0' }}
        >
          {nickname}
        </span>
      </div>

      {/* Condensed stats */}
      <p className="text-[12px]" style={{ color: '#666' }}>
        <span style={{ color: '#E8C766', fontWeight: 600 }}>
          {row.discipline_score !== null
            ? row.discipline_score.toFixed(1)
            : '—'}
        </span>
        {' · '}
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
