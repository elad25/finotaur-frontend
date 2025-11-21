// replay/ReplayEngine.ts - COMPLETE FIXED VERSION
import { CandlestickData } from 'lightweight-charts';
import { ReplayState, ReplaySpeed, ReplayMode } from '../types';
import { REPLAY_SPEEDS } from '../constants';

interface ReplayEngineConfig {
  totalCandles: number;
  cutPointIndex?: number | null; // ✅ ADDED
  callbacks?: ReplayCallbacks;
}

interface ReplayCallbacks {
  onIndexChange?: (index: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onModeChange?: (mode: ReplayMode) => void;
  onCutPointReached?: () => void; // ✅ ADDED
}

/**
 * ===================================
 * REPLAY ENGINE - COMPLETE FIXED VERSION
 * Now supports cut point logic
 * ===================================
 */
export class ReplayEngine {
  private state: ReplayState;
  private callbacks: ReplayCallbacks;
  private intervalId: NodeJS.Timeout | null = null;
  private totalCandles: number = 0;
  private cutPointIndex: number | null = null; // ✅ ADDED

  constructor(config: ReplayEngineConfig) {
    this.totalCandles = config.totalCandles;
    this.cutPointIndex = config.cutPointIndex ?? null; // ✅ ADDED
    this.callbacks = config.callbacks || {};

    this.state = {
      mode: 'live',
      startIndex: 0,
      endIndex: this.getEffectiveEndIndex(), // ✅ CHANGED
      currentIndex: null,
      isPlaying: false,
      speed: 1,
      autoScroll: true,
    };
  }

  // ===================================
  // GETTERS
  // ===================================

  getState(): ReplayState {
    return { ...this.state };
  }

  getCurrentIndex(): number | null {
    return this.state.currentIndex;
  }

  getMode(): ReplayMode {
    return this.state.mode;
  }

  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  getSpeed(): ReplaySpeed {
    return this.state.speed;
  }

  getCutPointIndex(): number | null {
    return this.cutPointIndex;
  }

  getProgress(): number {
    if (this.state.currentIndex === null) return 100;
    const total = this.state.endIndex - this.state.startIndex;
    const current = this.state.currentIndex - this.state.startIndex;
    return total > 0 ? (current / total) * 100 : 0;
  }

  // ===================================
  // SETTERS
  // ===================================

  setTotalCandles(total: number): void {
    this.totalCandles = total;
    this.updateEndIndex();

    if (this.state.currentIndex !== null && this.state.currentIndex >= total) {
      this.state.currentIndex = total - 1;
    }
  }

  // ✅ NEW: Set cut point
  setCutPoint(index: number | null): void {
    console.log(`✂️ Setting cut point: ${index}`);
    this.cutPointIndex = index;
    this.updateEndIndex();

    // If playing and current index is beyond cut point, stop
    if (
      this.state.isPlaying &&
      index !== null &&
      this.state.currentIndex !== null &&
      this.state.currentIndex >= index
    ) {
      this.pause();
      if (this.callbacks.onCutPointReached) {
        this.callbacks.onCutPointReached();
      }
    }
  }

  // ✅ NEW: Clear cut point
  clearCutPoint(): void {
    console.log('✂️ Clearing cut point');
    this.cutPointIndex = null;
    this.updateEndIndex();
  }

  setStartIndex(index: number): void {
    this.state.startIndex = Math.max(0, Math.min(index, this.state.endIndex));
  }

  setAutoScroll(enabled: boolean): void {
    this.state.autoScroll = enabled;
  }

  // ✅ NEW: Calculate effective end index (respecting cut point)
  private getEffectiveEndIndex(): number {
    if (this.cutPointIndex !== null) {
      return Math.min(this.cutPointIndex, this.totalCandles - 1);
    }
    return this.totalCandles - 1;
  }

  // ✅ NEW: Update end index when cut point or total candles change
  private updateEndIndex(): void {
    this.state.endIndex = this.getEffectiveEndIndex();
  }

  // ===================================
  // MODE CONTROL
  // ===================================

  setMode(mode: ReplayMode): void {
    if (this.state.mode === mode) return;

    const wasPlaying = this.state.isPlaying;

    if (wasPlaying) {
      this.pause();
    }

    this.state.mode = mode;

    if (mode === 'replay' && this.state.currentIndex === null) {
      this.state.currentIndex = this.state.startIndex;
      this.notifyIndexChange();
    } else if (mode === 'live') {
      this.state.currentIndex = null;
    }

    if (this.callbacks.onModeChange) {
      this.callbacks.onModeChange(mode);
    }
  }

  toggleMode(): void {
    this.setMode(this.state.mode === 'live' ? 'replay' : 'live');
  }

  // ===================================
  // PLAYBACK CONTROL
  // ===================================

  play(): void {
    if (this.state.isPlaying) return;

    if (this.state.mode === 'live') {
      this.setMode('replay');
    }

    if (this.state.currentIndex === null) {
      this.state.currentIndex = this.state.startIndex;
    }

    // ✅ FIX: If at end (or cut point), restart from beginning
    if (this.state.currentIndex >= this.state.endIndex) {
      this.state.currentIndex = this.state.startIndex;
    }

    this.state.isPlaying = true;
    this.startPlaybackLoop();

    if (this.callbacks.onPlay) {
      this.callbacks.onPlay();
    }
  }

  pause(): void {
    if (!this.state.isPlaying) return;

    this.state.isPlaying = false;
    this.stopPlaybackLoop();

    if (this.callbacks.onPause) {
      this.callbacks.onPause();
    }
  }

  toggle(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  stop(): void {
    this.pause();
    this.state.currentIndex = this.state.startIndex;
    this.notifyIndexChange();
  }

  reset(): void {
    this.pause();
    this.state.mode = 'live';
    this.state.currentIndex = null;
    this.state.startIndex = 0;
    this.updateEndIndex();

    if (this.callbacks.onModeChange) {
      this.callbacks.onModeChange('live');
    }
  }

  // ===================================
  // NAVIGATION
  // ===================================

  stepForward(): void {
    if (this.state.mode === 'live') {
      this.setMode('replay');
    }

    if (this.state.currentIndex === null) {
      this.state.currentIndex = this.state.startIndex;
    } else if (this.state.currentIndex < this.state.endIndex) {
      this.state.currentIndex++;
    }

    this.notifyIndexChange();
  }

  stepBackward(): void {
    if (this.state.mode === 'live') {
      this.setMode('replay');
    }

    if (this.state.currentIndex === null) {
      this.state.currentIndex = this.state.endIndex;
    } else if (this.state.currentIndex > this.state.startIndex) {
      this.state.currentIndex--;
    }

    this.notifyIndexChange();
  }

  jumpToIndex(index: number): void {
    if (this.state.mode === 'live') {
      this.setMode('replay');
    }

    this.state.currentIndex = Math.max(
      this.state.startIndex,
      Math.min(index, this.state.endIndex)
    );

    this.notifyIndexChange();
  }

  jumpToStart(): void {
    this.jumpToIndex(this.state.startIndex);
  }

  jumpToEnd(): void {
    this.jumpToIndex(this.state.endIndex);
  }

  jumpToPercentage(percentage: number): void {
    const total = this.state.endIndex - this.state.startIndex;
    const index = Math.floor((percentage / 100) * total) + this.state.startIndex;
    this.jumpToIndex(index);
  }

  // ===================================
  // SPEED CONTROL
  // ===================================

  setSpeed(speed: ReplaySpeed): void {
    this.state.speed = speed;

    if (this.state.isPlaying) {
      this.stopPlaybackLoop();
      this.startPlaybackLoop();
    }
  }

  speedUp(): void {
    const currentIndex = REPLAY_SPEEDS.indexOf(this.state.speed);
    if (currentIndex < REPLAY_SPEEDS.length - 1) {
      this.setSpeed(REPLAY_SPEEDS[currentIndex + 1]);
    }
  }

  speedDown(): void {
    const currentIndex = REPLAY_SPEEDS.indexOf(this.state.speed);
    if (currentIndex > 0) {
      this.setSpeed(REPLAY_SPEEDS[currentIndex - 1]);
    }
  }

  // ===================================
  // PLAYBACK LOOP
  // ===================================

  private startPlaybackLoop(): void {
    if (this.intervalId !== null) {
      this.stopPlaybackLoop();
    }

    const interval = this.calculateInterval();

    this.intervalId = setInterval(() => {
      this.tick();
    }, interval);
  }

  private stopPlaybackLoop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // ✅ FIXED: Added cut point check
  private tick(): void {
    if (!this.state.isPlaying || this.state.currentIndex === null) {
      return;
    }

    // ✅ FIX: Check if reached cut point
    if (
      this.cutPointIndex !== null &&
      this.state.currentIndex >= this.cutPointIndex
    ) {
      console.log('✂️ Reached cut point - stopping playback');
      this.pause();

      if (this.callbacks.onCutPointReached) {
        this.callbacks.onCutPointReached();
      }

      return;
    }

    // Check if reached end
    if (this.state.currentIndex >= this.state.endIndex) {
      console.log('🎬 Reached end - stopping playback');
      this.pause();

      if (this.callbacks.onEnd) {
        this.callbacks.onEnd();
      }

      return;
    }

    this.state.currentIndex++;
    this.notifyIndexChange();
  }

  private calculateInterval(): number {
    const speed = this.state.speed;

    if (speed === 10) {
      return 1; // As fast as possible
    }

    // Base interval: 200ms per candle at 1x speed
    const baseInterval = 200;
    return Math.max(1, Math.floor(baseInterval / speed));
  }

  // ===================================
  // CALLBACKS
  // ===================================

  private notifyIndexChange(): void {
    if (this.callbacks.onIndexChange && this.state.currentIndex !== null) {
      this.callbacks.onIndexChange(this.state.currentIndex);
    }
  }

  setCallbacks(callbacks: ReplayCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // ===================================
  // LIFECYCLE
  // ===================================

  destroy(): void {
    this.stopPlaybackLoop();
    this.state.isPlaying = false;
  }
}