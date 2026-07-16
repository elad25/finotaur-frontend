// src/features/affiliate/components/refer/ReferralCodeInline.tsx
// =====================================================
// Compact "Your referral code" block — member-refers-friend program.
// Mirrors ReferFriendCard's state machine (checking/hidden/locked/no-code/
// provisioning/error/ready) and the same paying-member detection
// (`useSubscription().isPaidUser`), but renders as a compact inline block
// (no ds/Card chrome) meant to sit alongside other fields — e.g. the right
// side of Settings → Account → Profile card. Styled to match AccountTab's
// existing zinc/gold visual language rather than the dashboard ds/Card look.
//
// Renders as a business-card teaser (brand asset image) that opens a modal
// popup on click to reveal the code/link + provision action — state
// machine below is unchanged, only the rendered markup for
// no-code/provisioning/error/ready now lives inside a Dialog.
//
// Additive component — ReferFriendCard is left untouched even though some
// logic is duplicated here on purpose (see task scope: compact standalone
// component, not a refactor of ReferFriendCard).
// =====================================================

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Copy, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ds/Spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  fetchMemberReferralRow,
  provisionMemberReferralCode,
  rowFromProvisionResult,
  DEFAULT_MEMBER_DISCOUNT_PERCENT,
  type MemberReferralRow,
  type ProvisionMemberReferralError,
} from '@/features/affiliate/utils/memberReferral';

const CARD_FACE = '/assets/funded-friend-deal-card.webp';

/** Maps a requested-code provision error to friendly, user-facing English
 * text. Switches on the typed `kind`, not the raw message string. */
function friendlyCodeError(error: ProvisionMemberReferralError): string {
  switch (error.kind) {
    case 'invalid_code':
      return 'Codes are 4-15 letters/numbers.';
    case 'reserved_code':
      return 'That code is reserved, try another.';
    case 'code_taken':
      return 'That code is already taken, try another.';
    case 'unknown':
      return error.message;
    default:
      return 'Failed to create your referral code.';
  }
}

/** Live availability-check result for the self-chosen code input, driven by
 * the `check_referral_code_availability` RPC (SECURITY DEFINER — a direct
 * client-side table query returns empty under RLS for codes owned by other
 * users, which would make every taken code look available). */
type CodeCheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid';

function describeCodeCheck(status: CodeCheckStatus): { text: string; className: string } | null {
  switch (status) {
    case 'checking':
      return { text: 'Checking…', className: 'text-zinc-500' };
    case 'available':
      return { text: 'Available', className: 'text-emerald-400' };
    case 'taken':
      return { text: 'Already taken', className: 'text-red-400' };
    case 'reserved':
      return { text: 'That code is reserved', className: 'text-red-400' };
    case 'invalid':
      return { text: '4-15 letters and numbers only', className: 'text-red-400' };
    default:
      return null;
  }
}

type InlineState =
  | { kind: 'checking' }
  | { kind: 'hidden' }
  | { kind: 'locked' }
  | { kind: 'no-code' }
  | { kind: 'provisioning' }
  | { kind: 'ready'; row: MemberReferralRow }
  | { kind: 'error'; message: string };

export function ReferralCodeInline() {
  const { user } = useAuth();
  const { isPaidUser, isLoading: subLoading } = useSubscription();
  const [state, setState] = useState<InlineState>({ kind: 'checking' });
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [requestedCode, setRequestedCode] = useState('');
  const [codeCheck, setCodeCheck] = useState<CodeCheckStatus>('idle');

  // Resolve initial state: hidden while subscription is still loading, then
  // locked for free members, then check for an already-provisioned row.
  useEffect(() => {
    let cancelled = false;
    if (subLoading) return;
    if (!isPaidUser) {
      setState({ kind: 'locked' });
      return;
    }
    if (!user?.id) return;

    (async () => {
      const row = await fetchMemberReferralRow(user.id);
      if (cancelled) return;
      // "ready" requires a LIVE Whop promo, not just a code — a code without
      // a whop_promo_id (never minted, or the Whop coupon was deleted) gives
      // the friend no discount at checkout, so it needs (re)provisioning.
      setState(row?.coupon_code && row?.whop_promo_id ? { kind: 'ready', row } : { kind: 'no-code' });
    })();

    return () => {
      cancelled = true;
    };
  }, [subLoading, isPaidUser, user?.id]);

  const handleRequestedCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRequestedCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15));
  };

  // Live availability check — debounced ~450ms, only once there's enough
  // input to possibly pass the format rule (4-15 chars).
  useEffect(() => {
    let cancelled = false;

    if (requestedCode.length < 4) {
      setCodeCheck('idle');
      return;
    }

    setCodeCheck('checking');
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('check_referral_code_availability', {
        p_code: requestedCode,
      });
      if (cancelled) return;

      if (error || !data) {
        setCodeCheck('idle');
        return;
      }
      if (data.available) {
        setCodeCheck('available');
      } else if (data.reason === 'taken') {
        setCodeCheck('taken');
      } else if (data.reason === 'reserved') {
        setCodeCheck('reserved');
      } else {
        setCodeCheck('invalid');
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [requestedCode]);

  const handleProvision = useCallback(async () => {
    setOpen(true);
    setState({ kind: 'provisioning' });
    const result = await provisionMemberReferralCode(requestedCode || undefined);

    if (result.status === 'error') {
      if (result.error.kind === 'disabled') {
        setState({ kind: 'hidden' });
        return;
      }
      if (result.error.kind === 'not_paying') {
        setState({ kind: 'locked' });
        return;
      }
      setState({ kind: 'error', message: friendlyCodeError(result.error) });
      return;
    }

    const freshRow = user?.id ? await fetchMemberReferralRow(user.id) : null;
    setState({ kind: 'ready', row: freshRow?.whop_promo_id ? freshRow : rowFromProvisionResult(result.data) });
  }, [user?.id, requestedCode]);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently no-op, nothing to recover from.
    }
  }, []);

  // Kill-switch / unresolved status — never flash content.
  if (state.kind === 'checking' || state.kind === 'hidden') return null;

  if (state.kind === 'locked') {
    return (
      <div className="flex flex-col justify-center gap-3 rounded-lg border border-zinc-700/30 bg-zinc-800/30 p-5">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 shrink-0 text-[#C9A646]" aria-hidden="true" />
          <p className="text-base leading-relaxed text-zinc-400">
            <Link to="/app/upgrade" className="text-[#C9A646] hover:underline">
              Upgrade
            </Link>{' '}
            to unlock your referral code
          </p>
        </div>
      </div>
    );
  }

  // Shared "business card" teaser — collapsed card is the Dialog trigger;
  // the popup reveals the bonus copy plus whichever action fits the
  // current state (provision button, or code/link + copy).
  const code = state.kind === 'ready' ? (state.row.coupon_code as string) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full overflow-hidden rounded-xl border border-[#C9A646]/25 bg-zinc-900/40 text-left shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] transition-colors hover:border-[#C9A646]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C9A646]"
      >
        <div className="relative">
          <img
            src={CARD_FACE}
            alt="The Funded Friend Deal — FINOTAUR referral program"
            className="block w-full"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/75 to-transparent py-2 text-xs font-semibold text-[#E6CD86]">
            Tap to reveal your code <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-4 border-[#C9A646]/25 bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-[#E6CD86]">The Funded Friend Deal</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Share FINOTAUR with a friend — you both get rewarded.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A646]" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-zinc-300">
                Your friend gets <span className="font-semibold text-[#E6CD86]">{DEFAULT_MEMBER_DISCOUNT_PERCENT}% off</span>{' '}
                their first 3 months of FINOTAUR Trader.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A646]" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-zinc-300">
                You earn <span className="font-semibold text-[#E6CD86]">15%</span> of every
                payment they make — for 12 months.
              </p>
            </div>

            {state.kind === 'ready' && code ? (
              <>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-dashed border-[#C9A646]/40 bg-zinc-900/60 px-3 py-1.5 font-mono text-base font-semibold tracking-wider text-[#C9A646]">
                    {code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(code)}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-700/30 px-2 py-1 text-xs text-zinc-400 transition-colors hover:border-[#C9A646] hover:text-[#C9A646]"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy code'}
                  </button>
                </div>
                <Link
                  to="/app/journal/refer"
                  onClick={() => setOpen(false)}
                  className="text-sm text-[#C9A646] hover:underline"
                >
                  Referral dashboard →
                </Link>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="referral-requested-code-inline" className="text-xs font-medium text-zinc-400">
                    Choose your referral code
                  </label>
                  <input
                    id="referral-requested-code-inline"
                    type="text"
                    value={requestedCode}
                    onChange={handleRequestedCodeChange}
                    maxLength={15}
                    pattern="[A-Z0-9]*"
                    placeholder="YOURCODE"
                    disabled={state.kind === 'provisioning'}
                    className="rounded-md border border-zinc-700/30 bg-zinc-900/60 px-3 py-1.5 font-mono text-sm uppercase tracking-wider text-zinc-200 placeholder:text-zinc-600 placeholder:normal-case focus:border-[#C9A646] focus:outline-none disabled:opacity-60"
                  />
                  {describeCodeCheck(codeCheck) && (
                    <p className={`text-xs ${describeCodeCheck(codeCheck)!.className}`}>
                      {describeCodeCheck(codeCheck)!.text}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500">
                    4-15 letters and numbers. Leave empty and we&apos;ll generate one for you. Cannot be changed
                    later.
                  </p>
                </div>
                {state.kind === 'error' && <p className="text-xs text-red-400">{state.message}</p>}
                <button
                  type="button"
                  onClick={handleProvision}
                  disabled={
                    state.kind === 'provisioning' || (requestedCode.length > 0 && codeCheck !== 'available')
                  }
                  className="inline-flex w-fit items-center gap-2 rounded-md bg-[#C9A646] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-[#B8963F] disabled:opacity-60"
                >
                  {state.kind === 'provisioning' ? (
                    <>
                      <Spinner size="sm" color="inherit" />
                      Creating…
                    </>
                  ) : (
                    'Get your referral code'
                  )}
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReferralCodeInline;
