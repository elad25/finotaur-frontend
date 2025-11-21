// ============================================================================
// PLAYBACK ENGINE - Candle-by-Candle Historical Replay
// ============================================================================

import type { Candle, PlaybackSpeed } from '../../types';

interface PlaybackConfig {
  candles: Candle[];
  speed: PlaybackSpeed;
  currentIndex: number;
  onTick: (candle: Candle, index: number) => void;
  onComplete?: () => void;
}

export class PlaybackEngine {
  private candles: Candle[];
  private currentIndex: number;
  private speed: PlaybackSpeed;
  private isPlaying: boolean = false;
  private intervalId: number | null = null;
  private onTick: (candle: Candle, index: number) => void;
  private onComplete?: () => void;
  
  // Frame timing for smooth 60fps UI updates
  private lastFrameTime: number = 0;
  private frameDelay: number = 1000 / 60; // 60fps = ~16.6ms
  
  constructor(config: PlaybackConfig) {
    this.candles = config.candles;
    this.currentIndex = config.currentIndex;
    this.speed = config.speed;
    this.onTick = config.onTick;
    this.onComplete = config.onComplete;
  }
  
  /**
   * Start playback
   */
  public start(): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.scheduleNextTick();
  }
  
  /**
   * Stop playback
   */
  public stop(): void {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      cancelAnimationFrame(this.intervalId);
      this.intervalId = null;
    }
  }
  
  /**
   * Set playback speed
   */
  public setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed;
  }
  
  /**
   * Jump to specific candle
   */
  public jumpTo(index: number): void {
    if (index >= 0 && index < this.candles.length) {
      this.currentIndex = index;
      this.emitTick();
    }
  }
  
  /**
   * Step forward one candle
   */
  public stepForward(): void {
    if (this.currentIndex < this.candles.length - 1) {
      this.currentIndex++;
      this.emitTick();
    }
  }
  
  /**
   * Step backward one candle
   */
  public stepBackward(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.emitTick();
    }
  }
  
  /**
   * Get current progress (0-1)
   */
  public getProgress(): number {
    return this.currentIndex / (this.candles.length - 1);
  }
  
  /**
   * Check if at end
   */
  public isAtEnd(): boolean {
    return this.currentIndex >= this.candles.length - 1;
  }
  
  /**
   * Update candles dataset
   */
  public updateCandles(candles: Candle[]): void {
    this.candles = candles;
    if (this.currentIndex >= candles.length) {
      this.currentIndex = candles.length - 1;
    }
  }
  
  /**
   * Schedule next tick using requestAnimationFrame for smooth updates
   */
  private scheduleNextTick(): void {
    if (!this.isPlaying) return;
    
    this.intervalId = requestAnimationFrame((timestamp) => {
      const elapsed = timestamp - this.lastFrameTime;
      
      // Calculate delay based on speed
      const delay = this.calculateDelay();
      
      // Only advance candle if enough time has passed
      if (elapsed >= delay) {
        this.lastFrameTime = timestamp;
        this.advanceCandle();
      }
      
      // Schedule next frame
      this.scheduleNextTick();
    });
  }
  
  /**
   * Calculate delay between candles based on speed
   */
  private calculateDelay(): number {
    switch (this.speed) {
      case 0.5:
        return 2000; // 2 seconds per candle
      case 1:
        return 1000; // 1 second per candle
      case 2:
        return 500;  // 0.5 seconds per candle
      case 5:
        return 200;  // 0.2 seconds per candle
      case 10:
        return 100;  // 0.1 seconds per candle
      case 'max':
        return 16;   // As fast as possible (~60fps)
      default:
        return 1000;
    }
  }
  
  /**
   * Advance to next candle
   */
  private advanceCandle(): void {
    if (this.currentIndex >= this.candles.length - 1) {
      this.stop();
      this.onComplete?.();
      return;
    }
    
    this.currentIndex++;
    this.emitTick();
  }
  
  /**
   * Emit current candle to listeners
   */
  private emitTick(): void {
    const candle = this.candles[this.currentIndex];
    if (candle) {
      this.onTick(candle, this.currentIndex);
    }
  }
  
  /**
   * Get remaining candles
   */
  public getRemainingCandles(): number {
    return this.candles.length - this.currentIndex - 1;
  }
  
  /**
   * Get current candle
   */
  public getCurrentCandle(): Candle | undefined {
    return this.candles[this.currentIndex];
  }
  
  /**
   * Get all candles up to current index
   */
  public getVisibleCandles(): Candle[] {
    return this.candles.slice(0, this.currentIndex + 1);
  }
  
  /**
   * Cleanup
   */
  public destroy(): void {
    this.stop();
    this.candles = [];
  }
}

// ============================================================================
// WORKER VERSION (for offloading to Web Worker)
// ============================================================================

/**
 * Web Worker implementation for heavy playback processing
 * This runs in a separate thread to avoid blocking the UI
 */
export class PlaybackWorkerEngine {
  private worker: Worker | null = null;
  private onUpdate: (data: any) => void;
  
  constructor(onUpdate: (data: any) => void) {
    this.onUpdate = onUpdate;
    this.initializeWorker();
  }
  
  private initializeWorker(): void {
    // Create worker from inline code
    const workerCode = `
      let candles = [];
      let currentIndex = 0;
      let speed = 1;
      let isPlaying = false;
      let intervalId = null;
      
      self.onmessage = (e) => {
        const { type, payload } = e.data;
        
        switch (type) {
          case 'INIT':
            candles = payload.candles;
            currentIndex = payload.currentIndex;
            speed = payload.speed;
            break;
            
          case 'START':
            if (!isPlaying) {
              isPlaying = true;
              startPlayback();
            }
            break;
            
          case 'STOP':
            isPlaying = false;
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            break;
            
          case 'SET_SPEED':
            speed = payload.speed;
            if (isPlaying) {
              if (intervalId) clearInterval(intervalId);
              startPlayback();
            }
            break;
            
          case 'JUMP_TO':
            currentIndex = payload.index;
            emitUpdate();
            break;
        }
      };
      
      function startPlayback() {
        const delay = calculateDelay(speed);
        intervalId = setInterval(() => {
          if (currentIndex >= candles.length - 1) {
            self.postMessage({ type: 'COMPLETE' });
            isPlaying = false;
            clearInterval(intervalId);
            return;
          }
          
          currentIndex++;
          emitUpdate();
        }, delay);
      }
      
      function calculateDelay(speed) {
        switch (speed) {
          case 0.5: return 2000;
          case 1: return 1000;
          case 2: return 500;
          case 5: return 200;
          case 10: return 100;
          case 'max': return 16;
          default: return 1000;
        }
      }
      
      function emitUpdate() {
        self.postMessage({
          type: 'UPDATE',
          payload: {
            candle: candles[currentIndex],
            index: currentIndex,
            progress: currentIndex / (candles.length - 1),
          }
        });
      }
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(workerUrl);
    
    this.worker.onmessage = (e) => {
      this.onUpdate(e.data);
    };
    
    this.worker.onerror = (error) => {
      console.error('Playback worker error:', error);
    };
  }
  
  public init(candles: Candle[], currentIndex: number, speed: PlaybackSpeed): void {
    this.worker?.postMessage({
      type: 'INIT',
      payload: { candles, currentIndex, speed }
    });
  }
  
  public start(): void {
    this.worker?.postMessage({ type: 'START' });
  }
  
  public stop(): void {
    this.worker?.postMessage({ type: 'STOP' });
  }
  
  public setSpeed(speed: PlaybackSpeed): void {
    this.worker?.postMessage({ type: 'SET_SPEED', payload: { speed } });
  }
  
  public jumpTo(index: number): void {
    this.worker?.postMessage({ type: 'JUMP_TO', payload: { index } });
  }
  
  public destroy(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}