// src/components/promo/BetaOfferBanner.tsx
// =====================================================
// FOUNDING BETA promo banner — attached to the top navigation.
// Static "Ends July 25" copy (no live countdown timer). Dismissible via
// localStorage; auto-hides once the offer window has passed.
// =====================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// July 25, end of day US Eastern (UTC-4 in July → 03:59:59Z on the 26th).
const OFFER_ENDS = new Date('2026-07-26T03:59:59Z');

const DISMISS_KEY = 'fino_beta100_banner_dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    // localStorage unavailable (SSR / privacy mode) — treat as not dismissed.
    return false;
  }
}

function persistDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // Best-effort only — if storage is unavailable the banner simply
    // reappears next visit, which is an acceptable degradation.
  }
}

export interface BetaOfferBannerProps {
  /** 'landing' → routes CTA to registration. 'app' → routes CTA to the in-app upgrade surface. */
  variant: 'landing' | 'app';
}

export function BetaOfferBanner({ variant }: BetaOfferBannerProps) {
  const navigate = useNavigate();
  // Default to hidden until the localStorage check resolves, to avoid a
  // flash of the banner for users who already dismissed it.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  if (Date.now() > OFFER_ENDS.getTime()) return null;
  if (dismissed) return null;

  const handleClaim = () => {
    if (variant === 'landing') {
      navigate('/auth/register?plan=trader&interval=monthly');
    } else {
      navigate('/app/upgrade');
    }
  };

  const handleDismiss = () => {
    persistDismissed();
    setDismissed(true);
  };

  return (
    <div className="w-full border-b border-[#C9A646]/30 bg-black">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-center gap-2 px-3 text-xs sm:text-sm">
        <span className="inline-flex flex-shrink-0 items-center rounded-full border border-[#C9A646]/50 bg-[#C9A646]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#C9A646]">
          Founding Beta
        </span>

        <span className="truncate text-white/85">
          Code <span className="font-semibold text-[#C9A646]">BETA100</span> — 2 months of Finotaur Trader, free.
          <span className="hidden text-white/50 sm:inline"> · Ends July 25</span>
        </span>

        <button
          type="button"
          onClick={handleClaim}
          className="ml-1 flex-shrink-0 rounded-full bg-[#C9A646] px-3 py-1 text-[11px] font-semibold text-black transition hover:brightness-110 sm:text-xs"
        >
          Claim Offer
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss offer banner"
          className="ml-1 flex-shrink-0 text-white/40 transition hover:text-white/70"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
