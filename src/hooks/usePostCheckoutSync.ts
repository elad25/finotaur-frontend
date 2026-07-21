// src/hooks/usePostCheckoutSync.ts
// Keeps client subscription/profile state (useSubscription -> React Query
// `subscriptionKeys.limits`) from going stale right after a Whop checkout.
//
// Two return paths, two mechanisms:
// 1) Same-tab redirect back with `?payment=success` can land BEFORE the Whop
//    webhook finishes activating the subscription (a few-seconds race) — poll
//    the subscription query for up to ~60s until the account is no longer free.
// 2) Checkout opened in another tab (or a webhook that completes late) — the
//    original tab never refetches on its own. On window focus / tab becoming
//    visible, if a checkout was recently started (localStorage flag written by
//    useWhopCheckout right before the redirect), run a short revalidation poll.
//
// Mount once inside ProtectedAppLayout (same pattern as useOAuthReturnRedirect).

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { CHECKOUT_PENDING_STORAGE_KEY } from '@/hooks/useWhopCheckout';

const ACTIVATION_TOAST_ID = 'finotaur-post-payment-activation';

const ACTIVATION_POLL_INTERVAL_MS = 2500;
const ACTIVATION_POLL_MAX_MS = 60000;

const CHECKOUT_PENDING_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
const FOCUS_POLL_INTERVAL_MS = 2500;
const FOCUS_POLL_MAX_ATTEMPTS = 3;

export function usePostCheckoutSync(): void {
  const location = useLocation();
  const { isFreeJournal, refresh } = useSubscription();

  // Note: app-trial users are already non-free (isFreeJournal=false, hasAppTrial
  // maps effectiveJournalPlan to 'premium'), so the poll below resolves instantly
  // for them — no logic change needed here.

  // Interval/timeout closures read these refs so they always see the latest
  // subscription state without needing to be torn down and recreated.
  const isFreeRef = useRef(isFreeJournal);
  isFreeRef.current = isFreeJournal;
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // ── 1) Post-payment activation poller (?payment=success) ──────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') !== 'success') return;

    // Already paid (e.g. webhook beat the redirect, or a repeat visit to the
    // same success URL) — nothing to activate.
    if (!isFreeRef.current) return;

    let cancelled = false;
    const startedAt = Date.now();

    toast.loading('Payment received — activating your plan…', {
      id: ACTIVATION_TOAST_ID,
      duration: Infinity,
    });

    const intervalId = setInterval(() => {
      if (cancelled) return;

      if (!isFreeRef.current) {
        toast.success('Your plan is active — welcome!', {
          id: ACTIVATION_TOAST_ID,
          duration: 5000,
        });
        cancelled = true;
        clearInterval(intervalId);
        return;
      }

      if (Date.now() - startedAt >= ACTIVATION_POLL_MAX_MS) {
        toast.warning(
          'Activation is taking longer than usual — it will complete automatically; try refreshing in a minute.',
          { id: ACTIVATION_TOAST_ID, duration: 6000 },
        );
        cancelled = true;
        clearInterval(intervalId);
        return;
      }

      void refreshRef.current();
    }, ACTIVATION_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
    // Re-run only when the query string changes (a fresh payment=success round-trip).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // ── 2) Return-focus revalidation (new-tab checkout / late webhook) ─────
  useEffect(() => {
    let pendingTimeouts: ReturnType<typeof setTimeout>[] = [];
    let pollInFlight = false;

    const clearPoll = () => {
      pendingTimeouts.forEach(clearTimeout);
      pendingTimeouts = [];
      pollInFlight = false;
    };

    const runFocusPoll = () => {
      const raw = localStorage.getItem(CHECKOUT_PENDING_STORAGE_KEY);
      if (!raw) return;

      const setAt = Number(raw);
      if (!Number.isFinite(setAt) || Date.now() - setAt > CHECKOUT_PENDING_MAX_AGE_MS) {
        localStorage.removeItem(CHECKOUT_PENDING_STORAGE_KEY);
        return;
      }

      if (!isFreeRef.current) {
        localStorage.removeItem(CHECKOUT_PENDING_STORAGE_KEY);
        return;
      }

      if (pollInFlight) return; // already polling from an earlier focus/visible event
      pollInFlight = true;

      let attempt = 0;
      const step = () => {
        attempt += 1;
        void refreshRef.current();

        if (!isFreeRef.current || attempt >= FOCUS_POLL_MAX_ATTEMPTS) {
          localStorage.removeItem(CHECKOUT_PENDING_STORAGE_KEY);
          clearPoll();
          return;
        }

        pendingTimeouts.push(setTimeout(step, FOCUS_POLL_INTERVAL_MS));
      };
      step();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') runFocusPoll();
    };

    window.addEventListener('focus', runFocusPoll);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', runFocusPoll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearPoll();
    };
  }, []);
}
