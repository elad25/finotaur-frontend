// src/components/PromoOfferChip.tsx
// =====================================================
// FINOTAUR PROMO OFFER CHIP — countdown-gated early-access offer
// =====================================================
// Compact green pill (in the TopNav between the FINOTAUR logo and the
// search omnibox, or in the landing Navbar). Gently animated (shine sweep
// + pulsing gift) to draw clicks. Click → gold-on-black popup with the
// BETA100 code, a live countdown, and a CTA that either opens Whop
// checkout directly (logged-in app users) or sends logged-out visitors to
// registration first — see `audience` below.
//
// The whole offer (green chip + popup) automatically disappears once the
// countdown deadline passes — see `expired` below.
// All copy is English (FINOTAUR iron rule).
//
// ── Adding future offers ─────────────────────────────────────────────
// Everything offer-specific lives in the OFFER config object below. To
// launch a new promo, change OFFER (new code, price, deadline, copy).
// `deadline` MUST carry an explicit timezone offset so it is unambiguous.
// =====================================================

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Gift, Copy, Check, Clock, Ticket, Crown, ShieldCheck, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWhopCheckout } from '@/hooks/useWhopCheckout';

type Offer = {
  /** Promo code revealed in the popup + copied to clipboard. */
  code: string;
  title: string;
  subtitle: string;
  /** Regular price, shown struck-through (display only). */
  originalPrice: string;
  /** Discounted price headline (display only). */
  price: string;
  period: string;
  /** Small pill under the price, e.g. "Then $44.99/month — cancel anytime". */
  discountLabel: string;
  /** Deadline WITH explicit tz offset (UTC here — July 25, end of day ET). */
  deadline: string;
  ctaText: string;
  fineprint: string;
  /** Short label shown inside the green chip (hidden on very small screens). */
  chipLabel: string;
};

const OFFER: Offer = {
  code: 'BETA100',
  title: 'Trade Journal — Trader',
  subtitle: 'Unlock advanced analytics and elevate your trading.',
  originalPrice: '$44.99',
  price: 'FREE',
  period: 'for 2 months',
  discountLabel: 'Then $44.99/month — cancel anytime',
  deadline: '2026-07-26T03:59:59Z', // July 25, end of day America/New_York (EDT, UTC-4)
  ctaText: 'Claim 2 Free Months',
  fineprint: 'Cancel anytime',
  chipLabel: '2 Months Free',
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

export interface PromoOfferChipProps {
  className?: string;
  /**
   * 'app' (default) — logged-in user, CTA opens Whop Trader checkout directly
   * with the promo code applied.
   * 'landing' — logged-out visitor, CTA sends them to registration first
   * (there is no account yet to attach a Whop checkout to).
   */
  audience?: 'app' | 'landing';
}

export default function PromoOfferChip({ className, audience = 'app' }: PromoOfferChipProps) {
  const navigate = useNavigate();
  const { initiateCheckout, isLoading: checkoutLoading } = useWhopCheckout();
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

  // While the popup is open: lock background scroll and close on Escape.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const expired = remaining <= 0;

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
    // Logged-out visitors have no account yet to attach a Whop checkout to —
    // send them to registration (code is still shown/copyable in the popup
    // above, to be applied once they reach checkout).
    if (audience === 'landing') {
      setOpen(false);
      navigate('/auth/register?plan=trader&interval=monthly');
      return;
    }
    await handleCopyCode(); // keep copying the code as a safety net
    void initiateCheckout({ planName: 'premium', billingInterval: 'monthly', discountCode: OFFER.code });
  };

  // Once the deadline passes, nothing renders — chip and popup both disappear.
  if (expired) return null;

  const { days, hours, minutes, seconds } = splitRemaining(remaining);

  const countdownCells: Array<{ value: number; label: string }> = [
    { value: days, label: 'DAYS' },
    { value: hours, label: 'HOURS' },
    { value: minutes, label: 'MINUTES' },
    { value: seconds, label: 'SECONDS' },
  ];

  return (
    <>
      {/* ── Green chip (in the TopNav) ────────────────────────────── */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Founding Beta offer — 2 months of Trader, free"
        className={cn(
          'group relative inline-flex flex-shrink-0 items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5 text-xs font-semibold text-white',
          className,
        )}
        style={{
          backgroundImage: 'linear-gradient(135deg, #15803d 0%, #22c55e 50%, #16a34a 100%)',
          boxShadow: '0 0 0 1px rgba(34,197,94,0.35), 0 2px 10px rgba(34,197,94,0.35)',
        }}
        animate={{ boxShadow: [
          '0 0 0 1px rgba(34,197,94,0.35), 0 2px 10px rgba(34,197,94,0.30)',
          '0 0 0 1px rgba(34,197,94,0.55), 0 2px 16px rgba(34,197,94,0.55)',
          '0 0 0 1px rgba(34,197,94,0.35), 0 2px 10px rgba(34,197,94,0.30)',
        ] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Moving shine sweep */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-1/3"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
          }}
          animate={{ x: ['-150%', '400%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
        />

        <motion.span
          aria-hidden="true"
          animate={{ rotate: [0, 12, -12, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative inline-flex"
        >
          <Gift className="h-3.5 w-3.5 text-yellow-100" />
        </motion.span>

        <span className="relative hidden whitespace-nowrap sm:inline">
          {OFFER.chipLabel}
        </span>
      </motion.button>

      {/* ── Popup ─────────────────────────────────────────────────────
          Portaled to <body>: both navbars that host the chip are
          `fixed ... backdrop-blur-xl`, and backdrop-filter creates a
          containing block — without the portal the modal's `fixed inset-0`
          resolves against the 64px nav strip and renders clipped. */}
      {createPortal(
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[210] bg-black/85 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[210] flex items-center justify-center overflow-y-auto overscroll-contain p-4"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`${OFFER.title} offer`}
                className="relative my-auto w-full max-w-md overflow-hidden rounded-2xl"
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
                  {/* Founding Beta badge */}
                  <div className="mb-4 flex justify-center">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
                      style={{
                        color: '#E8C766',
                        background: 'rgba(201,166,70,0.10)',
                        border: '1px solid rgba(201,166,70,0.35)',
                      }}
                    >
                      <Star className="h-3.5 w-3.5" fill="currentColor" />
                      Founding Beta
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

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={handleUnlock}
                    disabled={audience === 'app' && checkoutLoading}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition-transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      color: '#0a0a0a',
                      backgroundImage: 'linear-gradient(135deg, #F4D97B 0%, #C9A646 50%, #A88838 100%)',
                      boxShadow: '0 4px 20px rgba(201,166,70,0.30), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}
                  >
                    <Crown className="h-5 w-5" />
                    {audience === 'app' && checkoutLoading ? 'Opening secure checkout…' : OFFER.ctaText}
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
      </AnimatePresence>,
      document.body,
      )}
    </>
  );
}
