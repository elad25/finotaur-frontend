// src/components/floor/FloorCountdown.tsx
// =====================================================
// Live DD:HH:MM:SS countdown to an ISO target date.
// Premium gold-on-black tile layout.
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
    { label: 'Days',  value: String(timeLeft.days) },
    { label: 'Hours', value: pad(timeLeft.hours) },
    { label: 'Min',   value: pad(timeLeft.minutes) },
    { label: 'Sec',   value: pad(timeLeft.seconds) },
  ];

  return (
    <div
      className={cn('flex items-center gap-[6px]', className)}
      aria-label={`Countdown: ${timeLeft.days} days ${pad(timeLeft.hours)} hours ${pad(timeLeft.minutes)} minutes ${pad(timeLeft.seconds)} seconds`}
    >
      {units.map(({ label, value }, i) => (
        <div key={label} className="flex items-center gap-[6px]">
          {/* Separator */}
          {i > 0 && (
            <span
              className="text-[20px] font-bold leading-none pb-[14px] select-none"
              style={{ color: 'rgba(201,166,70,0.35)' }}
              aria-hidden="true"
            >
              :
            </span>
          )}
          {/* Tile */}
          <div
            className="flex flex-col items-center justify-center w-[56px] h-[56px] rounded-[10px]"
            style={{
              background: 'rgba(201,166,70,0.07)',
              border: '1px solid rgba(201,166,70,0.18)',
            }}
          >
            <span
              className="font-sans text-[26px] font-bold tabular-nums leading-none"
              style={{
                color: '#E8C766',
                textShadow: '0 0 18px rgba(232,199,102,0.35)',
              }}
            >
              {value}
            </span>
            <span
              className="font-sans text-[8px] font-semibold uppercase tracking-[0.1em] mt-[4px]"
              style={{ color: 'rgba(201,166,70,0.5)' }}
            >
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
