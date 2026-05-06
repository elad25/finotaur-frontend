import { useEffect, useState } from 'react';
import { Card, Eyebrow } from '@/components/ds/Card';

type SessionName = 'Sydney' | 'Tokyo' | 'London' | 'New York';

interface SessionWindow {
  name: SessionName;
  openHourUTC: number;
  closeHourUTC: number;
}

const SESSIONS: SessionWindow[] = [
  { name: 'Sydney', openHourUTC: 21, closeHourUTC: 6 },
  { name: 'Tokyo', openHourUTC: 23, closeHourUTC: 8 },
  { name: 'London', openHourUTC: 7, closeHourUTC: 16 },
  { name: 'New York', openHourUTC: 12, closeHourUTC: 21 },
];

function isSessionOpen(session: SessionWindow, now: Date): boolean {
  const day = now.getUTCDay();
  if (day === 6) return false;
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60;
  if (day === 0 && hour < 22) return false;
  if (day === 5 && hour >= 22) return false;

  const { openHourUTC, closeHourUTC } = session;
  if (openHourUTC < closeHourUTC) {
    return hour >= openHourUTC && hour < closeHourUTC;
  }
  return hour >= openHourUTC || hour < closeHourUTC;
}

function formatLondonTime(now: Date): string {
  return now.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function SessionClock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const states = SESSIONS.map((s) => ({ ...s, open: isSessionOpen(s, now) }));
  const openCount = states.filter((s) => s.open).length;
  const overlay = openCount >= 2 ? `${openCount} sessions overlapping` : openCount === 1 ? 'Single session active' : 'All sessions closed';

  return (
    <Card className="h-full">
      <div className="flex flex-col gap-ds-4 h-full">
        <div className="flex items-baseline justify-between">
          <Eyebrow>FX Sessions</Eyebrow>
          <span className="font-mono text-num-small text-ink-tertiary tabular-nums">{formatLondonTime(now)} London</span>
        </div>

        <div className="grid grid-cols-2 gap-ds-3 flex-1">
          {states.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-ds-2 rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-1 px-ds-3 py-ds-2"
            >
              <span
                aria-hidden
                className={
                  s.open
                    ? 'inline-block h-2 w-2 rounded-full bg-gold-primary shadow-glow-gold-resting'
                    : 'inline-block h-2 w-2 rounded-full bg-ink-tertiary opacity-40'
                }
              />
              <div className="flex flex-col leading-tight">
                <span className="font-sans text-[12px] font-medium text-ink-primary">{s.name}</span>
                <span className="font-mono text-[10px] text-ink-tertiary tabular-nums">
                  {String(s.openHourUTC).padStart(2, '0')}:00 - {String(s.closeHourUTC).padStart(2, '0')}:00 UTC
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-ink-tertiary uppercase tracking-[1px]">{overlay}</div>
      </div>
    </Card>
  );
}
