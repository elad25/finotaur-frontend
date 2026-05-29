/**
 * ReplayControls — PLAY / PAUSE / STEP / SPEED bar for Replay mode.
 *
 * Pure presentational. All state lives in `useReplayPlayback`; this component
 * just renders buttons and forwards clicks. Sits in the BacktestReplayChart
 * toolbar above the chart.
 */

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, ChevronDown, SkipBack, Gauge, Scissors } from 'lucide-react';
import { REPLAY_SPEEDS, type ReplaySpeed } from '@/hooks/useReplayPlayback';

export interface ReplayControlsProps {
  isPlaying: boolean;
  speed: ReplaySpeed;
  cursor: number;
  maxIndex: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onSpeedChange: (s: ReplaySpeed) => void;
  /** Show the scissors (jump-tool) toggle — only relevant in replay-cursor mode. */
  showScissors?: boolean;
  /** Whether the scissors jump tool is currently armed. */
  scissorsArmed?: boolean;
  /** Toggle the scissors jump tool on/off. */
  onToggleScissors?: () => void;
}

function speedLabel(s: ReplaySpeed): string {
  if (s === Infinity) return 'MAX';
  if (s === 0.5) return '0.5×';
  return `${s}×`;
}

/** Number of bars per chevron click, derived from the current speed. */
function getStepSize(speed: ReplaySpeed): number {
  if (speed === Infinity) return 50;
  return Math.max(1, Math.round(speed));
}

export function ReplayControls({
  isPlaying,
  speed,
  cursor,
  maxIndex,
  onPlay,
  onPause,
  onStep,
  onStepBack,
  onReset,
  onSpeedChange,
  showScissors = false,
  scissorsArmed = false,
  onToggleScissors,
}: ReplayControlsProps) {
  const atEnd = cursor >= maxIndex;
  const atStart = cursor <= -1;
  const visibleBars = Math.max(0, cursor + 1);
  const totalBars = Math.max(0, maxIndex + 1);
  const pct = totalBars > 0 ? Math.round((visibleBars / totalBars) * 100) : 0;
  const stepSize = getStepSize(speed);

  // ─── Speed dropdown state ──────────────────────────────────────
  const [speedOpen, setSpeedOpen] = useState(false);
  const speedContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!speedOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!speedContainerRef.current?.contains(e.target as Node)) setSpeedOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSpeedOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [speedOpen]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-4 py-2">
      {/* RESET — back to bar -1 */}
      <button
        onClick={onReset}
        disabled={atStart}
        title="Reset to start"
        className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <SkipBack size={14} />
      </button>

      {/* STEP-BACK */}
      <button
        onClick={() => { for (let i = 0; i < stepSize; i++) onStepBack(); }}
        disabled={atStart}
        title={`${stepSize} bar${stepSize !== 1 ? 's' : ''} back`}
        className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={14} />
      </button>

      {/* PLAY / PAUSE */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={atEnd && !isPlaying}
        title={isPlaying ? 'Pause' : 'Play'}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          isPlaying
            ? 'border-rose-700 bg-rose-950 text-rose-400 hover:bg-rose-900'
            : 'border-emerald-700/40 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/60'
        }`}
      >
        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        {isPlaying ? 'PAUSE' : 'PLAY'}
      </button>

      {/* STEP forward */}
      <button
        onClick={() => { for (let i = 0; i < stepSize; i++) onStep(); }}
        disabled={atEnd}
        title={`${stepSize} bar${stepSize !== 1 ? 's' : ''} forward`}
        className="rounded-md border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={14} />
      </button>

      {/* SPEED — custom dropdown */}
      <div className="relative ml-2" ref={speedContainerRef}>
        <button
          type="button"
          onClick={() => setSpeedOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          title="Playback speed"
        >
          <Gauge size={12} className="text-zinc-500" />
          <span>{speedLabel(speed)}</span>
          <ChevronDown size={12} className="text-zinc-500" />
        </button>
        {speedOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 min-w-[80px] overflow-hidden rounded-md border border-zinc-800 bg-zinc-900 shadow-2xl">
            {REPLAY_SPEEDS.map((s) => (
              <button
                key={String(s)}
                type="button"
                onClick={() => { onSpeedChange(s as ReplaySpeed); setSpeedOpen(false); }}
                className={`block w-full px-3 py-1.5 text-left text-xs transition-colors ${
                  speed === s
                    ? 'bg-[#7AB6F4]/10 text-[#7AB6F4]'
                    : 'text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                {speedLabel(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SCISSORS — jump-tool toggle (TV-style time rewind). Armed = next chart
          click rewinds to that bar, then auto-disarms. Re-arm to rewind again. */}
      {showScissors && onToggleScissors && (
        <button
          type="button"
          onClick={onToggleScissors}
          title={scissorsArmed
            ? 'Jump tool armed — click the chart to rewind to that bar'
            : 'Activate jump tool — then click the chart to rewind'}
          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
            scissorsArmed
              ? 'border-[#7AB6F4]/50 bg-[#7AB6F4]/10 text-[#7AB6F4]'
              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          <Scissors size={12} />
          Jump
        </button>
      )}

      {/* Progress */}
      <div className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
        <span>
          Bar <span className="font-mono text-zinc-300">{Math.max(0, cursor + 1)}</span> / {totalBars}
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full bg-[#C9A646] transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono tabular-nums text-zinc-400">{pct}%</span>
      </div>
    </div>
  );
}
