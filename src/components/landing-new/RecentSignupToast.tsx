import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Shield } from 'lucide-react';

type RecentSignup = {
  firstName: string;
  signedUpAt: string;
  minutesAgo: number | null;
};

type RecentSignupsResponse = {
  signups: RecentSignup[];
  cachedAt: string;
};

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';
const SIGNUP_PROOF_LOGO = '/assets/signup-proof-logo.png';
const ROTATION_MS = 3 * 60 * 1000;

function publicApiUrl(path: string) {
  const base = API_BASE.replace(/\/$/, '');
  if (base.endsWith('/api') && path.startsWith('/api/')) {
    return `${base}${path.slice(4)}`;
  }
  return `${base}${path}`;
}

function formatSignupTime(minutesAgoValue: number | null) {
  if (minutesAgoValue === null) return 'recently';
  if (minutesAgoValue < 1) return 'just now';
  if (minutesAgoValue < 60) return `${minutesAgoValue} min ago`;

  const hours = Math.floor(minutesAgoValue / 60);
  if (hours === 1) return '1 hour ago';
  return `${Math.min(hours, 23)} hours ago`;
}

const RecentSignupToast = memo(function RecentSignupToast() {
  const [signups, setSignups] = useState<RecentSignup[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(publicApiUrl('/api/public/recent-signups'), {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('recent signups fetch failed');

        const data = (await response.json()) as RecentSignupsResponse;
        if (!cancelled) {
          setSignups(Array.isArray(data.signups) ? data.signups : []);
          setActiveIndex(0);
        }
      } catch {
        if (!cancelled) setSignups([]);
      }
    };

    load();
    const refreshId = window.setInterval(load, ROTATION_MS);

    return () => {
      cancelled = true;
      window.clearInterval(refreshId);
    };
  }, []);

  useEffect(() => {
    if (signups.length <= 1) return;

    const rotateId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % signups.length);
    }, ROTATION_MS);

    return () => window.clearInterval(rotateId);
  }, [signups.length]);

  const activeSignup = signups[activeIndex];
  if (!activeSignup) return null;

  return (
    <motion.aside
      key={`${activeSignup.firstName}-${activeSignup.signedUpAt}`}
      initial={{ opacity: 0, x: -18, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="fixed bottom-6 left-5 z-[80] flex w-[calc(100vw-2.5rem)] max-w-sm items-center gap-4 rounded-xl border border-[#C9A646]/30 bg-[#0b0a08]/95 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-md sm:left-6 sm:w-full"
      aria-live="polite"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#C9A646]/30 bg-black/50">
        <img
          src={SIGNUP_PROOF_LOGO}
          alt="Finotaur logo"
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {activeSignup.firstName} just joined Finotaur
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
          <Clock className="h-3.5 w-3.5 text-[#C9A646]" />
          <span>{formatSignupTime(activeSignup.minutesAgo)}</span>
          <span className="text-zinc-600">|</span>
          <span>last 24 hours</span>
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 sm:flex">
        <Shield className="h-3 w-3" />
        First name only
      </div>
    </motion.aside>
  );
});

export default RecentSignupToast;
