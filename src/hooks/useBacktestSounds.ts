import { useEffect, useRef } from "react";

export interface BacktestSoundOptions {
  enabled: boolean;
  volume: number; // 0-1
}

const DEFAULT_OPTIONS: BacktestSoundOptions = {
  enabled: true,
  volume: 0.3,
};

export function useBacktestSounds(options: BacktestSoundOptions = DEFAULT_OPTIONS) {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (options.enabled && typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [options.enabled]);

  // Candle tick sound - subtle and elegant
  const playCandleTick = () => {
    if (!options.enabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800; // High-pitched, subtle
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(options.volume * 0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  };

  // Buy execution sound - green/positive
  const playBuySound = () => {
    if (!options.enabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 600;
    oscillator.type = "triangle";

    gainNode.gain.setValueAtTime(options.volume * 0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);

    // Add harmonics
    const oscillator2 = ctx.createOscillator();
    const gainNode2 = ctx.createGain();
    oscillator2.connect(gainNode2);
    gainNode2.connect(ctx.destination);
    oscillator2.frequency.value = 900;
    oscillator2.type = "sine";
    gainNode2.gain.setValueAtTime(options.volume * 0.1, ctx.currentTime);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    oscillator2.start(ctx.currentTime + 0.05);
    oscillator2.stop(ctx.currentTime + 0.15);
  };

  // Sell execution sound - red/negative
  const playSellSound = () => {
    if (!options.enabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 400;
    oscillator.type = "triangle";

    gainNode.gain.setValueAtTime(options.volume * 0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);

    // Add harmonics
    const oscillator2 = ctx.createOscillator();
    const gainNode2 = ctx.createGain();
    oscillator2.connect(gainNode2);
    gainNode2.connect(ctx.destination);
    oscillator2.frequency.value = 300;
    oscillator2.type = "sine";
    gainNode2.gain.setValueAtTime(options.volume * 0.1, ctx.currentTime);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    oscillator2.start(ctx.currentTime + 0.05);
    oscillator2.stop(ctx.currentTime + 0.15);
  };

  // Take Profit hit sound - celebratory
  const playTPSound = () => {
    if (!options.enabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    
    // Multi-tone success sound
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = "sine";

      const startTime = ctx.currentTime + (i * 0.08);
      gainNode.gain.setValueAtTime(options.volume * 0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    });
  };

  // Stop Loss hit sound - warning
  const playSLSound = () => {
    if (!options.enabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 200;
    oscillator.type = "sawtooth";

    gainNode.gain.setValueAtTime(options.volume * 0.25, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  };

  return {
    playCandleTick,
    playBuySound,
    playSellSound,
    playTPSound,
    playSLSound,
  };
}