// src/components/floor/FloorCountdown.tsx
// =====================================================
// Live DD:HH:MM:SS countdown to an ISO target date.
// Gold-on-black, big numerals.
// Renders nothing once the target has passed.
// =====================================================

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(targetIso: string): TimeLeft | null {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

interface FloorCountdownProps {
  /** ISO 8601 date string — timezone is baked in from the server */
  target: string;
  className?: string;
}

export function FloorCountdown({ target, className }: FloorCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
    calcTimeLeft(target),
  );

  useEffect(() => {
    // Re-calculate immediately in case of SSR mismatch
    setTimeLeft(calcTimeLeft(target));

    const id = setInterval(() => {
      const next = calcTimeLeft(target);
      setTimeLeft(next);
      if (!next) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [target]);

  if (!timeLeft) return null;

  const units: Array<{ label: string; value: string }> = [
    { label: 'Days', value: String(timeLeft.days) },
    { label: 'Hours', value: pad(timeLeft.hours) },
    { label: 'Min', value: pad(timeLeft.minutes) },
    { label: 'Sec', value: pad(timeLeft.seconds) },
  ];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-[6px]',
        className,
      )}
      aria-label={`Countdown: ${timeLeft.days} days ${pad(timeLeft.hours)} hours ${pad(timeLeft.minutes)} minutes ${pad(timeLeft.seconds)} seconds`}
    >
      {units.map(({ label, value }, i) => (
        <span key={label} className="flex items-baseline gap-[2px]">
          {/* Separator colon (not before first item) */}
          {i > 0 && (
            <span
              className="font-sans text-[18px] font-bold tabular-nums leading-none"
              style={{ color: 'rgba(201,166,70,0.5)' }}
              aria-hidden="true"
            >
              :
            </span>
          )}
          <span className="flex flex-col items-center">
            <span
              className="font-sans text-[22px] font-bold tabular-nums leading-none"
              style={{ color: '#E8C766' }}
            >
              {value}
            </span>
            <span
              className="font-sans text-[9px] font-medium uppercase tracking-[0.08em] mt-[2px]"
              style={{ color: 'rgba(201,166,70,0.55)' }}
            >
              {label}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
