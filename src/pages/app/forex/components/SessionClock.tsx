// ============================================================
// SessionClock.tsx
// Displays the three major FX trading sessions with live
// open/closed state and an overall FX market status line.
// Sessions defined in UTC; re-renders every 60s.
// ============================================================

import { memo, useEffect, useState } from 'react';
import { useForexMarketStatus } from '@/lib/forexMarketStatus';
import { GlassCard, SectionHeader } from '@/pages/app/crypto/_shared/GlassUI';

// Session definitions in UTC hours [openHour, closeHour)
// Sydney:   22:00 – 07:00 (wraps midnight)
// Tokyo:    00:00 – 09:00
// London:   08:00 – 17:00
// New York: 13:00 – 22:00
interface FxSession {
  name: string;
  openUTC: number;  // hour (0–23)
  closeUTC: number; // hour (0–23); if closeUTC < openUTC the window wraps midnight
  flag: string;
}

const FX_SESSIONS: FxSession[] = [
  { name: 'Sydney / Tokyo', openUTC: 22, closeUTC: 9,  flag: '🇦🇺' },
  { name: 'London',         openUTC: 8,  closeUTC: 17, flag: '🇬🇧' },
  { name: 'New York',       openUTC: 13, closeUTC: 22, flag: '🇺🇸' },
];

/** True when the UTC hour falls inside [open, close). Handles midnight wrap. */
function isSessionOpen(utcHour: number, openUTC: number, closeUTC: number): boolean {
  if (closeUTC > openUTC) {
    // Normal window: e.g. London 08–17
    return utcHour >= openUTC && utcHour < closeUTC;
  }
  // Wraps midnight: e.g. Sydney 22–09
  return utcHour >= openUTC || utcHour < closeUTC;
}

function formatUtcRange(open: number, close: number): string {
  const pad = (h: number) => String(h).padStart(2, '0') + ':00';
  return `${pad(open)} – ${pad(close)} UTC`;
}

function getCurrentUtcHour(): number {
  return new Date().getUTCHours();
}

const SessionClock = memo(function SessionClock() {
  const [utcHour, setUtcHour] = useState<number>(getCurrentUtcHour);
  const fxStatus = useForexMarketStatus();

  useEffect(() => {
    const id = window.setInterval(() => setUtcHour(getCurrentUtcHour()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <GlassCard padding="sm">
      <SectionHeader
        title="Trading Sessions"
        subtitle={`UTC ${String(utcHour).padStart(2, '0')}:xx now`}
      />

      {/* Overall FX market status */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            fxStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
          }`}
        />
        {fxStatus.isOpen ? (
          <span className="text-xs text-emerald-400 font-medium">
            FX Market Open — {fxStatus.reason}
          </span>
        ) : (
          <span className="text-xs text-red-400 font-medium">
            {fxStatus.reason}
            {fxStatus.nextOpen && (
              <span className="text-white/40 ml-1">
                — Opens {fxStatus.nextOpen.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Session rows */}
      <div className="space-y-2">
        {FX_SESSIONS.map((session) => {
          const open = isSessionOpen(utcHour, session.openUTC, session.closeUTC);
          return (
            <div
              key={session.name}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]"
            >
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{session.flag}</span>
                <span className="text-sm text-white/80 font-medium">{session.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-white/35 font-mono hidden sm:inline">
                  {formatUtcRange(session.openUTC, session.closeUTC)}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    open
                      ? 'bg-emerald-400/15 text-emerald-400'
                      : 'bg-white/[0.05] text-white/35'
                  }`}
                >
                  {open ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
});

export default SessionClock;
