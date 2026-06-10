/**
 * useReplayPlayback — cursor advance engine for Replay mode.
 *
 * Phase 4 of the backtest sprint. Owns the playback cursor (an index into a
 * pre-fetched bar window) and the timer that advances it. The chart layer
 * subscribes to cursor changes and re-renders the appropriate visible bars.
 *
 * Speeds:
 *   0.5× → 1000ms per bar
 *   1×   → 500ms per bar
 *   2×   → 250ms per bar
 *   5×   → 100ms per bar
 *   10×  → 50ms per bar
 *   MAX  → 0ms (yields with setTimeout(0) so the UI stays responsive)
 *
 * The cursor is the index of the LAST visible bar. cursor = -1 → no bars
 * visible. cursor = maxIndex → fully revealed window. Advancing past
 * maxIndex auto-pauses.
 *
 * Implementation notes:
 *   - Uses setTimeout (not requestAnimationFrame) — predictable interval math
 *     and trivial to clear on pause. rAF is overkill since we only repaint
 *     one new bar per tick, not a continuous animation.
 *   - The onAdvance callback fires after each cursor increment. The chart
 *     uses it to call `series.update()` with the newly revealed bar and to
 *     check active position SL/TP against that bar.
 *   - stepBack is allowed for debugging / "I want to retry that decision"
 *     but does NOT replay onAdvance — the caller is responsible for
 *     reconstructing state if it cares (Phase 4 MVP does not).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** How many bars to advance per requestAnimationFrame tick at MAX speed. */
const MAX_BARS_PER_FRAME = 10;

/** Predefined replay speeds. MAX = Infinity → no delay between bars. */
export const REPLAY_SPEEDS = [0.5, 1, 2, 5, 10, Infinity] as const;
export type ReplaySpeed = typeof REPLAY_SPEEDS[number];

/** Base bar interval at 1× speed (ms between bar reveals). */
const BASE_INTERVAL_MS = 500;

export interface UseReplayPlaybackOptions {
  /** Highest valid cursor index (= bars.length - 1). cursor cannot exceed this. */
  maxIndex: number;
  /** Initial cursor position. Defaults to -1 (nothing visible). */
  initialCursor?: number;
  /** Fires after each cursor advance with the new cursor value. */
  onAdvance?: (newCursor: number) => void;
}

export interface UseReplayPlaybackReturn {
  cursor: number;
  isPlaying: boolean;
  speed: ReplaySpeed;
  play: () => void;
  pause: () => void;
  step: () => void;
  stepBack: () => void;
  reset: () => void;
  setSpeed: (s: ReplaySpeed) => void;
  /** Jump cursor directly (e.g. scrub bar — Phase 4.5 if added). */
  setCursor: (c: number) => void;
}

export function useReplayPlayback({
  maxIndex,
  initialCursor = -1,
  onAdvance,
}: UseReplayPlaybackOptions): UseReplayPlaybackReturn {
  const [cursor, setCursorState] = useState<number>(initialCursor);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);

  // Refs so the timer loop reads fresh values without re-creating itself.
  const cursorRef = useRef(cursor);
  const speedRef = useRef(speed);
  const maxIndexRef = useRef(maxIndex);
  const onAdvanceRef = useRef(onAdvance);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => { cursorRef.current = cursor; }, [cursor]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { maxIndexRef.current = maxIndex; }, [maxIndex]);
  useEffect(() => { onAdvanceRef.current = onAdvance; }, [onAdvance]);

  // Sync cursor with initialCursor whenever the caller passes a different
  // value. Use case: bars load async, so `initialCursor` flips from a
  // placeholder (e.g. 0 while loading) to the true start index (e.g. 200)
  // once the bar window is ready. useState ignores subsequent initial
  // values, so we explicitly re-seed cursor here.
  //
  // This effect re-runs only when initialCursor actually changes — user
  // actions (play/pause/step) mutate `cursor` but not `initialCursor`, so
  // we don't fight them. The caller (BacktestReplayChart) passes a stable
  // `startIndex` derived from the loaded bars; that stays put unless the
  // window itself is reloaded (date change).
  useEffect(() => {
    cursorRef.current = initialCursor;
    setCursorState(initialCursor);
  }, [initialCursor]);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const advanceOne = useCallback(() => {
    const next = cursorRef.current + 1;
    if (next > maxIndexRef.current) {
      setIsPlaying(false);
      clearTimer();
      return;
    }
    cursorRef.current = next;
    setCursorState(next);
    onAdvanceRef.current?.(next);
  }, [clearTimer]);

  // Main playback loop — re-scheduled after each tick.
  // At MAX speed (Infinity), uses requestAnimationFrame to batch up to
  // MAX_BARS_PER_FRAME advances per frame, preventing microtask queue
  // saturation on large replay windows. All other speeds use setTimeout.
  const scheduleNext = useCallback(() => {
    const s = speedRef.current;

    if (s === Infinity) {
      // rAF batch path: advance up to MAX_BARS_PER_FRAME bars per frame.
      const tick = () => {
        let advanced = 0;
        while (
          advanced < MAX_BARS_PER_FRAME &&
          cursorRef.current < maxIndexRef.current
        ) {
          advanceOne();
          advanced++;
        }
        if (cursorRef.current < maxIndexRef.current) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      const delay = BASE_INTERVAL_MS / s;
      timerRef.current = setTimeout(() => {
        advanceOne();
        // If still playing AND haven't hit the end, schedule the next tick.
        if (cursorRef.current < maxIndexRef.current && timerRef.current != null) {
          scheduleNext();
        }
      }, delay);
    }
  }, [advanceOne]);

  // Start / stop the loop in response to isPlaying flips.
  useEffect(() => {
    if (isPlaying) {
      // If already at the end when Play is pressed, do nothing.
      if (cursorRef.current >= maxIndexRef.current) {
        setIsPlaying(false);
        return;
      }
      scheduleNext();
    } else {
      clearTimer();
    }
    return () => clearTimer();
  }, [isPlaying, scheduleNext, clearTimer]);

  // Clamp / reset cursor when the window changes (e.g. user re-picks date).
  useEffect(() => {
    if (cursorRef.current > maxIndex) {
      cursorRef.current = Math.max(-1, maxIndex);
      setCursorState(cursorRef.current);
    }
  }, [maxIndex]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);

  const step = useCallback(() => {
    setIsPlaying(false);
    advanceOne();
  }, [advanceOne]);

  const stepBack = useCallback(() => {
    setIsPlaying(false);
    const next = Math.max(-1, cursorRef.current - 1);
    cursorRef.current = next;
    setCursorState(next);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    cursorRef.current = -1;
    setCursorState(-1);
  }, []);

  const setCursor = useCallback((c: number) => {
    setIsPlaying(false);
    const clamped = Math.max(-1, Math.min(maxIndexRef.current, c));
    cursorRef.current = clamped;
    setCursorState(clamped);
  }, []);

  return {
    cursor,
    isPlaying,
    speed,
    play,
    pause,
    step,
    stepBack,
    reset,
    setSpeed,
    setCursor,
  };
}
