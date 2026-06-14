// src/components/PromoOfferBanner.tsx
// =====================================================
// FINOTAUR PROMO OFFER BANNER — countdown-gated early-access offer
// =====================================================
// Site-wide, dismissible top strip (gold-on-black, gently animated) that
// opens a premium popup revealing the discount code. Mounted in
// ProtectedAppLayout.
//   Click the strip → popup with the code, live countdown, claim progress,
//                     and an "Unlock Premium" CTA.
//   Click the X     → dismiss (persisted in localStorage).
//
// The whole offer (strip + popup) automatically disappears once the
// countdown deadline passes — see `expired` below. All copy is English
// (FINOTAUR iron rule).
//
// ── Adding future offers ─────────────────────────────────────────────
// Everything offer-specific lives in the OFFER config object below. To
// launch a new promo, change OFFER (new code, price, deadline, copy) and
// bump `dismissKey` so previously-dismissed users see the new one.
// `deadline` MUST carry an explicit timezone offset so it is unambiguous.
// =====================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Copy, Check, Clock, Ticket, Crown, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type Offer = {
  /** Promo code revealed in the popup + copied to clipboard. */
  code: string;
  /** localStorage key — bump this string when launching a new offer. */
  dismissKey: string;
  title: string;
  subtitle: string;
  /** Regular price, shown struck-through (display only). */
  originalPrice: string;
  /** Discounted price headline (display only). */
  price: string;
  period: string;
  /** Small pill under the price, e.g. "$35.00 off your first 3 payments". */
  discountLabel: string;
  /** Deadline WITH explicit tz offset. 09:00 New York in June = EDT (UTC-4). */
  deadline: string;
  /** Social proof — claimed / total seats. */
  claimed: number;
  totalSpots: number;
  ctaText: string;
  /** Route the CTA sends the user to (code is copied first). */
  ctaHref: string;
  fineprint: string;
  /** Short copy for the top strip trigger. */
  stripText: string;
};

const OFFER: Offer = {
  code: 'JOIN2026',
  dismissKey: 'finotaur_promo_join2026_dismissed',
  title: 'Trade Journal Premium',
  subtitle: 'Unlock advanced analytics and elevate your trading.',
  originalPrice: '$44.99',
  price: '$10',
  period: '/month',
  discountLabel: '$35.00 off your first 3 payments',
  deadline: '2026-06-29T09:00:00-04:00', // June 29, 9:00 AM America/New_York (EDT)
  claimed: 247,
  totalSpots: 300,
  ctaText: 'Unlock Premium',
  ctaHref: '/app/journal/pricing',
  fineprint: 'Cancel anytime • 7-day money-back guarantee',
  stripText: 'Trade Journal Premium for just',
};

const DEADLINE_MS = new Date(OFFER.deadline).getTime();

function getRemaining() {
  return Math.max(0, DEADLINE_MS - Date.now());
}

function splitRemaining(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function PromoOfferBanner() {
  const navigate = useNavigate();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(OFFER.dismissKey) === '1';
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<number>(getRemaining);

  // Live countdown — ticks every second and self-stops at the deadline.
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      const next = getRemaining();
      setRemaining(next);
      if (next <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const expired = remaining <= 0;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    try {
      localStorage.setItem(OFFER.dismissKey, '1');
    } catch {
      /* ignore storage failures */
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(OFFER.code);
      setCopied(true);
      toast.success('Promo code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleUnlock = async () => {
    await handleCopyCode();
    setOpen(false);
    navigate(OFFER.ctaHref);
  };

  // Once the offer is dismissed OR the deadline passes, nothing renders —
  // the strip trigger and popup both disappear.
  if (dismissed || expired) return null;

  const { days, hours, minutes, seconds } = splitRemaining(remaining);
  const spotsLeft = Math.max(0, OFFER.totalSpots - OFFER.claimed);
  const claimedPct = Math.min(100, Math.round((OFFER.claimed / OFFER.totalSpots) * 100));

  const countdownCells: Array<{ value: number; label: string }> = [
    { value: days, label: 'DAYS' },
    { value: hours, label: 'HOURS' },
    { value: minutes, label: 'MINUTES' },
    { value: seconds, label: 'SECONDS' },
  ];

  return (
    <>
      {/* ── Top strip ─────────────────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the Trade Journal Premium offer"
        className="relative flex w-full items-center justify-center gap-2 overflow-hidden px-10 py-2 text-center text-sm font-semibold"
        style={{
          color: '#0a0a0a',
          backgroundImage:
            'linear-gradient(90deg, #A88838 0%, #C9A646 25%, #F4D97B 50%, #C9A646 75%, #A88838 100%)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Moving shine sweep — adds subtle motion to draw the eye */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-1/3"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
          }}
          animate={{ x: ['-150%', '450%'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.span
          aria-hidden="true"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 12, -12, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative inline-flex"
        >
          <Gift className="h-4 w-4" />
        </motion.span>

        <span className="relative">
          Limited offer — {OFFER.stripText}{' '}
          <span className="font-extrabold underline decoration-black/40 decoration-2 underline-offset-2">
            {OFFER.price}{OFFER.period.replace('/month', '/mo')}
          </span>
          . Tap to reveal your code
        </span>

        {/* Dismiss */}
        <span
          role="button"
          tabIndex={0}
          onClick={handleDismiss}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleDismiss(e as unknown as React.MouseEvent);
          }}
          aria-label="Dismiss offer"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-black/60 transition-colors hover:bg-black/15 hover:text-black"
        >
          <X className="h-4 w-4" />
        </span>
      </motion.button>

      {/* ── Popup ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`${OFFER.title} offer`}
                className="relative w-full max-w-md overflow-hidden rounded-2xl"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(18,16,12,0.98) 0%, rgba(10,10,10,0.99) 100%)',
                  border: '1px solid rgba(201,166,70,0.35)',
                  boxShadow: '0 0 60px rgba(201,166,70,0.20), 0 24px 80px rgba(0,0,0,0.6)',
                }}
              >
                {/* Close */}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="absolute right-4 top-4 z-10 rounded-full bg-white/5 p-2 transition-colors hover:bg-white/10"
                >
                  <X className="h-5 w-5 text-white/60" />
                </button>

                <div className="px-6 pb-6 pt-8">
                  {/* Early-access badge */}
                  <div className="mb-4 flex justify-center">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
                      style={{
                        color: '#E8C766',
                        background: 'rgba(201,166,70,0.10)',
                        border: '1px solid rgba(201,166,70,0.35)',
                      }}
                    >
                      <Gift className="h-3.5 w-3.5" />
                      Early Access
                    </span>
                  </div>

                  {/* Header */}
                  <div className="text-center">
                    <h2 className="mb-1 text-2xl font-bold text-white">{OFFER.title}</h2>
                    <p className="text-sm text-white/55">{OFFER.subtitle}</p>

                    <p className="mt-3 text-4xl font-extrabold leading-none">
                      <span className="mr-2 align-middle text-base font-medium text-white/35 line-through">
                        {OFFER.originalPrice}
                      </span>
                      <span
                        className="align-middle"
                        style={{
                          backgroundImage: 'linear-gradient(135deg, #F4D97B 0%, #C9A646 100%)',
                          WebkitBackgroundClip: 'text',
                          backgroundClip: 'text',
                          color: 'transparent',
                        }}
                      >
                        {OFFER.price}
                      </span>
                      <span className="align-middle text-base font-medium text-white/45">
                        {OFFER.period}
                      </span>
                    </p>

                    {/* Discount pill */}
                    <div className="mt-3 flex justify-center">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                        style={{
                          color: '#E8C766',
                          background: 'rgba(201,166,70,0.08)',
                          border: '1px solid rgba(201,166,70,0.25)',
                        }}
                      >
                        <Ticket className="h-3.5 w-3.5" />
                        {OFFER.discountLabel}
                      </span>
                    </div>
                  </div>

                  {/* Promo code box */}
                  <div
                    onClick={handleCopyCode}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleCopyCode();
                    }}
                    className="group relative mt-5 cursor-pointer rounded-xl p-4 transition-transform hover:scale-[1.01]"
                    style={{
                      background: 'rgba(201,166,70,0.06)',
                      border: '1.5px dashed rgba(201,166,70,0.45)',
                    }}
                  >
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-white/40">
                      Your code
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold tracking-wider text-white">{OFFER.code}</p>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                        style={{
                          color: copied ? '#86efac' : '#E8C766',
                          background: 'rgba(201,166,70,0.12)',
                        }}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-white/40">
                      {copied ? 'Copied to clipboard' : 'Click to copy — then apply it at checkout'}
                    </p>
                  </div>

                  {/* Countdown */}
                  <div
                    className="mt-4 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <p className="mb-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      <Clock className="h-3.5 w-3.5" />
                      Offer ends in
                    </p>
                    <div className="flex items-stretch justify-center gap-1 text-center">
                      {countdownCells.map((cell, i) => (
                        <div key={cell.label} className="flex items-stretch">
                          <div className="flex min-w-[52px] flex-col items-center">
                            <span className="font-mono text-2xl font-bold tabular-nums text-white">
                              {pad(cell.value)}
                            </span>
                            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-white/40">
                              {cell.label}
                            </span>
                          </div>
                          {i < countdownCells.length - 1 && (
                            <span className="px-0.5 font-mono text-2xl font-bold text-white/25">:</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Claim progress */}
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold" style={{ color: '#E8C766' }}>
                        {OFFER.claimed}{' '}
                        <span className="font-normal text-white/45">/ {OFFER.totalSpots} traders claimed</span>
                      </span>
                      <span className="text-white/45">{spotsLeft} spots left</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${claimedPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundImage: 'linear-gradient(90deg, #C9A646 0%, #F4D97B 100%)' }}
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={handleUnlock}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition-transform hover:scale-[1.01]"
                    style={{
                      color: '#0a0a0a',
                      backgroundImage: 'linear-gradient(135deg, #F4D97B 0%, #C9A646 50%, #A88838 100%)',
                      boxShadow: '0 4px 20px rgba(201,166,70,0.30), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}
                  >
                    <Crown className="h-5 w-5" />
                    {OFFER.ctaText}
                  </button>

                  {/* Fineprint */}
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/35">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {OFFER.fineprint}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
